const crypto = require('crypto');
const mysql = require('mysql');

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

exports.handlePaymentCallback = async (req, res) => {
  try {
    // Retrieve Hubtel signature header
    const hubtelSignature = req.headers['x-hubtel-signature'];

    // Verify that the request is from Hubtel using HMAC SHA256 signature
    const secret = process.env.HUBTEL_CLIENT_SECRET; // Hubtel secret key from your .env file
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');

    if (hash !== hubtelSignature) {
      // Invalid request, not from Hubtel
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const paymentData = req.body; // Hubtel sends the event data in the request body
    const { Status, Amount, CustomerMsisdn, ClientReference, TransactionId } = paymentData;

    console.log('Hubtel Webhook Event:', Status);

    const amount = Amount; // Amount is already in GHS
    const phoneNumber = CustomerMsisdn;
    const [sessionId, nomineeId] = ClientReference.split('-'); // Extract nomineeId from ClientReference

    if (Status === 'Success') {
      // Handle successful payment
      console.log(`Payment for nominee ${nomineeId} was successful. Amount: ${amount} GHS.`);

      // Record the successful payment in your database if needed
      const insertPaymentQuery = `INSERT INTO payments (transaction_id, phone_number, nominee_id, amount_paid, created_at) VALUES (?, ?, ?, ?, NOW())`;
      db.query(insertPaymentQuery, [TransactionId, phoneNumber, nomineeId, amount], (err, result) => {
        if (err) {
          console.error('Error recording payment in database:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        console.log('Payment recorded successfully:', result);
      });

    } else if (Status === 'Failed') {
      // Handle failed payment
      console.log(`Payment for transaction ${TransactionId} failed.`);

      // Optionally log or record failed payment attempts
      // For example, you can update a database entry or notify users

    } else {
      console.log(`Unhandled Hubtel event: ${Status}`);
    }

    // Respond to Hubtel that the webhook was received
    res.status(200).json({ message: 'Webhook received successfully' });
  } catch (error) {
    console.error('Error handling Hubtel webhook:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
