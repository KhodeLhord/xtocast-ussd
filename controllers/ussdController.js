require("dotenv").config();
const mysql = require("mysql");
const logger = require("../utils/logger");
const { default: axios } = require("axios");
const { checkTransactionStatus} = require("../services/paymentService");
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

// Check transaction status
// const checkTransactionStatus = async (reference) => {
//   try {
//     const response = await axios.get(https://paymentgateway.com/status/${reference});
//     return response.data;
//   } catch (err) {
//     logger.error('Error checking transaction status', err);
//     return { success: false, message: 'Transaction status check failed' };
//   }
// };

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
          console.log(nomineeDetails);
          cost_per_vote = nomineeDetails.cost_per_vote;
          nomineeName = nomineeDetails.nominee_name;
          eventName = nomineeDetails.event_name;
          nomineeId = nomineeDetails.nominee_id;
          eventId = nomineeDetails.event_id;
          eventCode = nomineeDetails.event_code;
          categoryId = nomineeDetails.category_id;
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
            MSG: `You're about to cast ${numberOfVotes} vote(s) for ${
              session.nominee.nominee_name
            }. Total cost is ${totalCost.toFixed(
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
            //const paymentResponse = await initiatePayment(MSISDN, session.totalCost);
            // const paymentResponse = await initiatePayment(
            //   MSISDN,
            //   session.numberOfVotes,
            //   session.nominee.cost_per_vote
            // );
            const numberOfVotes = session.numberOfVotes; // Ensure it's initialized from the session
            const paymentResponse = await initiatePayment(
              MSISDN,
              numberOfVotes,
              session.nominee.cost_per_vote
            );

            if (paymentResponse.success) {
              console.log("Payment initiation successful:", paymentResponse);
              console.log(paymentResponse.data.reference);

              // Extract the payment URL from the response
              const paymentUrl = paymentResponse.data.authorization_url; // Assuming authorization_url is part of the response
              console.log("Redirect to Paystack payment page:", paymentUrl);

              // Get the transaction reference from the response
              const reference = paymentResponse.data.reference;
              let statusChecked = false;

              // Retry checking transaction status up to 5 times with 10-second intervals
              for (let i = 0; i < 10; i++) {
                console.log("Checking transaction status, attempt ${i + 1}...");

                // Check the status of the transaction
                const transactionStatus = await checkTransactionStatus(
                  reference,
                  eventId,
                  nomineeId
                );

                if (transactionStatus.success) {
                  // console.log("Transaction status:", transactionStatus.data);

                  // If the transaction is successful, break the loop
                  if (transactionStatus.data.status === "success") {
                    const {
                      status,
                      amount,
                      customer,
                      paid_at,
                      reference,
                      channel,
                    } = transactionStatus.data;
                    console.log("Payment completed successfully!");
                    console.log("reference", reference);
                    axios.post("http://localhost:3000/votes", {
                      eventId: eventId,
                      eventCode: eventCode,
                      categoryId: categoryId,
                      nomineeId: nomineeId,
                      phoneNumber: MSISDN,
                      amountPaid: amount,
                      transaction_date: new Date().toISOString(), // Current timestamp in ISO format
                      numberOfVotes: numberOfVotes,
                      status: status,
                      channel: channel,
                      reference: reference,
                    });
                    console.log("Vote details stored in database successfully");
                    sendConfirmation(
                      MSISDN,
                      session.numberOfVotes,
                      nomineeName,
                      eventName
                    );
                    statusChecked = true;
                    response = {
                      USERID: SessionId,
                      MSISDN,
                      USERDATA: userInput,
                      MSG: "Payment successful! You have successfully casted ${session.numberOfVotes} vote(s) for ${session.nominee.nominee_name}.",
                      MSGTYPE: false,
                    };
                     session.state = "welcome";
                    console.log("Payment successful");
                    break;
                  }
                } else {
                  console.log(
                    "Transaction verification failed:",
                    transactionStatus.message
                  );
                }

                // Wait 10 seconds before checking again
                await new Promise((resolve) => setTimeout(resolve, 10000));
              }

              if (!statusChecked) {
                console.log(
                  "Payment status not confirmed after multiple attempts."
                );
              }
            } else {
              console.log(
                "Payment initiation failed:",
                paymentResponse.message
              );
            }
          } catch (error) {
            console.error("Error during payment test:", error.message || error);
          }
        } else {
          response = {
            USERID: SessionId,
            MSISDN,
            USERDATA: userInput,
            MSG: "Vote canceled. Thank you for using Xtocast.",
            MSGTYPE: false,
          };
          delete sessionStore[sessionId];
        }
        break;

      default:
        response = {
          USERID: SessionId,
          MSISDN,
          USERDATA: userInput,
          MSG: "An error occurred. Please try again later.",
          MSGTYPE: false,
        };
        logger.error("Unknown session state: ${session.state}");
        delete sessionStore[sessionId];
        break;
    }

    res.json(response);
  } catch (err) {
    logger.error("An error occurred during the USSD session", err);
    res.json({
      USERID: SessionId,
      MSISDN,
      USERDATA: userInput,
      MSG: "An error occurred. Please try again later.",
      MSGTYPE: false,
    });
  }
};
