// create_table.js
const pool = require('./db'); // Mengambil koneksi dari file db.js yang tadi dibuat

const queryText = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(queryText)
  .then((res) => {
    console.log('✅ Tabel "users" berhasil dibuat!');
    pool.end(); // Tutup koneksi setelah selesai
  })
  .catch((err) => {
    console.error('❌ Gagal membuat tabel:', err);
    pool.end();
  });