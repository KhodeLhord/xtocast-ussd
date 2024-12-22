const axios = require('axios');
const https = require('https');
const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables from .env

// MySQL connection using environment variables from .env
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


// Function to initiate payment using Paystack's Mobile Money Charge API
const initiatePayment = async (phoneNumber, numberOfVotes) => {
  try {
    // Fixed vote cost set to 1 GHS
    const voteCost = 1; // 1 GHS
    const totalAmount = numberOfVotes * voteCost * 100// Convert to pesewas (1 GHS = 100 pesewas)



    // Payment payload
    const payload = {
      email: `${phoneNumber}@xtocast.com`, // Use a real email in production
      amount: totalAmount, // Amount in pesewas
      currency: 'GHS',
      mobile_money: {
        phone: phoneNumber,
        provider: "mtn", // Dynamic provider based on the phone number
      },
    };

    // Send payment request using the Charge endpoint
    const response = await axios.post('https://api.paystack.co/charge', payload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Log the full response to debug
    console.log('Paystack Response:', response.data);

    // Check if Paystack's response is successful
    if (response.data.status) {
      console.log('success')
      return {
        success: true,
        message: 'Payment prompt sent successfully.',
        data: response.data.data, // Contains mobile payment details
      };
    } else {
      console.error('Paystack Error:', response.data.message || 'Payment initiation failed');
      return {
        success: false,
        message: response.data.message || 'Payment initiation failed',
      };
    }
  } catch (error) {
    console.error('Error initiating payment:', error.message || error);
    return { success: false, message: error.message || 'Error initiating payment' };
  }
};
// const initiatePayment = (phoneNumber, numberOfVotes) => {
//   const params = JSON.stringify({
//     "amount": numberOfVotes,
//     "email": "filibiinfanax@gmail.com",
//     "currency": "GHS",
//     "mobile_money": {
//       "phone": phoneNumber,
//       "provider": "mtn"
//     }
//   });

//   const options = {
//     hostname: 'api.paystack.co',
//     port: 443,
//     path: '/charge',
//     method: 'POST',
//     headers: {
//       Authorization: 'Bearer sk_live_9e57f835856fdb701b092932a2459a81e46d0a73',
//       'Content-Type': 'application/json'
//     }
//   };

//   return new Promise((resolve, reject) => {
//     const req = https.request(options, (res) => {
//       let data = '';

//       res.on('data', (chunk) => {
//         data += chunk;
//       });

//       res.on('end', () => {
//         try {
//           // Parse the JSON response
//           const parsedResponse = JSON.parse(data);

//           // Check if the response has the expected structure
//           if (parsedResponse && parsedResponse.data) {
//             resolve(parsedResponse.data); // Return the parsed data
//           } else {
//             reject(new Error('Invalid response structure'));
//           }
//         } catch (error) {
//           reject(new Error('Error parsing the response'));
//         }
//       });
//     }).on('error', (error) => {
//       reject(error); // Reject the promise on error
//     });

//     req.write(params);
//     req.end();
//   });
// };

// Function to check transaction status
const checkTransactionStatus = async (reference,eventId,nomineeId) => {
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    if (response.data.status) {
      return {
        success: true,
        data: response.data.data,
      };
      
    } else {
      return {
        success: false,
        message: response.data.message || 'Transaction verification failed',
      };
    }
  } catch (error) {
    console.error('Error checking transaction status:', error.response?.data || error.message);
    return { success: false, message: 'Error checking transaction status' };
  }
};

// Export the functions
module.exports = { initiatePayment, checkTransactionStatus };
