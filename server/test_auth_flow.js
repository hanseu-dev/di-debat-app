// test_auth_flow.js
// Script ini akan pura-pura menjadi User yang Daftar lalu Login
const axios = require('axios'); // Kita butuh axios untuk nembak server sendiri

// Pastikan kamu install axios dulu: npm install axios
// URL Server
const API_URL = 'http://localhost:3000';

async function testAuth() {
  const randomNum = Math.floor(Math.random() * 1000);
  const testUser = {
    username: `Debater${randomNum}`,
    email: `debater${randomNum}@gmail.com`,
    password: 'rahasia_super'
  };

  try {
    console.log("--- 1. MENCOBA REGISTER ---");
    const regRes = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log("Respon Server:", regRes.data);

    console.log("\n--- 2. MENCOBA LOGIN ---");
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log("Respon Server:", loginRes.data);
    
    if(loginRes.data.token) {
        console.log("\n✅ SUKSES! Kita dapat Token:", loginRes.data.token.substring(0, 20) + "...");
        console.log("Token inilah yang nanti dipakai untuk fitur 'Anti-Lupa'.");
    }

  } catch (error) {
    console.error("❌ ERROR:", error.response ? error.response.data : error.message);
  }
}

testAuth();