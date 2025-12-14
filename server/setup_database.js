// setup_database.js
const pool = require('./db');

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log("🚀 Memulai konstruksi Database DI-DEBAT V2.2...");

    // 1. Tabel USERS (Pemain)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabel 'users' siap.");

    // 2. Tabel ROOMS (Arena Debat)
    // is_locked: Penanda apakah debat sudah mulai (TRUE) atau masih di lobby (FALSE)
    // config: Kolom canggih (JSONB) untuk simpan aturan (waktu, ronde, format)
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        topic TEXT NOT NULL,
        host_user_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'WAITING', -- WAITING, ACTIVE, FINISHED
        is_locked BOOLEAN DEFAULT FALSE,
        config JSONB DEFAULT '{}', 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabel 'rooms' siap.");

    // 3. Tabel PARTICIPANTS (Kursi & Peran)
    // side: 'PRO', 'CONTRA', 'SPECTATOR'
    // role: 'DEBATER', 'HOST', 'JUDGE'
    // seat_number: Urutan bicara (1, 2, 3...)
    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        side VARCHAR(20), 
        role VARCHAR(20),
        seat_number INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, user_id) -- Satu user cuma boleh punya 1 kursi di 1 room
      );
    `);
    console.log("✅ Tabel 'participants' siap.");

    // 4. Tabel ARGUMENTS (Rekaman Debat)
    // round_number: Ronde keberapa argumen ini keluar
    await client.query(`
      CREATE TABLE IF NOT EXISTS arguments (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        round_number INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabel 'arguments' siap.");

    console.log("🎉 SEMUA TABEL BERHASIL DIBANGUN! SIAP TEMPUR!");

  } catch (err) {
    console.error("❌ Terjadi kesalahan saat setup database:", err);
  } finally {
    client.release();
    pool.end();
  }
}

setupDatabase();