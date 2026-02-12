// index.js - Server Utama DI-DEBAT V2.2 (FINAL INTEGRATED VERSION)
const express = require('express');
const cors = require('cors');
const pool = require('./db'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
require('dotenv').config();

const http = require('http'); 
const { Server } = require("socket.io"); 

// IMPORT SERVICE AI
// Pastikan file server/services/aiJudgeService.js ada dan benar
const { runDebateAnalysis } = require('./services/aiJudgeService'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_negara_di_debat'; 

// Variable Global untuk Smart Timer
let roomTimeouts = {}; 

app.use(cors({
    origin: 'https://di-debat-app-uv1w6i8c31.edgeone.dev', // <--- GANTI JADI BINTANG (Artinya: Semua boleh masuk)
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true // (Catatan: kalau error, coba hapus baris credentials ini nanti)
}));
app.use(express.json()); 

// ==========================================
//                HELPER FUNCTIONS
// ==========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (token == null) return res.status(401).json({ msg: "Anda belum login!" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ msg: "Token tidak valid/kadaluarsa" });
    req.user = user; next();
  });
}

function generateRoomCode() {
   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   let result = 'DEBAT-';
   for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
   return result;
}

// --- FUNGSI CORE AI & UPDATE SKOR (Digunakan Otomatis & Manual) ---
// --- FUNGSI CORE AI (DEBUG VERSION) ---
async function processDebateResult(room_code) {
    console.log(`\n🤖 [AI START] Memulai proses untuk Room: ${room_code}`);
    
    try {
        // 1. Cek Room
        const roomRes = await pool.query(`SELECT id, topic, status FROM rooms WHERE room_code = $1`, [room_code]);
        if (roomRes.rows.length === 0) {
            console.log("❌ [AI FAIL] Room tidak ditemukan di DB");
            return;
        }
        const room = roomRes.rows[0];
        console.log(`✅ [AI STEP 1] Room ketemu: ${room.topic} (ID: ${room.id})`);

        // 2. Beritahu Client: Loading...
        io.to(room_code).emit('analysis_started');

        // 3. Ambil Argumen
        const argsRes = await pool.query(`SELECT side, content, round_number FROM arguments WHERE room_id = $1 ORDER BY round_number ASC, created_at ASC`, [room.id]);
        
        console.log(`🔍 [AI STEP 2] Mengambil argumen. Jumlah: ${argsRes.rows.length}`);

        if (argsRes.rows.length === 0) {
            console.warn("⚠️ [AI WARN] Tidak ada argumen untuk dianalisis. Membatalkan AI.");
            io.to(room_code).emit('ai_result_published', { content: "### ❌ Gagal Analisis\nBelum ada argumen yang masuk. Debat ini kosong." });
            return;
        }

        // 4. Jalankan Logic AI (Disini biasanya error)
        console.log("⏳ [AI STEP 3] Mengirim data ke AI Service (OpenAI/Gemini)... Tunggu sebentar...");
        
        const maxRound = Math.max(...argsRes.rows.map(a => a.round_number || 1));
        
        // PANGGIL SERVICE
        const result = await runDebateAnalysis(argsRes.rows, room.topic, maxRound);
        
        if (!result) {
            throw new Error("AI Service mengembalikan null/undefined");
        }

        console.log("✅ [AI STEP 4] AI Selesai! Panjang respon: ", result.markdown?.length);

        // 5. Update Database
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Tentukan pemenang (String parsing sederhana)
            let winnerSide = 'DRAW';
            let rawWinner = result.winner ? result.winner.toUpperCase() : 'DRAW';
            if (rawWinner.includes('PRO') || rawWinner.includes('GOV')) winnerSide = 'PRO';
            else if (rawWinner.includes('CONTRA') || rawWinner.includes('OPP')) winnerSide = 'CONTRA';
            
            console.log(`🏆 [AI STEP 5] Pemenang: ${winnerSide}`);

            await client.query(`UPDATE rooms SET ai_verdict = $1, winner_side = $2 WHERE id = $3`, [result.markdown, winnerSide, room.id]);
            await client.query('COMMIT');
            console.log("💾 [AI STEP 6] Database updated.");

        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error("❌ [AI DB ERROR] Gagal simpan ke DB:", dbErr);
            throw dbErr;
        } finally {
            client.release();
        }

        // 6. Kirim ke Frontend
        console.log("🚀 [AI FINAL] Mengirim hasil ke Frontend via Socket...");
        io.to(room_code).emit('ai_result_published', { content: result.markdown });

    } catch (err) {
        console.error("❌❌ [AI FATAL ERROR]:", err);
        console.error("Detail Error:", err.response?.data || err.message);
        
        io.to(room_code).emit('ai_result_published', { 
            content: `### ⚠️ Maaf, Terjadi Kesalahan Sistem\n\n**Error:** ${err.message}\n\nSilakan coba lagi tombol "Analisis Ulang".` 
        });
    }
}


// ==========================================
//                  ROUTES
// ==========================================

// 1. Cek Kesehatan
app.get('/', (req, res) => res.send('Server DI-DEBAT V2.2: Sistem Siap Tempur! 🛡️'));

// 2. REGISTER
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) return res.status(401).json({ msg: "Username atau Email sudah terdaftar!" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    res.json({ msg: "Registrasi Berhasil!", user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error saat Register");
  }
});

// 3. LOGIN
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body; 
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) return res.status(401).json({ msg: "Username tidak ditemukan." });

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(401).json({ msg: "Password salah!" });

    const token = jwt.sign({ user_id: user.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ msg: "Login Berhasil!", token: token, user: { id: user.rows[0].id, username: user.rows[0].username } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error saat Login");
  }
});

// --- MOTIONS ---
app.post('/motions', authenticateToken, async (req, res) => {
  try {
    const { topic, description } = req.body;
    const creator_id = req.user.user_id;
    if (!topic) return res.status(400).json({ msg: "Topik mosi harus diisi!" });
    const newMotion = await pool.query(`INSERT INTO motions (topic, description, creator_id) VALUES ($1, $2, $3) RETURNING *`, [topic, description || '', creator_id]);
    res.json({ msg: "Mosi berhasil dibuat!", motion: newMotion.rows[0] });
  } catch (err) { res.status(500).send("Gagal membuat mosi"); }
});

app.get('/motions', async (req, res) => {
  try {
    const query = `
      SELECT m.id, m.topic, m.description, m.created_at, u.username as creator_name,
      (SELECT COUNT(*) FROM rooms r WHERE r.motion_id = m.id) as total_rooms,
      (SELECT COUNT(*) FROM rooms r WHERE r.motion_id = m.id AND r.status = 'ACTIVE') as active_rooms
      FROM motions m JOIN users u ON m.creator_id = u.id ORDER BY active_rooms DESC, m.created_at DESC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Gagal ambil mosi"); }
});

app.get('/motions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const motionRes = await pool.query(`SELECT m.*, u.username as creator_name FROM motions m JOIN users u ON m.creator_id = u.id WHERE m.id = $1`, [id]);
    if (motionRes.rows.length === 0) return res.status(404).json({ msg: "Mosi tidak ditemukan" });
    const roomsRes = await pool.query(`SELECT r.id, r.room_code, r.status, r.config, u.username as host_name, (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count FROM rooms r JOIN users u ON r.host_user_id = u.id WHERE r.motion_id = $1 AND r.is_public = TRUE ORDER BY r.created_at DESC`, [id]);
    res.json({ motion: motionRes.rows[0], rooms: roomsRes.rows });
  } catch (err) { res.status(500).send("Server Error"); }
});

// --- ROOMS ---
app.post('/rooms/create', authenticateToken, async (req, res) => {
  try {
    const { motion_id, config, is_public, max_rounds, speech_duration, allow_spectator_join } = req.body; 
    const host_id = req.user.user_id; 
    if (!motion_id) return res.status(400).json({ msg: "Room harus terhubung ke Mosi!" });
    const motionRes = await pool.query("SELECT topic FROM motions WHERE id = $1", [motion_id]);
    if (motionRes.rows.length === 0) return res.status(404).json({ msg: "Mosi tidak ditemukan" });
    
    const finalConfig = { ...config, max_rounds: max_rounds || 3, speech_duration: speech_duration !== undefined ? speech_duration : 0, allow_spectator_join: allow_spectator_join || false };
    let room_code = generateRoomCode();
    const newRoom = await pool.query(`INSERT INTO rooms (room_code, topic, host_user_id, config, is_public, motion_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [room_code, motionRes.rows[0].topic, host_id, finalConfig, is_public, motion_id]);
    await pool.query(`INSERT INTO participants (room_id, user_id, role, side) VALUES ($1, $2, 'HOST', 'NEUTRAL')`, [newRoom.rows[0].id, host_id]);
    res.json({ msg: "Room berhasil dibuat!", room_code: newRoom.rows[0].room_code, room_id: newRoom.rows[0].id });
  } catch (err) { res.status(500).send("Gagal membuat room"); }
});

app.post('/rooms/join', authenticateToken, async (req, res) => {
  try {
    const { room_code } = req.body;
    const user_id = req.user.user_id;
    const roomResult = await pool.query('SELECT * FROM rooms WHERE room_code = $1', [room_code]);
    if (roomResult.rows.length === 0) return res.status(404).json({ msg: "Room tidak ditemukan!" });
    const room = roomResult.rows[0];
    const participantCheck = await pool.query('SELECT * FROM participants WHERE room_id = $1 AND user_id = $2', [room.id, user_id]);
    if (participantCheck.rows.length > 0) return res.json({ msg: "Welcome back!", room_id: room.id, role: participantCheck.rows[0].role });
    await pool.query(`INSERT INTO participants (room_id, user_id, role, side) VALUES ($1, $2, 'SPECTATOR', 'NEUTRAL')`, [room.id, user_id]);
    res.json({ msg: "Berhasil masuk lobby!", room_id: room.id, role: 'SPECTATOR' });
  } catch (err) { res.status(500).send("Server Error saat Join"); }
});

app.get('/rooms/:roomId/participants', authenticateToken, async (req, res) => {
  try {
    const {roomId} = req.params;
    const result = await pool.query(`SELECT p.side, p.role, p.seat_number, u.username FROM participants p JOIN users u ON p.user_id = u.id WHERE p.room_id = $1`, [roomId]);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Gagal ambil data kursi"); }
});

app.post('/rooms/claim-seat', authenticateToken, async (req, res) => {
  try {
    const { room_id, side, seat_number, room_code } = req.body;
    const user_id = req.user.user_id;
    const seatCheck = await pool.query('SELECT * FROM participants WHERE room_id = $1 AND side = $2 AND seat_number = $3', [room_id, side, seat_number]);
    if (seatCheck.rows.length > 0) return res.status(400).json({ msg: "Kursi sudah terisi." });
    
    const roomCheck = await pool.query('SELECT status, config FROM rooms WHERE id = $1', [room_id]);
    const { status, config } = roomCheck.rows[0];
    const currentUserRes = await pool.query('SELECT role, side FROM participants WHERE room_id = $1 AND user_id = $2', [room_id, user_id]);
    
    if (status === 'ACTIVE') {
        if (currentUserRes.rows[0]?.role === 'DEBATER' && currentUserRes.rows[0]?.side !== side) return res.status(400).json({ msg: "Tidak boleh pindah tim saat main!" });
        if (!config.allow_spectator_join && (!currentUserRes.rows[0] || currentUserRes.rows[0].role !== 'DEBATER')) return res.status(400).json({ msg: "Room dikunci host." });
    }

    await pool.query('DELETE FROM participants WHERE room_id = $1 AND user_id = $2', [room_id, user_id]);
    await pool.query(`INSERT INTO participants (room_id, user_id, role, side, seat_number) VALUES ($1, $2, 'DEBATER', $3, $4)`, [room_id, user_id, side, seat_number]);
    io.to(room_code).emit('update_seat_map'); 
    res.json({ msg: "Posisi diamankan." });
  } catch (err) { res.status(500).send("Gagal pilih kursi"); }
});

app.get('/rooms/:id/arguments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT a.id, a.content, a.side, a.created_at, u.username, a.round_number,
      COALESCE(json_agg(json_build_object('type', f.fallacy_type, 'desc', f.description, 'user', u2.username)) FILTER (WHERE f.id IS NOT NULL), '[]') as fallacy_tags
      FROM arguments a JOIN users u ON a.user_id = u.id LEFT JOIN fallacy_tags f ON a.id = f.argument_id LEFT JOIN users u2 ON f.user_id = u2.id
      WHERE a.room_id = $1 GROUP BY a.id, u.username ORDER BY a.created_at ASC`;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Gagal memuat argumen"); }
});

app.get('/rooms/public', async (req, res) => {
  try {
    const query = `SELECT r.id, r.room_code, r.topic, r.status, r.config, u.username AS host_name, count(p.id) as participant_count FROM rooms r LEFT JOIN participants p ON r.id = p.room_id LEFT JOIN users u ON r.host_user_id = u.id WHERE r.is_public = TRUE GROUP BY r.id, u.username ORDER BY r.created_at DESC`;
    const result = await pool.query(query); 
    res.json(result.rows);
  } catch (err) { res.status(500).send("Gagal ambil room public"); }
});

app.get('/rooms/id/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // [DEBUG SERVER] Tambahkan ini 👇
    console.log(`🔔 [BACKEND] Request masuk: GET Detail Room ID: ${roomId}`);

    const result = await pool.query(
        `SELECT id, room_code, topic, status, config, host_user_id, is_locked, is_public, ai_verdict 
         FROM rooms WHERE id = $1`, 
        [roomId]
    );

    if (result.rows.length === 0) {
        console.log(`⚠️ [BACKEND] Room ID ${roomId} TIDAK DITEMUKAN di Database!`); // Debug kalau kosong
        return res.status(404).json({ msg: "Room tidak ditemukan" });
    }

    console.log(`✅ [BACKEND] Room ditemukan: ${result.rows[0].topic}`); // Debug kalau sukses
    res.json(result.rows[0]);

  } catch (err) { 
    console.error("❌ [BACKEND] Error SQL:", err);
    res.status(500).send("Error detail room"); 
  }
});

app.get('/rooms/:id/votes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT round_number, side, COUNT(*) as count FROM round_votes WHERE room_id = $1 GROUP BY round_number, side`, [id]);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Gagal ambil vote"); }
});

app.post('/rooms/leave', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.body;
    const user_id = req.user.user_id;
    const p = await pool.query('SELECT role FROM participants WHERE room_id = $1 AND user_id = $2', [room_id, user_id]);
    if (p.rows.length > 0 && p.rows[0].role === 'SPECTATOR') {
       await pool.query('DELETE FROM participants WHERE room_id = $1 AND user_id = $2', [room_id, user_id]);
       return res.json({ msg: "Berhasil keluar" });
    }
    res.json({ msg: "Keluar" });
  } catch (err) { res.status(500).send("Gagal leave"); }
});

// --- USERS & PROFILES ---

// 14. LEADERBOARD (ID Included)
app.get('/users/leaderboard', async (req, res) => {
  try {
    const query = `SELECT id, username, wins, losses, draws FROM users ORDER BY wins DESC, draws DESC, losses ASC LIMIT 50`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Gagal leaderboard"); }
});

// 15. PUBLIC PROFILE (New)
app.get('/users/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    const userRes = await pool.query('SELECT id, username, created_at, wins, losses, draws FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ msg: "User tidak ditemukan" });
    const historyQuery = `SELECT r.id, r.room_code, r.topic, r.status, r.created_at, p.role, p.side, m.topic as motion_title FROM participants p JOIN rooms r ON p.room_id = r.id LEFT JOIN motions m ON r.motion_id = m.id WHERE p.user_id = $1 ORDER BY r.created_at DESC LIMIT 10`;
    const historyRes = await pool.query(historyQuery, [id]);
    res.json({ user: userRes.rows[0], history: historyRes.rows });
  } catch (err) { res.status(500).send("Server Error"); }
});

// MY PROFILE
app.get('/users/profile', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const userRes = await pool.query('SELECT id, username, email, created_at, wins, losses, draws FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ msg: "User hilang" });
    const historyRes = await pool.query(`SELECT r.id, r.room_code, r.topic, r.status, r.created_at, p.role, p.side, p.seat_number, m.topic as motion_title FROM participants p JOIN rooms r ON p.room_id = r.id LEFT JOIN motions m ON r.motion_id = m.id WHERE p.user_id = $1 ORDER BY r.created_at DESC`, [user_id]);
    const createdMotions = await pool.query(`SELECT m.id, m.topic, m.description, m.created_at, (SELECT COUNT(*) FROM rooms r WHERE r.motion_id = m.id) as total_rooms FROM motions m WHERE m.creator_id = $1 ORDER BY m.created_at DESC`, [user_id]);
    const createdRooms = await pool.query(`SELECT r.id, r.room_code, r.topic, r.status, r.created_at, r.is_public, m.topic as motion_title, (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count FROM rooms r LEFT JOIN motions m ON r.motion_id = m.id WHERE r.host_user_id = $1 ORDER BY r.created_at DESC`, [user_id]);
    res.json({ user: userRes.rows[0], history: historyRes.rows, created_motions: createdMotions.rows, created_rooms: createdRooms.rows });
  } catch (err) { res.status(500).send("Gagal profile"); }
});


// ==========================================
//             SOCKET.IO LOGIC
// ==========================================

async function startSpeakingTimer(room_code) {
    const roomRes = await pool.query("SELECT config, current_speaker_side FROM rooms WHERE room_code = $1", [room_code]);
    if (roomRes.rows.length === 0) return;
    const { config, current_speaker_side } = roomRes.rows[0];
    
    let duration = config.speech_duration !== undefined ? parseInt(config.speech_duration) : 0;
    let endTime = null;
    if (duration > 0) endTime = Date.now() + (duration * 1000);

    await pool.query(`UPDATE rooms SET turn_ends_at = $1 WHERE room_code = $2`, [endTime, room_code]);
    io.to(room_code).emit('timer_update', { running: true, endTime: endTime, side: current_speaker_side, status: 'SPEAKING' });
}

io.on('connection', (socket) => {
  console.log('⚡ User terkoneksi:', socket.id);

  socket.on('join_room', (roomCode) => socket.join(roomCode));

  // SEND ARGUMENT
  socket.on('send_argument', async (data) => {
    if (!data.room_id || !data.user_id) return;
    try {
      const saveQuery = `INSERT INTO arguments (room_id, user_id, content, side, round_number) VALUES ($1, $2, $3, $4, $5) RETURNING created_at, id`;
      const savedArg = await pool.query(saveQuery, [data.room_id, data.user_id, data.message, data.side, data.round_number || 1]);
      data.created_at = savedArg.rows[0].created_at;
      data.id = savedArg.rows[0].id;
      io.to(data.room_code).emit('receive_argument', data);
    } catch (err) { console.error("❌ Gagal chat:", err.message); }
  });

  // START GAME
  socket.on('start_game', async (data) => {
    const { room_code } = data;
    console.log(`🎬 Debat Dimulai: ${room_code}`);
    await pool.query(`UPDATE rooms SET is_locked = TRUE, status = 'ACTIVE', turn_ends_at = NULL, current_speaker_side = 'PRO', current_speaker_seat = 1 WHERE room_code = $1`, [room_code]);
    io.to(room_code).emit('game_status_update', { status: 'ACTIVE', activeSpeaker: { side: 'PRO', seat: 1 }, round: 1 });
    io.to(room_code).emit('timer_update', { running: false, endTime: null, side: 'PRO', status: 'WAITING_INPUT' });
  });

  // TRIGGER TIMER (Smart)
  socket.on('trigger_timer', async (data) => {
      const { room_code } = data;
      if (roomTimeouts[room_code]) { clearTimeout(roomTimeouts[room_code]); delete roomTimeouts[room_code]; }
      const roomRes = await pool.query("SELECT turn_ends_at FROM rooms WHERE room_code = $1", [room_code]);
      if(roomRes.rows.length > 0 && roomRes.rows[0].turn_ends_at != null && parseInt(roomRes.rows[0].turn_ends_at) > Date.now()) return;
      await startSpeakingTimer(room_code);
  });

  // NEXT TURN & AUTO-ANALYSIS
  socket.on('next_turn', async (data) => {
    const { room_code, currentSide, currentSeat } = data;
    const roomRes = await pool.query("SELECT id, config FROM rooms WHERE room_code = $1", [room_code]);
    if (roomRes.rows.length === 0) return;
    const { id: roomId, config } = roomRes.rows[0];
    
    const format = config.format || 'Asian Parliamentary';
    const maxRounds = parseInt(config.max_rounds) || 3;
    let nextSide, nextSeat;
    let isGameOver = false;

    if (format === '1 vs 1 (Duel)') {
       if (currentSide === 'PRO') { nextSide = 'CONTRA'; nextSeat = currentSeat; } 
       else { nextSide = 'PRO'; nextSeat = currentSeat + 1; if (nextSeat > maxRounds) isGameOver = true; }
    } else {
       if (currentSide === 'PRO') { nextSide = 'CONTRA'; nextSeat = currentSeat; } 
       else { nextSide = 'PRO'; nextSeat = currentSeat + 1; }
       const maxSpeaker = format.includes('British') ? 4 : 3; 
       if (nextSeat > maxSpeaker) isGameOver = true;
    }

    if (isGameOver) {
      // GAME OVER -> TRIGGER AUTO ANALYSIS
      await pool.query(`UPDATE rooms SET status = 'FINISHED' WHERE room_code = $1`, [room_code]);
      io.to(room_code).emit('game_status_update', { status: 'FINISHED', activeSpeaker: null });
      io.to(room_code).emit('timer_update', { running: false, endTime: null, side: null, status: 'FINISHED' });
      
      // Auto-Trigger AI
      await processDebateResult(room_code);

    } else {
      // Reading Phase
      const lastArgRes = await pool.query(`SELECT content FROM arguments WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1`, [roomId]);
      let readingSeconds = 5; 
      if (lastArgRes.rows.length > 0) {
          const wordCount = (lastArgRes.rows[0].content || "").trim().split(/\s+/).length;
          readingSeconds = Math.ceil(wordCount / 3); 
          if (readingSeconds < 5) readingSeconds = 5; if (readingSeconds > 60) readingSeconds = 60;
      }
      await pool.query(`UPDATE rooms SET turn_ends_at = NULL, current_speaker_side = $1, current_speaker_seat = $2 WHERE room_code = $3`, [nextSide, nextSeat, room_code]);
      io.to(room_code).emit('game_status_update', { status: 'ACTIVE', activeSpeaker: { side: nextSide, seat: nextSeat }, round: nextSeat });
      io.to(room_code).emit('timer_update', { running: false, endTime: null, side: nextSide, status: 'READING', readingDuration: readingSeconds });

      if (roomTimeouts[room_code]) clearTimeout(roomTimeouts[room_code]);
      roomTimeouts[room_code] = setTimeout(async () => {
          await startSpeakingTimer(room_code);
          delete roomTimeouts[room_code];
      }, readingSeconds * 1000);
    }
  });

  // START ANALYSIS (Manual Retry)
  socket.on('start_analysis', async (data) => {
      try {
          await processDebateResult(data.room_code);
      } catch (err) {
          console.error("Manual Analysis Error:", err);
      }
  });

  // Sync State
  socket.on('sync_game_state', async (room_code) => {
    try {
      const res = await pool.query('SELECT status, turn_ends_at, current_speaker_side, current_speaker_seat FROM rooms WHERE room_code = $1', [room_code]);
      if(res.rows.length > 0) {
        const room = res.rows[0];
        if (room.status === 'ACTIVE') {
           let isRunning = false; let endTimeVal = null; let status = 'WAITING_INPUT';
           if (room.turn_ends_at) {
              endTimeVal = parseInt(room.turn_ends_at);
              if (endTimeVal > Date.now()) { isRunning = true; status = 'SPEAKING'; }
           }
           socket.emit('timer_update', { running: isRunning, endTime: endTimeVal, side: room.current_speaker_side, status: status });
           socket.emit('game_status_update', { status: 'ACTIVE', activeSpeaker: { side: room.current_speaker_side || 'PRO', seat: room.current_speaker_seat || 1 }, round: room.current_speaker_seat || 1 });
        } else {
           socket.emit('game_status_update', { status: room.status, activeSpeaker: null });
        }
      }
    } catch(err) { console.error(err); }
  });

  // Voting & Fallacy
  socket.on('cast_vote', async (data) => {
    try {
      await pool.query(`INSERT INTO round_votes (room_id, user_id, round_number, side) VALUES ($1, $2, $3, $4) ON CONFLICT (room_id, round_number, user_id) DO UPDATE SET side = EXCLUDED.side`, [data.room_id, data.user_id, data.round_number, data.side]);
      const countRes = await pool.query(`SELECT side, COUNT(*) as count FROM round_votes WHERE room_id = $1 AND round_number = $2 GROUP BY side`, [data.room_id, data.round_number]);
      io.to(data.room_code).emit('vote_update', { round: data.round_number, stats: countRes.rows });
    } catch (err) { console.error("Gagal Vote:", err); }
  });

  socket.on('tag_fallacy', async (data) => {
    try {
      await pool.query(`INSERT INTO fallacy_tags (argument_id, user_id, fallacy_type, description) VALUES ($1, $2, $3, $4)`, [data.argument_id, data.user_id, data.fallacy_type, data.description]);
      io.to(data.room_code).emit('fallacy_added', { argument_id: data.argument_id, tag: { type: data.fallacy_type, desc: data.description, user: data.username } });
    } catch (err) { console.error("Gagal Tag:", err); }
  });

  socket.on('typing_text', (data) => socket.to(data.roomCode).emit('opponent_typing', data));
});

server.listen(PORT, () => { console.log(`Server Real-time berjalan di http://localhost:${PORT}`); });