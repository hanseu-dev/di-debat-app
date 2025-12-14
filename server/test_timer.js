// test_timer.js - FINAL FIX
const io = require("socket.io-client");
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const USER_EMAIL = 'host@debat.com'; 
const USER_PASS = '123';

let socket;
let ROOM_CODE = "";
let timerLoop; // Variable untuk simulasi hitung mundur di client

async function runTest() {
  try {
    console.log("🛠️  Persiapan Room...");
    const loginRes = await axios.post(`${API_URL}/auth/login`, { email: USER_EMAIL, password: USER_PASS });
    const token = loginRes.data.token;

    // Bikin Room Baru
    const roomRes = await axios.post(`${API_URL}/rooms/create`, 
      { topic: "Final Timer Test", config: {}, is_public: true },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    ROOM_CODE = roomRes.data.room_code;
    console.log(`✅ Room Siap: ${ROOM_CODE}`);
    
    startSocket();

  } catch (err) {
    console.error("❌ Gagal:", err.message);
  }
}

function startSocket() {
  socket = io(API_URL);

  socket.on("connect", () => {
    console.log(`🔌 Terkoneksi (ID: ${socket.id})`);
    socket.emit("join_room", ROOM_CODE);

    // Kalau ini koneksi pertama (belum pernah disconnect), kita START timer
    if (!timerLoop) {
      console.log("▶️  Request Start Timer 20s ke Server...");
      socket.emit("start_timer", {
        room_code: ROOM_CODE, duration_seconds: 20, side: "PRO"
      });
    } else {
      // Kalau ini koneksi kedua (reconnect), kita minta SYNC
      console.log("🔄 Reconnect berhasil. Meminta data waktu ke server...");
      socket.emit("sync_timer", ROOM_CODE);
    }
  });

  socket.on("timer_update", (data) => {
    if (!data.running) return;

    // Hitung sisa waktu berdasarkan data dari server
    const sisaWaktuServer = Math.ceil((parseInt(data.endTime) - Date.now()) / 1000);
    console.log(`⏱️  Server bilang sisa waktu: ${sisaWaktuServer} detik.`);

    // --- LOGIKA TEST ---
    
    if (!timerLoop) {
      // INI ADALAH UPDATE PERTAMA (START)
      console.log("   --> Oke, timer jalan. Saya akan tunggu 4 detik lalu cabut kabel...");
      
      // Kita set penanda bahwa tes sudah berjalan
      timerLoop = true; 

      // Tunggu 4 detik, lalu disconnect
      setTimeout(() => {
        console.log("\n🏃💨 ISENG DISCONNECT (Simulasi Internet Mati)...");
        socket.disconnect();

        // Tunggu 4 detik lagi, lalu connect lagi
        setTimeout(() => {
          console.log("\n🔙 USER KEMBALI ONLINE...");
          socket.connect();
        }, 4000);

      }, 4000);

    } else {
      // INI ADALAH UPDATE KEDUA (SETELAH RECONNECT)
      console.log("\n🕵️  HASIL PENGECEKAN ANTI-LUPA:");
      // Kalau logika benar, sisa waktu harusnya berkurang sekitar 8 detik (4 detik online + 4 detik mati)
      // Jadi dari 20, harusnya sisa sekitar 11-13 detik.
      if (sisaWaktuServer < 18) {
        console.log(`✅ SUKSES! Waktu berkurang secara real-time (Sisa: ${sisaWaktuServer}s).`);
        console.log("   Server tidak mereset timer jadi 20s lagi. MANTAP!");
      } else {
        console.log("❌ GAGAL. Waktu sepertinya kereset atau tidak jalan.");
      }
      process.exit(); // Selesai
    }
  });
}

runTest();