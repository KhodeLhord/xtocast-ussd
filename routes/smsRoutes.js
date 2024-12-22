const express = require('express');
const smsController = require('../services/smsService'); // Import your SMS service

const router = express.Router();

// Route for sending confirmation SMS
router.post('/send-confirmation', async (req, res) => {
  const { phoneNumber, numberOfVotes, nomineeName, eventName } = req.body;
  try {
    await smsController.sendConfirmation(phoneNumber, numberOfVotes, nomineeName, eventName);
    res.status(200).json({ message: 'Confirmation SMS sent successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send SMS.' });
  }
});

// Route for sending failed SMS
router.post('/send-failed', async (req, res) => {
  const { phoneNumber, nomineeName, eventName } = req.body;
  try {
    await smsController.sendFailed(phoneNumber, nomineeName, eventName);
    res.status(200).json({ message: 'Failed SMS sent successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send SMS.' });
  }
});

module.exports = router;
