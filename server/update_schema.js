// update_schema.js
// Script ini untuk update tabel tanpa menghapus data yang sudah ada
const pool = require('./db');

async function updateSchema() {
  try {
    // Menambahkan kolom is_public ke tabel rooms
    await pool.query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
    `);
    
    console.log("✅ Berhasil menambahkan kolom 'is_public' ke tabel rooms.");
    console.log("   Sekarang Host bisa memilih mau Private atau Public Room.");

  } catch (err) {
    console.error("❌ Gagal update schema:", err.message);
  } finally {
    pool.end();
  }
}

updateSchema();