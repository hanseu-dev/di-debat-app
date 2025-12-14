// server/services/aiJudgeService.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// UPDATE: Pakai model 1.5-flash yang kuotanya LEBIH BANYAK & STABIL
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

// Helper untuk delay (jeda) biar tidak kena rate limit
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * HELPER: Bersihkan & Parse JSON dari AI
 */
function cleanAndParseJSON(text) {
    try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gagal parse JSON dari AI:", text);
        return null;
    }
}

/**
 * STAGE 1: MAP (Analisis Per Ronde)
 */
async function mapPhase_SummarizeRound(roundNumber, proArgs, contraArgs, topic) {
    console.log(`🤖 AI MAP: Menganalisis Ronde ${roundNumber}...`);

    const proText = proArgs.length > 0 
        ? proArgs.map(a => a.content).join("\n\n").substring(0, 12000) 
        : "Tidak ada argumen";

    const contraText = contraArgs.length > 0 
        ? contraArgs.map(a => a.content).join("\n\n").substring(0, 12000)
        : "Tidak ada argumen";

    const prompt = `Anda adalah seorang ahli analis debat. Analisis Ronde ${roundNumber}:
Mosi: "${topic}"
Argumen PRO:
${proText}

Argumen KONTRA:
${contraText}

Berikan dalam format JSON: {"ronde": ${roundNumber}, "rangkuman_singkat": "ringkasan singkat siapa yang unggul (maksimal 2 kalimat)"}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return cleanAndParseJSON(text);
    } catch (error) {
        console.error(`Error Map Ronde ${roundNumber}:`, error.message);
        return null;
    }
}

/**
 * STAGE 2: REDUCE (Final Verdict)
 */
async function reducePhase_FinalVerdict(roundSummaries, topic) {
    console.log("🤖 AI REDUCE: Menghitung Final Verdict...");

    const summariesText = roundSummaries
        .map(s => `Ronde ${s.ronde}: ${s.rangkuman_singkat}`)
        .join("\n");

    const promptFinal = `Anda adalah Hakim Ketua yang mengevaluasi debat berikut:
Mosi: "${topic}"

Rangkuman per ronde:
${summariesText}

Berdasarkan rangkuman, tentukan pemenang keseluruhan dan berikan justifikasi yang logis dan tidak memihak.
Format JSON: {"winner": "PRO" atau "KONTRA" atau "SERI", "justification": "penjelasan rinci..."}`;

    try {
        const result = await model.generateContent(promptFinal);
        const text = result.response.text();
        return cleanAndParseJSON(text);
    } catch (error) {
        console.error("Error Reduce Phase:", error.message);
        return null;
    }
}

/**
 * FUNGSI UTAMA (Orchestrator)
 */
async function runDebateAnalysis(allArguments, topic, totalRounds) {
    const validSummaries = [];

    // 1. EXECUTE MAP PHASE (SEQUENTIAL / BERGANTIAN)
    // KITA UBAH DARI PROMISE.ALL MENJADI LOOP BIASA
    // Agar tidak menembak API limit (Rate Limit Protection)
    
    for (let r = 1; r <= totalRounds; r++) {
        const proArgs = allArguments.filter(a => a.side === 'PRO' && a.round_number === r);
        const contraArgs = allArguments.filter(a => a.side === 'CONTRA' && a.round_number === r);

        // Jalankan analisis
        const result = await mapPhase_SummarizeRound(r, proArgs, contraArgs, topic);
        
        if (result) {
            validSummaries.push(result);
        }

        // JEDA 1 DETIK ANTAR RONDE (PENTING AGAR TIDAK ERROR 429)
        if (r < totalRounds) await sleep(1000); 
    }

    if (validSummaries.length === 0) {
        return "### ❌ Gagal Analisis\nAI tidak dapat merangkum jalannya debat (Rate Limit atau Error Koneksi).";
    }

    // 2. EXECUTE REDUCE PHASE
    // Beri jeda sedikit sebelum final verdict
    await sleep(1000);
    const finalResult = await reducePhase_FinalVerdict(validSummaries, topic);

    if (!finalResult) {
        return "### ❌ Gagal Analisis\nAI gagal menentukan pemenang akhir.";
    }

    // 3. FORMATTING OUTPUT (JSON -> Markdown)
    let winnerEmoji = "⚖️";
    if (finalResult.winner === "PRO" || finalResult.winner === "GOVERNMENT") winnerEmoji = "🏆 GOVERNMENT (PRO)";
    else if (finalResult.winner === "KONTRA" || finalResult.winner === "CONTRA" || finalResult.winner === "OPPOSITION") winnerEmoji = "🏆 OPPOSITION (CONTRA)";
    else if (finalResult.winner === "SERI") winnerEmoji = "🤝 SERI (DRAW)";

    const markdownOutput = `
### 🤖 KEPUTUSAN JURI AI
**Pemenang:** ${winnerEmoji}

---
#### 📝 Justifikasi Keputusan
${finalResult.justification}

---
#### 🔍 Rangkuman Jalannya Debat
${validSummaries.map(s => `* **Ronde ${s.ronde}:** ${s.rangkuman_singkat}`).join('\n')}
    `;

    return {
        markdown: markdownOutput.trim(),
        winner: finalResult.winner, // 'PRO', 'KONTRA', atau 'SERI'
        raw_data: finalResult
    };
}

module.exports = { runDebateAnalysis };