require("dotenv").config();
const mysql = require("mysql");
const logger = require("../utils/logger");
const axios = require("axios");
const { checkTransactionStatus } = require("../services/paymentService");
const { initiatePayment } = require("../services/testPayment");
const { sendConfirmation } = require("../services/smsService");

const sessionStore = {};

// Function to calculate charges based on the amount
const calculateCharges = (amount) => {
  let charge = 0;
  if (amount <= 50) {
    charge = 0.3; // Fixed charge of 0.3 GHS
  } else if (amount <= 500) {
    charge = amount * 0.01; // 1.0% charge
  } else if (amount <= 1000) {
    charge = amount * 0.013; // 1.3% charge
  }
  return charge;
};

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    logger.error("Database connection failed", err);
    throw err;
  }
  logger.info("MySQL Connected...");
});

// Fetch nominee details by code
const getNomineeByCode = (nomineeCode) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT 
        Evoting_Nominees.name AS nominee_name,
        Evoting_Nominees.id AS nominee_id,
        Evoting_Categories.name AS category_name,
        Evoting_Events.name AS event_name,
        Evoting_Events.cost_per_vote,
        Evoting_Events.id AS event_id,
        Evoting_Categories.id AS category_id,
        Evoting_Events.event_code AS event_code
       FROM Evoting_Nominees
       JOIN Evoting_Categories ON Evoting_Nominees.category_id = Evoting_Categories.id
       JOIN Evoting_Events ON Evoting_Categories.event_id = Evoting_Events.id
       WHERE Evoting_Nominees.nominee_code = ?`,
      [nomineeCode],
      (err, result) => {
        if (err) {
          logger.error(`Error fetching nominee for code ${nomineeCode}`, err);
          return reject(err);
        }
        resolve(result.length ? result[0] : null);
      }
    );
  });
};

// Main handler for USSD request
exports.handleUssdRequest = async (req, res) => {
  const { SessionId, MSISDN, USERDATA } = req.body;
  const userInput = (USERDATA || "").trim();
  const sessionId = MSISDN;

  logger.info(
    `Received USSD request. SessionId: ${SessionId}, MSISDN: ${MSISDN}, User Input: ${userInput}`
  );

  let response = {};
  let session = sessionStore[sessionId] || { state: "welcome" };

  try {
    switch (session.state) {
      case "welcome":
        response = {
          USERID: SessionId,
          MSISDN,
          USERDATA: userInput,
          MSG: "Welcome to Xtocast Evoting\n\nPlease Enter Nominee Code:",
          MSGTYPE: true,
        };
        session.state = "enter_nominee_code";
        sessionStore[sessionId] = session;
        break;

      case "enter_nominee_code":
        const nomineeCode = userInput.toUpperCase();
        const nomineeDetails = await getNomineeByCode(nomineeCode);

        if (nomineeDetails) {
          session.nominee = nomineeDetails;
          session.state = "confirm_nominee";
          sessionStore[sessionId] = session;

          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: `You're about to vote for ${nomineeDetails.nominee_name} in the ${nomineeDetails.event_name} as the ${nomineeDetails.category_name}.\nPress 1 to Confirm\nPress 2 to Reject`,
            MSGTYPE: true,
          };
        } else {
          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: "Invalid Nominee Code. Please enter a valid code:",
            MSGTYPE: true,
          };
        }
        break;

      case "confirm_nominee":
        if (userInput === "1") {
          session.state = "enter_vote_count";
          sessionStore[sessionId] = session;

          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: `How many votes would you like to cast for ${session.nominee.nominee_name}?`,
            MSGTYPE: true,
          };
        } else if (userInput === "2") {
          session.state = "enter_nominee_code";
          sessionStore[sessionId] = session;

          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: "Nominee selection rejected. Please enter a new Nominee Code:",
            MSGTYPE: true,
          };
        } else {
          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: "Invalid choice. Press 1 to Confirm or 2 to Reject:",
            MSGTYPE: true,
          };
        }
        break;

      case "enter_vote_count":
        const numberOfVotes = parseInt(userInput);
        if (isNaN(numberOfVotes) || numberOfVotes <= 0) {
          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: "Invalid number of votes. Please enter a valid number:",
            MSGTYPE: true,
          };
        } else {
          const voteCost = numberOfVotes * session.nominee.cost_per_vote;
          const charges = calculateCharges(voteCost);
          const totalCost = voteCost + charges;

          session.numberOfVotes = numberOfVotes;
          session.totalCost = totalCost;
          session.state = "confirm_payment";
          sessionStore[sessionId] = session;

          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: `You're about to cast ${numberOfVotes} vote(s) for ${session.nominee.nominee_name}. Total cost is ${totalCost.toFixed(
              2
            )} GHS (including charges of ${charges.toFixed(
              2
            )} GHS).\nPress 1 to Confirm\nPress 2 to Cancel`,
            MSGTYPE: true,
          };
        }
        break;

      case "confirm_payment":
        if (userInput === "1") {
          try {
            const numberOfVotes = session.numberOfVotes;
            const paymentResponse = await initiatePayment(
              MSISDN,
              numberOfVotes,
              session.nominee.cost_per_vote
            );

            if (paymentResponse.success) {
              console.log("Payment initiation successful:", paymentResponse);
              const paymentUrl = paymentResponse.data.authorization_url;
              const reference = paymentResponse.data.reference;
              let statusChecked = false;

              for (let i = 0; i < 5; i++) {
                const transactionStatus = await checkTransactionStatus(
                  reference,
                  session.nominee.event_id,
                  session.nominee.nominee_id
                );

                if (transactionStatus.success) {
                  if (transactionStatus.data.status === "success") {
                    const {
                      status,
                      amount,
                      customer,
                      paid_at,
                      reference,
                      channel,
                    } = transactionStatus.data;
                    axios.post("http://localhost:3000/votes", {
                      eventId: session.nominee.event_id,
                      eventCode: session.nominee.event_code,
                      categoryId: session.nominee.category_id,
                      nomineeId: session.nominee.nominee_id,
                      phoneNumber: MSISDN,
                      amountPaid: amount,
                      transaction_date: new Date().toISOString(),
                      numberOfVotes: numberOfVotes,
                      status: status,
                      channel: channel,
                      reference: reference,
                    });

                    sendConfirmation(
                      MSISDN,
                      session.numberOfVotes,
                      session.nominee.nominee_name,
                      session.nominee.event_name
                    );
                    statusChecked = true;
                    response = {
                      USERID: SessionId,
                      MSISDN,
                      USERDATA: userInput,
                      MSG: `Payment successful! You have successfully casted ${session.numberOfVotes} vote(s) for ${session.nominee.nominee_name}.`,
                      MSGTYPE: false,
                    };
                    break;
                  }
                }
                await new Promise((resolve) => setTimeout(resolve, 10000));
              }

              if (!statusChecked) {
                console.log("Payment status not confirmed after multiple attempts.");
              }
            } else {
              console.log("Payment initiation failed:", paymentResponse.message);
            }
          } catch (error) {
            console.error("Error during payment process:", error.message || error);
          }
        } else {
          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: "Vote canceled. Thank you for using Xtocast.",
            MSGTYPE: false,
          };
          session.state = "welcome";
          sessionStore[sessionId] = session;
        }
        break;

      default:
        response = {
          USERID: SessionId,
          MSISDN,
          USERDATA: userInput,
          MSG: "Invalid session state.",
          MSGTYPE: false,
        };
    }
  } catch (error) {
    logger.error("Error handling USSD request", error);
    response = {
      USERID: SessionId,
      MSISDN,
      USERDATA: userInput,
      MSG: "An error occurred. Please try again later.",
      MSGTYPE: false,
    };
  }

  res.json(response);
};
