require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const ussdRoutes = require('./controllers/ussdController');
const paymentRoutes = require('./routes/paymentRoutes');
const smsRoutes = require('./routes/smsRoutes');
const { getAllVotes, createVote } = require('./controllers/voteController');
const { createTransaction } = require('./controllers/transaction');
const paymentService = require('./services/paymentService');
const  testPayment1  = require('./services/paymentService');
const testPayment = require('./testpayment');
const { default: axios } = require('axios');
const { sendConfirmation } = require('./services/smsService');
const { initiatePayment } = require('./services/testPayment');

//const handleWebhook = require('./tmp/webhookurl');

const app = express();
app.use(express.json());

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));

//app.post('/webhook-url', handleWebhook);
app.post('/votes', createVote);
app.post('/transaction', createTransaction);

// app.post('/ussd', ussdRoutes.handleUssdRequest);
app.post('/ussd', ussdRoutes.handleUssdRequest);
app.use('/payment', paymentRoutes);
app.use('/sms', smsRoutes);

// Route to fetch all votes
app.get('/votes', getAllVotes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// paymentService.checkTransactionStatus('dhl34xq8jc7hklg')
// paymentService.checkTransactionStatus('jf0onvvsa34j2yb')
// paymentService.initiatePayment('0551196764', 1)
// initiatePayment('233551196764', 1, 2);
// initiatePayment1('0551196764', 1);
// testPayment()

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`USSD app running on port ${PORT}`);
});
