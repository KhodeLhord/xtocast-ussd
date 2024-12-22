const axios = require('axios');
const https = require('https');

// Function to normalize phone numbers to 10 digits (local format)
const normalizePhoneNumber = (phoneNumber) => {
  let normalizedPhone = phoneNumber.replace(/\D/g, "");

  if (normalizedPhone.length === 10) {
    return normalizedPhone;
  } else {
    throw new Error('Phone number must be 10 digits.');
  }
};

// Function to calculate charges based on the amount
const calculateCharges = (amount) => {
  let charge = 0;

  if (amount <= 50) {
    charge = 0.3; // Fixed charge of 0.5 GHS
  } else if (amount <= 500) {
    charge = amount * 0.01; // 1.0% charge
  } else if (amount <= 1000) {
    charge = amount * 0.013; // 1.3% charge
  }

  return charge;
};

// Function to initiate payment
// const initiatePayment = async (phoneNumber, numberOfVotes, voteCost) => {
//   try {
//     const normalizedPhone = normalizePhoneNumber(phoneNumber);

//     // Calculate the total cost in GHS
//     const totalAmountGHS = numberOfVotes * voteCost;

//     // Calculate the charge based on the total amount
//     const charge = calculateCharges(totalAmountGHS);

//     // Add the charge to the total amount
//     const finalAmountGHS = totalAmountGHS + charge;

//     // Convert the final amount to pesewas (1 GHS = 100 pesewas)
//     const finalAmountPesewas = Math.round(finalAmountGHS * 100);

//     // Payment payload
//     const payload = {
//       email: `${normalizedPhone}@xtocast.com`,
//       amount: finalAmountPesewas, // Amount in pesewas
//       currency: 'GHS',
//       mobile_money: {
//         phone: normalizedPhone,
//         provider: 'mtn',
//       },
//     };

//     // Log the payload for debugging
//     console.log('Payload:', JSON.stringify(payload, null, 2));

//     // Send payment request using Paystack API
//     const response = await axios.post('https://api.paystack.co/charge', payload, {
//       headers: {
//         Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     // Log the response for debugging
//     console.log('Paystack Response:', response.data);

//     if (response.data.status) {
//       console.log('Payment initiated successfully');
//       return {
//         success: true,
//         message: 'Payment prompt sent successfully.',
//         data: response.data.data,
//       };
//     } else {
//       console.error('Paystack Error:', response.data.message || 'Payment initiation failed');
//       return {
//         success: false,
//         message: response.data.message || 'Payment initiation failed',
//       };
//     }
//   } catch (error) {
//     console.error('Error initiating payment:', error.message || error);

//     if (error.response) {
//       console.error('Paystack Error Details:', error.response.data);
//     }

//     return { success: false, message: error.message || 'Error initiating payment' };
//   }
// };
const initiatePayment = async (phoneNumber, numberOfVotes,voteCost) => {
  try {
    // Fixed vote cost set to 1 GHS
    const totalAmount = numberOfVotes * voteCost * 100// Convert to pesewas (1 GHS = 100 pesewas)

    const modifiedPhoneNumber = '0' + phoneNumber.slice(3);

    console.log(modifiedPhoneNumber)


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

    const params = {
      "amount": 100,
      "email": "customer@email.com",
      "currency": "GHS",
      "mobile_money": { 
        "phone": modifiedPhoneNumber, 
        "provider": "mtn"
      },
    }
    
  //   const params = {
  //   "amount": totalAmount,
  //   "email": "filibiinfanax@gmail.com",
  //   "currency": "GHS",
  //   "mobile_money": {
  //     "phone": phoneNumber,
  //     "provider": "mtn"
  //   }
  // };

    // Send payment request using the Charge endpoint
    const response = await axios.post('https://api.paystack.co/charge', params, {
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



// Example usage
// const phoneNumber = '0551196764';
// // const phoneNumber = 'MSISDN';
// const numberOfVotes = '1'
// // const numberOfVotes = 'session.numberOfVotes';
// const voteCost = '1'// Cost per vote in GHS
// // const voteCost = 'session.nominee.cost_per_vote'; // Cost per vote in GHS

// initiatePayment(phoneNumber, numberOfVotes, voteCost)
//   .then(response => {
//     console.log(response);
//   })
//   .catch(error => {
//     console.error(error);
//   });

module.exports = {
  initiatePayment,
};
