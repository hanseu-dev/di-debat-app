// test_lobby_flow.js
const axios = require('axios');
const API_URL = 'http://localhost:3000';

// Kita butuh 2 User berbeda
const HOST_EMAIL = 'host@debat.com'; // Ganti/Buat baru jika perlu
const GUEST_EMAIL = 'guest@debat.com'; 

async function lobbySimulation() {
  try {
    // --- STEP 1: PERSIAPAN USER ---
    // (Biar script ini bisa jalan terus, kita register user dulu kalau belum ada)
    // Abaikan error kalau user sudah ada.
    try {
        await axios.post(`${API_URL}/auth/register`, { username: 'HostMaster', email: HOST_EMAIL, password: '123' });
        await axios.post(`${API_URL}/auth/register`, { username: 'GuestChallenger', email: GUEST_EMAIL, password: '123' });
    } catch (e) {} // Lanjut aja kalau sudah terdaftar

    // --- STEP 2: HOST LOGIN & BIKIN ROOM ---
    console.log("\n🎤 [HOST] Sedang Login...");
    const hostLogin = await axios.post(`${API_URL}/auth/login`, { email: HOST_EMAIL, password: '123' });
    const hostToken = hostLogin.data.token;

    console.log("🎤 [HOST] Membuat Room...");
    const roomRes = await axios.post(`${API_URL}/rooms/create`, 
      { topic: "Bumi itu Datar", config: {}, is_public: false },
      { headers: { Authorization: `Bearer ${hostToken}` } }
    );
    
    const KODE_ROOM = roomRes.data.room_code;
    const ID_ROOM = roomRes.data.room_id;
    console.log(`✅ Room Tercipta! KODE: [ ${KODE_ROOM} ]`);


    // --- STEP 3: GUEST LOGIN & JOIN ---
    console.log(`\n👤 [GUEST] Sedang Login...`);
    const guestLogin = await axios.post(`${API_URL}/auth/login`, { email: GUEST_EMAIL, password: '123' });
    const guestToken = guestLogin.data.token;

    console.log(`👤 [GUEST] Mencoba Join ke Room ${KODE_ROOM}...`);
    await axios.post(`${API_URL}/rooms/join`, 
      { room_code: KODE_ROOM },
      { headers: { Authorization: `Bearer ${guestToken}` } }
    );
    console.log("✅ Berhasil masuk Lobby (masih jadi Penonton).");


    // --- STEP 4: GUEST PILIH KURSI ---
    console.log(`\n👤 [GUEST] Saya mau duduk di TIM PRO, Kursi No 1!`);
    const seatRes = await axios.post(`${API_URL}/rooms/claim-seat`,
      { room_id: ID_ROOM, side: 'PRO', seat_number: 1 },
      { headers: { Authorization: `Bearer ${guestToken}` } }
    );
    console.log("✅ Respon Server:", seatRes.data.msg);


    // --- STEP 5: CEK LOBBY (Siapa duduk dimana?) ---
    console.log(`\n👀 [SYSTEM] Mengintip isi ruangan...`);
    const participants = await axios.get(`${API_URL}/rooms/${ID_ROOM}/participants`, 
      { headers: { Authorization: `Bearer ${hostToken}` } }
    );
    console.table(participants.data);

  } catch (err) {
    console.error("❌ ERROR:", err.response ? err.response.data : err.message);
  }
}

lobbySimulation();