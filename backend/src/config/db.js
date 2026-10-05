const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exam_seating_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test initial connectivity in non-test mode
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    pool.getConnection((err, conn) => {
        if (err) {
            console.error('⚠️ [Database Pool] Initial connection failed:', err.message);
        } else {
            console.log('✅ [Database Pool] Successfully connected to MySQL server.');
            conn.release();
        }
    });
}

module.exports = pool;