// db.js
require('dotenv').config();
const { Pool } = require('pg');

// Support either individual DB_* env vars or a single DATABASE_URL (Supabase)
const connectionString = process.env.DATABASE_URL || null;

let poolConfig = {};
if (connectionString) {
  poolConfig = {
    connectionString,
    // Supabase requires SSL. In many Node environments you must disable
    // certificate verification (rejectUnauthorized: false) unless you
    // provide a CA bundle. This is common for Heroku/Supabase setups.
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  };
}

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Gagal terkoneksi ke database:', err.stack);
  }
  console.log('Berhasil terkoneksi ke PostgreSQL!');
  release();
});

module.exports = pool;