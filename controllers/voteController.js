// // ussdController.js
// const { promisePool } = require('../config/db');
// const logger = require('../utils/logger');

// // Get All Votes
// const getAllVotes = async (req, res) => {
//   try {
//     // Use promisePool.query to execute queries with async/await
//     const [rows] = await promisePool.query('SELECT * FROM Evoting_Transactions');
//     res.json(rows);
//     console.log(rows)
//   } catch (error) {
//     console.error('Error retrieving votes:', error);
//     res.status(500).json({ message: 'Error retrieving votes', error });
//   }
// };

// // Create Vote
// const createVote = async (req, res) => {
//   //const { nomineeId, phoneNumber, numberOfVotes, amountPaid, eventId } = req.body;
//   const { eventId, eventCode, categoryId, nomineeId, phoneNumber, amountPaid, transaction_date, numberOfVotes, status, channel, reference } = req.body

//   // Ensure all required fields are provided
//   if ( !eventId || !eventCode || !categoryId || !nomineeId || !phoneNumber || !amountPaid || !transaction_date || !numberOfVotes || !status || !channel || !reference){
//     return res.status(400).json({ message: 'Missing required fields' });
//   }

//   try {
//     // Insert vote into the database without including the `id` field
//     const [result] = await promisePool.query(
//       //'INSERT INTO Evoting_Transactions (nominee_id, phone_number, number_of_votes, amount_paid, created_at, event_id) VALUES (?, ?, ?, ?, NOW(), ?)',
//       'INSERT INTO Evoting_Transactions (event_id,	event_code,	category_id,	nominee_id,	phone_number,	transaction_date,	amount_paid,	number_of_votes,	status,	channel,	reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'

//       [eventId, eventCode, categoryId, nomineeId, phoneNumber, amountPaid, numberOfVotes, status, channel, reference]
      
//       //[nomineeId, phoneNumber, numberOfVotes, amountPaid, eventId]
//     );
    
//     // Respond with success, including the automatically generated vote ID
//     res.status(201).json({ 
//       id: result.insertId, 
//       eventId,
//       eventCode,
//       categoryId,
//       nomineeId, 
//       phoneNumber, 
//       transaction_date,
//       amountPaid, 
//       numberOfVotes, 
//       status,
//       channel,
//       reference
//     });
//     console.log("Vote created successfully");
//   } catch (error) {
//     // Handle any errors during insertion
//     console.error('Error creating vote:', error);
//     res.status(500).json({ message: 'Error creating vote', error });
//   }
// };

// module.exports = { getAllVotes, createVote };


const { promisePool } = require('../config/db');
const logger = require('../utils/logger');

// Get All Votes
const getAllVotes = async (req, res) => {
  try {
    // Use promisePool.query to execute queries with async/await
    const [rows] = await promisePool.query('SELECT * FROM Evoting_Transactions');
    res.json(rows);
    console.log(rows)
  } catch (error) {
    console.error('Error retrieving votes:', error);
    res.status(500).json({ message: 'Error retrieving votes', error });
  }
};

// Create Vote
const createVote = async (req, res) => {
  const {
    eventId,
    eventCode,
    categoryId,
    nomineeId,
    phoneNumber,
    amountPaid,
    transaction_date,
    numberOfVotes,
    status,
    channel,
    reference,
  } = req.body;

  console.log(req.body);

  // Ensure all required fields are provided
  if (
    !eventId || !eventCode || !categoryId || !nomineeId ||
    !phoneNumber || !amountPaid || !transaction_date ||
    !numberOfVotes || !status || !channel || !reference
  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Insert vote into the database
    const [result] = await promisePool.query(
      'INSERT INTO Evoting_Transactions (event_id, event_code, category_id, nominee_id, phone_number, transaction_date, amount_paid, number_of_votes, status, channel, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        eventId,
        eventCode,
        categoryId,
        nomineeId,
        phoneNumber,
        transaction_date,
        amountPaid,
        numberOfVotes,
        status,
        channel,
        reference,
      ]
    );

    // Respond with success
    res.status(201).json({
      id: result.insertId,
      eventId,
      eventCode,
      categoryId,
      nomineeId,
      phoneNumber,
      transaction_date,
      amountPaid,
      numberOfVotes,
      status,
      channel,
      reference,
    });
    console.log("Vote created successfully");
  } catch (error) {
    // Handle any errors during insertion
    console.error('Error creating vote:', error);
    res.status(500).json({ message: 'Error creating vote', error });
  }
};



module.exports = { getAllVotes, createVote };
