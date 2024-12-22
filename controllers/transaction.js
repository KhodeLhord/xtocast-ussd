const { promisePool } = require('../config/db');




const createTransaction = async (req, res) => {
    const { event_id, nominee_id, transaction_date, amount, channel, status ,Reference } = req.body;
    try {
        // Insert transaction into database
        const [result] = await promisePool.query(
            'INSERT INTO transactions (event_id, nominee_id, transaction_date, amount, channel, status,Reference ) VALUES (?, ?, ?, ?, ?, ?,?)',
            [event_id, nominee_id, transaction_date, amount, channel, status,Reference ]
        );
    
        res.status(200).send({
            message: 'Transaction created successfully',
            id: result.insertId,
            event_id,
            nominee_id,
            transaction_date,
            amount,
            channel,
            status,
            Reference
        }
        )
        console.log("waa la buuray")
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error creating transaction', error });
    }
};

module.exports = { createTransaction };
