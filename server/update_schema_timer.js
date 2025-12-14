// update_schema_timer.js
const pool = require('./db');

async function addTimerColumn() {
  try {
    // Kita tambah kolom 'turn_ends_at' (Kapan waktu habis)
    // dan 'current_speaker' (Siapa yang lagi ngomong)
    await pool.query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS turn_ends_at BIGINT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS current_speaker_side VARCHAR(20) DEFAULT NULL;
    `);
    
    console.log("✅ Database di-update: Siap mencatat waktu debat!");
  } catch (err) {
    console.error("❌ Gagal update schema:", err.message);
  } finally {
    pool.end();
  }
}

addTimerColumn();