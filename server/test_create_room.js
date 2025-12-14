const axios = require('axios');
const API_URL = 'http://localhost:3000';

async function testScenario() {
  try {
    // 1. Login dulu (Pakai user yang tadi dibuat di test_auth)
    // Ganti email/pass sesuai user yang kamu ingat, atau biarkan kalau database masih ada datanya
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'debater309@gmail.com', // Ganti dengan email valid di DB kamu
      password: 'rahasia_super'
    });
    
    const token = loginRes.data.token;
    console.log("✅ Login Sukses. Token didapat.");

    // 2. Bikin PRIVATE ROOM (Mode Teman)
    console.log("\n--- Membuat PRIVATE ROOM ---");
    const privateRoom = await axios.post(
      `${API_URL}/rooms/create`, 
      {
        topic: "Dewan ini percaya AI lebih baik dari Manusia",
        config: { format: "Asian Parliamentary", speech_time: 420 }, // 7 menit
        is_public: false // <--- INI KUNCINYA PRIVATE
      },
      { headers: { Authorization: `Bearer ${token}` } } // Lampirkan Token
    );
    console.log("🏠 Private Room Created:", privateRoom.data);

    // 3. Bikin PUBLIC ROOM (Mode Matchmaking)
    console.log("\n--- Membuat PUBLIC ROOM ---");
    const publicRoom = await axios.post(
      `${API_URL}/rooms/create`, 
      {
        topic: "Dewan ini akan melarang TikTok",
        config: { format: "1vs1", speech_time: 300 },
        is_public: true // <--- INI KUNCINYA PUBLIC
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("🌍 Public Room Created:", publicRoom.data);

  } catch (err) {
    console.error("❌ Error:", err.response ? err.response.data : err.message);
    console.log("Tips: Pastikan email di script ini sesuai dengan user yang sudah ada di database.");
  }
}

testScenario();