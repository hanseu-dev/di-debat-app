// test_persistence.js
const axios = require('axios');
const io = require("socket.io-client");
const API_URL = 'http://localhost:3000';

// Kita pakai User Host yang sudah ada
const EMAIL = 'host@debat.com'; 
const PASSWORD = '123';

async function testStorage() {
  try {
    // 1. Login dulu buat dapat Token & User ID
    const loginRes = await axios.post(`${API_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
    const { token, user } = loginRes.data;
    console.log(`✅ Login sebagai ${user.username} (ID: ${user.id})`);

    // 2. Kita butuh Room ID yang valid. Kita ambil sembarang Room Public
    // (Pastikan kamu sudah pernah jalankan test_create_room sebelumnya)
    const roomsRes = await poolQueryCheck(); // Fungsi helper di bawah
    if (!roomsRes) return;
    
    const ROOM_ID = roomsRes.room_id;
    const ROOM_CODE = roomsRes.room_code;
    console.log(`🎯 Target Room: ID ${ROOM_ID} (${ROOM_CODE})`);

    // 3. Konek Socket
    const socket = io(API_URL);
    
    socket.on("connect", () => {
      console.log("🔌 Socket Terkoneksi. Mengirim Pesan...");
      
      socket.emit("join_room", ROOM_CODE);

      // KIRIM PESAN (Lengkap dengan ID)
      socket.emit("send_argument", {
        room_id: ROOM_ID,
        user_id: user.id,
        room_code: ROOM_CODE,
        username: user.username,
        message: "Tes Pesan Abadi No. " + Math.floor(Math.random() * 100),
        side: "PRO"
      });
    });

    // 4. Dengarkan balikan
    socket.on("receive_argument", async (data) => {
      console.log(`\n📨 Server membalas: "${data.message}"`);
      console.log(`   Timestamp: ${data.created_at}`);
      
      // 5. PEMBUKTIAN: Cek via API History
      console.log("\n🕵️ Memeriksa Database via API History...");
      const historyRes = await axios.get(`${API_URL}/rooms/${ROOM_ID}/arguments`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cek apakah pesan terakhir ada di list history?
      const lastMsg = historyRes.data[historyRes.data.length - 1];
      if (lastMsg && lastMsg.content === data.message) {
        console.log("🎉 SUKSES BESAR! Pesan tersimpan di Database.");
        console.log("   Bukti: API mengembalikan pesan ->", lastMsg.content);
      } else {
        console.log("⚠️ Gagal: Pesan tidak ditemukan di history.");
      }

      socket.disconnect();
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

// Helper untuk cari room di database tanpa library pg di sini (biar simpel pakai axios logic atau asumsi)
// Tapi biar akurat, kita pinjam pool connection sebentar atau manual input
// Biar gampang, kita fetch user rooms list kalau ada, atau create baru.
// Kita pakai trik create room baru aja biar pasti berhasil.
async function poolQueryCheck() {
   // Bikin room baru biar fresh
   const loginRes = await axios.post(`${API_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
   const createRes = await axios.post(`${API_URL}/rooms/create`, 
      { topic: "Tes Persistence", config: {}, is_public: true },
      { headers: { Authorization: `Bearer ${loginRes.data.token}` } }
   );
   return createRes.data; // return { room_id, room_code ... }
}

testStorage();