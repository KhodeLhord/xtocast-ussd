const express = require('express');
const router = express.Router();
const paymentCallbackController = require('../controllers/paymentCallbackController');

router.post('/payment/callback', paymentCallbackController.handlePaymentCallback);

module.exports = router;
