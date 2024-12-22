require('dotenv').config();
const { default: axios } = require('axios');
const { initiatePayment, checkTransactionStatus } = require('./services/paymentService');
// const { initiatePayment1 } = require('./services/testPayment');

const phoneNumber = '0551196764';
const numberOfVotes = 1;         // Number of votes to be purchased
const sessionId = 'session-12345'; // Example session ID for the transaction
const nomineeId = 'nominee-001';   // Example nominee ID for the transaction
const eventId = 'TSA';             // Example event ID (ensure this is in your DB)

const testPayment = async () => {
  try {
    console.log('Initiating payment...');

    // Call the initiatePayment function
    const paymentResponse = await initiatePayment(phoneNumber, numberOfVotes, sessionId, nomineeId, eventId);

    if (paymentResponse.success) {
      console.log('Payment initiation successful:', paymentResponse);

      // Extract the payment URL from the response
      const paymentUrl = paymentResponse.data.authorization_url; // Assuming `authorization_url` is part of the response
      console.log('Redirect to Paystack payment page:', paymentUrl);

      // Get the transaction reference from the response
      const reference = paymentResponse.data.reference;
      let statusChecked = false;

      // Retry checking transaction status up to 5 times with 10-second intervals
      for (let i = 0; i < 5;i++) {
        console.log(`Checking transaction status, attempt ${i + 1}...`);
        
        // Check the status of the transaction
        const transactionStatus = await checkTransactionStatus(reference);
        
        if (transactionStatus.success) {
          console.log('Transaction status:', transactionStatus.data);

          // If the transaction is successful, break the loop
          if (transactionStatus.data.status === 'success') {
            console.log('Payment completed successfully!');
                 axios.post('http://localhost:3000/votes', {
                                nomineeId: nomineeId,
                                phoneNumber: phoneNumber,
                                numberOfVotes: numberOfVotes,
                                amountPaid: 10,
                                eventId: eventId
                              });      
            statusChecked = true;
            break;
          }
        } else {
          console.log('Transaction verification failed:', transactionStatus.message);
        }

        // Wait 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      if (!statusChecked) {
        console.log('Payment status not confirmed after multiple attempts.');
      }
    } else {
      console.log('Payment initiation failed:', paymentResponse.message);
    }
  } catch (error) {
    console.error('Error during payment test:', error.message || error);
  }
};

// Run the test payment
module.exports = testPayment;

