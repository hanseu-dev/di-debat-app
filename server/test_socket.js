// test_socket.js
const io = require("socket.io-client");

// Simulasi User A (Tim PRO)
const socketA = io("http://localhost:3000");

// Simulasi User B (Tim KONTRA)
const socketB = io("http://localhost:3000");

const ROOM_CODE = "DEBAT-TES-1";

// --- SKENARIO ---
socketA.on("connect", () => {
  console.log("🟢 User A Terkoneksi. ID:", socketA.id);
  socketA.emit("join_room", ROOM_CODE);
  
  // Setelah 1 detik, User A kirim argumen
  setTimeout(() => {
    console.log("🗣️  User A mengirim argumen...");
    socketA.emit("send_argument", {
      roomCode: ROOM_CODE,
      username: "ProPlayer",
      message: "Interupsi! Data Anda salah.",
      side: "PRO"
    });
  }, 1000);
});

socketB.on("connect", () => {
  console.log("🔵 User B Terkoneksi. ID:", socketB.id);
  socketB.emit("join_room", ROOM_CODE);

  // User B siap mendengarkan (nguping)
  socketB.on("receive_argument", (data) => {
    console.log(`\n📨 [User B Menerima Data]`);
    console.log(`   Dari: ${data.username} (${data.side})`);
    console.log(`   Pesan: "${data.message}"`);
    console.log(`   (Hebat kan? User B terima pesan tanpa refresh!)`);
    
    // Matikan koneksi biar script selesai
    socketA.disconnect();
    socketB.disconnect();
  });
});