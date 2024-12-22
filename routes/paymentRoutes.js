const express = require('express');
const paymentController = require('../controllers/paymentCallbackController'); // Import your payment controller

const router = express.Router();

// Route for handling payment callbacks from JuniPay
router.post('/callback/junipay', paymentController.handlePaymentCallback);

// Route for handling payment callbacks from Paystack
router.post('/callback/paystack', paymentController.handlePaymentCallback); // Use the same controller

// Route for handling payment callbacks from Paystack
router.post('/webhook/paystack', paymentController.handlePaymentCallback); // Use the same controller

module.exports = router;
