const express = require('express');
const router = express.Router();
const ussdController = require('../controllers/ussdController');

// router.post('/', ussdController.handleUssdRequest);
router.post('/', test.handleUssdRequest);

module.exports = router;
