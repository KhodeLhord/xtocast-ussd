// db.js
const mysql = require('mysql2'); // Use mysql2 for async/await support

// Create a connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, // Allows the pool to wait for a connection if one is not available
  connectionLimit: 10, // Limits the number of simultaneous connections to the database
  queueLimit: 0 // Unlimited queue limit for waiting requests
});

// Make the pool's query method return a promise
const promisePool = db.promise();

// Testing connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed', err);
    throw err;
  }
  console.log('MySQL Connected...');
  connection.release(); // Release connection back to the pool
});

module.exports = { promisePool };
