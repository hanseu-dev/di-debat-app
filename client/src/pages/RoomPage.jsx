import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, Send, Shield, AlertTriangle, ArrowLeft, Users, Play, Cpu, 
  CheckCircle, X, Sparkles, FileText, Infinity, Mic2, RefreshCw, 
  Info, ThumbsUp, ThumbsDown, Flag, AlertOctagon, BookOpen, Keyboard, Layers 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import TextareaAutosize from 'react-textarea-autosize'; 
import ReactMarkdown from 'react-markdown'; 
import remarkMath from 'remark-math'; 
import rehypeKatex from 'rehype-katex'; 
import io from 'socket.io-client'; 
import axios from 'axios';
import { API_URL } from '../config';

// --- KONFIGURASI ROLE ---
const DEBATE_FORMATS = {
  'Asian Parliamentary': {
    PRO: ['Prime Minister', 'Deputy Prime Minister', 'Government Whip'],
    CONTRA: ['Leader of Opposition', 'Deputy Leader of Opposition', 'Opposition Whip']
  },
  'British Parliamentary': {
    PRO: ['Prime Minister', 'Deputy Prime Minister', 'Member of Govt', 'Govt Whip'],
    CONTRA: ['Leader of Opposition', 'Deputy Leader of Opposition', 'Member of Opp', 'Opp Whip']
  },
  '1 vs 1 (Duel)': {
    PRO: ['The Proposition'],
    CONTRA: ['The Opposition']
  }
};

const FALLACY_TYPES = [
    "Ad Hominem (Serang Pribadi)",
    "Strawman (Orang-orangan Sawah)",
    "Red Herring (Pengalihan Isu)",
    "Slippery Slope (Lereng Licin)",
    "False Dichotomy (Dikotomi Palsu)",
    "Hasty Generalization (Generalisasi Terburu-buru)",
    "Appeal to Emotion (Mengaduk Emosi)",
    "Circular Reasoning (Logika Berputar)"
];

let socket; 
let timerInterval;
let readingInterval; 

const RoomPage = () => {
  const { roomId } = useParams(); 
  const navigate = useNavigate();
  const bottomRef = useRef(null); 
  
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [roomData, setRoomData] = useState({ topic: 'Memuat...', room_code: '', config: { format: 'Asian Parliamentary', max_rounds: 3 } });
  const [seats, setSeats] = useState([]); 
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]); 
  
  const [activeSpeaker, setActiveSpeaker] = useState(null); 
  const [currentRound, setCurrentRound] = useState(1);
  const currentRoundRef = useRef(1); 
  const [gameStatus, setGameStatus] = useState('WAITING'); 
  const [mySeat, setMySeat] = useState(null); 
  const [showOverlay, setShowOverlay] = useState(false);
  const [aiResult, setAiResult] = useState(null); 

  // Timer & Retry
  const [timerStatus, setTimerStatus] = useState('SPEAKING'); 
  const [readingTimeLeft, setReadingTimeLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [endTimeRef, setEndTimeRef] = useState(null); 
  const [isInfinite, setIsInfinite] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Voting & Fallacy
  const [voteStats, setVoteStats] = useState({ PRO: 0, CONTRA: 0 });
  const [myVote, setMyVote] = useState(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedArgId, setSelectedArgId] = useState(null);
  const [tagForm, setTagForm] = useState({ type: FALLACY_TYPES[0], desc: '' });

  // Others
  const [ghostText, setGhostText] = useState(''); 
  const [ghostRole, setGhostRole] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Animation
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useSpring(mouseX, { damping: 25, stiffness: 100 });
  const y = useSpring(mouseY, { damping: 25, stiffness: 100 });
  const x1 = useTransform(x, v => v * 0.5); const y1 = useTransform(y, v => v * 0.5);
  const x2 = useTransform(x, v => v * -0.5); const y2 = useTransform(y, v => v * -0.5);

  const currentFormat = roomData.config?.format || 'Asian Parliamentary';
  const currentRoles = DEBATE_FORMATS[currentFormat] || DEBATE_FORMATS['Asian Parliamentary'];
  
  // Logic Helper
  const getRoleName = (side, seatNum) => {
      if (!side || !currentRoles[side]) return 'Debater'; 
      if (currentFormat === '1 vs 1 (Duel)') return currentRoles[side][0] || 'Debater'; 
      return currentRoles[side][seatNum - 1] || 'Debater';
  };

  const isHost = user && roomData && user.id === roomData.host_user_id;
  const isDebater = mySeat !== null;
  const canRetryAnalysis = isHost || isDebater; 
  const maxRounds = parseInt(roomData.config?.max_rounds || 3);

  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);

  // --- MAIN EFFECT ---
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    
    socket = io(API_URL, {
      transports: ['polling', 'websocket'], // Paksa polling dulu baru websocket
      extraHeaders: {
        "ngrok-skip-browser-warning": "true" // <--- INI KUNCINYA SUPAYA SOCKET TEMBUS
      }
    });

    fetchRoomDetails();
    fetchParticipants();
    fetchArguments();
    fetchVotes();

    socket.on('connect', () => { });
    socket.on('update_seat_map', fetchParticipants);

    socket.on('receive_argument', (newMsg) => {
       const formattedMsg = {
         id: newMsg.id || Date.now(), role: newMsg.username, roleTitle: getRoleName(newMsg.side, 1), side: newMsg.side || 'PRO', 
         time: new Date(newMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         text: newMsg.message || newMsg.content, round: newMsg.round_number || 1, tags: [] 
       };
       setMessages(prev => [...prev, formattedMsg]);
       setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    socket.on('game_status_update', (data) => {
      setGameStatus(data.status);
      if (data.round) {
          if(parseInt(data.round) !== currentRoundRef.current) { setMyVote(null); fetchVotes(data.round); }
          setCurrentRound(data.round); 
      }
      if (data.status === 'ACTIVE' && data.activeSpeaker) {
        const seatNum = parseInt(data.activeSpeaker.seat);
        setActiveSpeaker(`${data.activeSpeaker.side}_${seatNum}`);
      } else if (data.status === 'FINISHED') {
        setActiveSpeaker(null); setIsTimerRunning(false); setShowOverlay(true);
      }
    });

    socket.on('timer_update', (data) => {
      if (data.status) setTimerStatus(data.status);
      if (data.status === 'READING') {
          setIsTimerRunning(false);
          setReadingTimeLeft(data.readingDuration || 5);
          if (readingInterval) clearInterval(readingInterval);
          readingInterval = setInterval(() => {
              setReadingTimeLeft(prev => { if (prev <= 1) { clearInterval(readingInterval); return 0; } return prev - 1; });
          }, 1000);
      } else if (data.status === 'WAITING_INPUT') {
          setIsTimerRunning(false); if (readingInterval) clearInterval(readingInterval); setTimeLeft(0);
      } else if (data.status === 'SPEAKING' || data.running) {
          if (readingInterval) clearInterval(readingInterval);
          setIsTimerRunning(true);
          if (data.endTime === null) { setIsInfinite(true); setEndTimeRef(null); } 
          else { setIsInfinite(false); setEndTimeRef(parseInt(data.endTime)); }
      } else { setIsTimerRunning(false); setTimeLeft(0); }
    });

    socket.on('opponent_typing', (data) => { setGhostRole(data.role); setGhostText(data.text); });
    
    // --- FIX LOGIC VOTING (RESTORED) ---
    socket.on('vote_update', (data) => { 
        if (parseInt(data.round) === currentRoundRef.current) { 
            const newStats = { PRO: 0, CONTRA: 0 };
            data.stats.forEach(s => {
                if(s.side === 'PRO') newStats.PRO = parseInt(s.count);
                if(s.side === 'CONTRA') newStats.CONTRA = parseInt(s.count);
            });
            setVoteStats(newStats);
        } 
    });
    
    socket.on('fallacy_added', (data) => {
        setMessages(prevMessages => 
            prevMessages.map(msg => {
                if (parseInt(msg.id) === parseInt(data.argument_id)) { return { ...msg, tags: [...(msg.tags || []), data.tag] }; }
                return msg;
            })
        );
        toast('Cacat logika terdeteksi!', { icon: '🚩' });
    });

    socket.on('analysis_started', () => { setIsAnalyzing(true); setAiResult(null); toast.loading("AI Juri sedang membaca transkrip debat...", { id: 'ai-loading' }); });
    socket.on('ai_result_published', (data) => { setIsAnalyzing(false); setAiResult(data.content); toast.dismiss('ai-loading'); toast.success("Analisis AI Selesai!"); });

    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        mouseX.set(e.clientX - innerWidth / 2); mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timerInterval) clearInterval(timerInterval);
      if (readingInterval) clearInterval(readingInterval);
      socket.disconnect();
      const token = localStorage.getItem('token');
      if (token && roomId) axios.post( `${API_URL}/rooms/leave`, { room_id: roomId }, { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } }).catch(() => {});
    };
  }, [roomId]); 

  useEffect(() => {
    if (isTimerRunning) {
      if (isInfinite) { setTimeLeft(999); if (timerInterval) clearInterval(timerInterval); } 
      else if (endTimeRef > 0) {
          timerInterval = setInterval(() => {
            const now = Date.now(); const diff = Math.ceil((endTimeRef - now) / 1000); 
            if (diff <= 0) { setTimeLeft(0); setIsTimerRunning(false); if (activeSpeaker) toast.error("WAKTU HABIS!"); } else { setTimeLeft(diff); }
          }, 1000);
      }
    } else { clearInterval(timerInterval); }
    return () => clearInterval(timerInterval);
  }, [isTimerRunning, endTimeRef, activeSpeaker, isInfinite]);

  // --- ACTIONS ---
  const fetchRoomDetails = async () => {
    try {
      const res = await axios.get(`${API_URL}/rooms/${roomId}`);
      const data = res.data;
      if (!data.config) data.config = { format: 'Asian Parliamentary', max_rounds: 3 };
      setRoomData(data);
      if (data.ai_verdict) setAiResult(data.ai_verdict);
      if(data.status) { setGameStatus(data.status); if(data.status === 'FINISHED') setShowOverlay(true); }
      if(socket && data.room_code) { socket.emit('join_room', data.room_code); socket.emit('sync_game_state', data.room_code); }
    } catch (err) { }
  };

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/rooms/${roomId}/participants`, { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } });
      setSeats(res.data);
      const myUser = JSON.parse(localStorage.getItem('user'));
      if(myUser) {
        const findMe = res.data.find(p => p.username === myUser.username);
        if (findMe) setMySeat({ side: findMe.side, seat: findMe.seat_number }); else setMySeat(null);
      }
    } catch (err) { }
  };

  const fetchArguments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/rooms/${roomId}/arguments`, { headers: { Authorization: `Bearer ${token}`,"ngrok-skip-browser-warning": "true" } });
      const formatted = res.data.map(arg => ({
         id: arg.id, role: arg.username, roleTitle: getRoleName(arg.side, 1), side: arg.side || 'PRO', 
         time: new Date(arg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
         text: arg.content, round: arg.round_number || 1, tags: arg.fallacy_tags || [] 
      }));
      setMessages(formatted);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 500);
    } catch (err) {}
  };

  // --- FIX LOGIC FETCH VOTE (RESTORED) ---
  const fetchVotes = async (specificRound = null) => {
      try {
          const targetRound = specificRound || currentRoundRef.current; 
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/rooms/${roomId}/votes`, { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } });
          const currentRoundVotes = res.data.filter(v => parseInt(v.round_number) === parseInt(targetRound));
          const newStats = { PRO: 0, CONTRA: 0 };
          currentRoundVotes.forEach(v => {
              if(v.side === 'PRO') newStats.PRO = parseInt(v.count);
              if(v.side === 'CONTRA') newStats.CONTRA = parseInt(v.count);
          });
          setVoteStats(newStats);
      } catch (err) { }
  }

  const isMyTurn = () => {
      if (!activeSpeaker || !mySeat) return false;
      const [activeSide, activeSeatStr] = activeSpeaker.split('_');
      return activeSide === mySeat.side && parseInt(activeSeatStr) === parseInt(mySeat.seat);
  };
  const getSitter = (side, seatNum) => seats.find(s => s.side === side && s.seat_number === seatNum);
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const handleClaimSeat = async (side, seatNum) => {
    if(gameStatus === 'FINISHED') return;
    try {
      const token = localStorage.getItem('token');
      if(!roomData.room_code) return;
      await axios.post(`${API_URL}/rooms/claim-seat`, { room_id: roomId, side, seat_number: seatNum, room_code: roomData.room_code }, { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } });
      fetchParticipants(); 
    } catch (err) { toast.error(err.response?.data?.msg || "Gagal duduk"); }
  };

  const handleSend = () => {
    if(!inputText.trim()) return;
    const msgData = { room_id: roomId, user_id: user.id, message: inputText, side: mySeat.side, room_code: roomData.room_code, username: user.username, round_number: currentRound };
    socket.emit('send_argument', msgData);
    setInputText(''); 
    if(roomData.room_code) socket.emit('typing_text', { roomCode: roomData.room_code, text: '', role: user?.username });
  };

  const handleTyping = (e) => {
     setInputText(e.target.value);
     if(roomData.room_code) {
         socket.emit('typing_text', { roomCode: roomData.room_code, text: e.target.value, role: user?.username });
         if (!isTimerRunning && isMyTurn() && (timerStatus === 'READING' || timerStatus === 'WAITING_INPUT')) {
             socket.emit('trigger_timer', { room_code: roomData.room_code });
         }
     }
  };

  const handleStartGame = () => { if(roomData.room_code) socket.emit('start_game', { room_code: roomData.room_code }); };
  const handleNextTurn = () => { if(!activeSpeaker) return; const [s, seat] = activeSpeaker.split('_'); socket.emit('next_turn', { room_code: roomData.room_code, currentSide: s, currentSeat: parseInt(seat) }); };
  
  const handleStartAIAnalysis = () => {
      if (retryCount >= 1) { toast.error("Batas analisis ulang habis."); return; }
      if(roomData.room_code) { setRetryCount(prev => prev + 1); socket.emit('start_analysis', { room_code: roomData.room_code }); }
  };

  const handleCastVote = (side) => {
      setMyVote(side);
      if(roomData.room_code && user) {
          socket.emit('cast_vote', { room_id: roomId, user_id: user.id, round_number: currentRound, side: side, room_code: roomData.room_code });
          toast.success(`Dukungan ke ${side} terkirim!`, { icon: '🗳️', position: 'bottom-center' });
      }
  };

  const handleOpenTagModal = (msgId) => { setSelectedArgId(msgId); setTagForm({ type: FALLACY_TYPES[0], desc: '' }); setTagModalOpen(true); }
  const handleSubmitTag = () => {
      if (!tagForm.desc.trim()) { toast.error("Berikan penjelasan singkat."); return; }
      if(roomData.room_code && user) {
          socket.emit('tag_fallacy', { argument_id: selectedArgId, user_id: user.id, fallacy_type: tagForm.type, description: tagForm.desc, room_code: roomData.room_code, username: user.username });
          setTagModalOpen(false);
      }
  }

  // --- STATE TAMBAHAN (Letakkan di dalam component RoomPage, di atas return) ---
  const [mobileExpand, setMobileExpand] = useState(false); 
  const [showTopicMobile, setShowTopicMobile] = useState(false); // State untuk popup topik

  // --- LOGIC HELPER BARU ---
  const getNextSpeaker = () => {
      if (!activeSpeaker) return { side: 'PRO', seat: 1 };
      const [side, seatStr] = activeSpeaker.split('_');
      const seat = parseInt(seatStr);
      // Logika Zig-Zag sederhana (Pro 1 -> Contra 1 -> Pro 2...)
      if (side === 'PRO') return { side: 'CONTRA', seat: seat };
      return { side: 'PRO', seat: seat + 1 };
  };

  // --- RENDER HELPERS ---
  const totalVotes = voteStats.PRO + voteStats.CONTRA;
  const proPercent = totalVotes === 0 ? 50 : Math.round((voteStats.PRO / totalVotes) * 100);
  const contraPercent = totalVotes === 0 ? 50 : 100 - proPercent;

  const renderTimerDisplay = () => {
      // Style Base (Responsive Text)
      const baseClass = "px-2 md:px-4 py-1 rounded-lg flex items-center gap-1.5 self-end md:gap-2 border transition-all";
      
      if (timerStatus === 'READING') {
          return (
              <div className={`${baseClass} border-yellow-500/50 bg-yellow-500/10 animate-pulse`}>
                  <BookOpen className="text-yellow-400" size={12} />
                  <span className="text-sm md:text-lg font-black font-mono text-yellow-400">{readingTimeLeft}s</span>
              </div>
          );
      } else if (timerStatus === 'WAITING_INPUT') {
          return (
              <div className={`${baseClass} border-blue-500/50 bg-blue-500/10 animate-pulse`}>
                  <Keyboard className="text-blue-400" size={12} />
                  <span className="text-[9px] md:text-xs font-bold text-blue-400 tracking-wider whitespace-nowrap">MENUNGGU...</span>
              </div>
          );
      } else {
          return (
            <div className={`${baseClass} shadow-[0_0_15px_rgba(0,0,0,0.5)] ${timeLeft===0 && activeSpeaker && !isInfinite ? 'bg-red-600 border-red-500' : 'bg-black border-white/10'}`}>
                {isInfinite ? <Infinity className="text-blue-400 animate-pulse" size={14} /> : <Clock className={`${timeLeft < 60 && isTimerRunning ? 'text-red-400' : 'text-pro'} animate-pulse`} size={12} />}
                <span className={`text-sm md:text-lg font-black font-mono tracking-widest text-white`}>{isInfinite ? "∞" : (timeLeft === 0 && activeSpeaker ? "HABIS" : formatTime(timeLeft))}</span>
            </div>
          );
      }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-dark-bg via-black to-dark-bg text-gray-200 flex flex-col font-sans overflow-hidden relative">
      <Toaster position="top-center" />
      <motion.div style={{ x: x1, y: y1 }} className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pro/10 rounded-full blur-[120px] pointer-events-none" />
      <motion.div style={{ x: x2, y: y2 }} className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-contra/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* HEADER (NAVBAR KOMPAK) */}
      <header className="h-14 md:h-16 shrink-0 border-b border-white/10 bg-[#121212]/95 backdrop-blur-md flex items-center justify-between px-3 md:px-6 z-50 relative">
        
        {/* KIRI: Back & Room Code */}
        <div className="flex items-center gap-2 md:gap-3 w-1/4 md:w-1/3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors shrink-0">
             <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col justify-center min-w-0">
             <span className="text-[10px] text-pro font-bold tracking-widest uppercase bg-pro/10 px-1.5 py-0.5 rounded border border-pro/20 w-fit whitespace-nowrap">ROOM {roomData.room_code}</span>
          </div>
        </div>
        
        {/* TENGAH: TIMER (Back to Navbar) */}
        <div className="flex flex-col items-center justify-center w-2/4 md:w-1/3">
           {renderTimerDisplay()}
           {activeSpeaker && timerStatus === 'SPEAKING' && (
             <span className="text-[8px] md:text-[9px] font-bold text-green-400 tracking-widest flex items-center gap-1 mt-0.5 truncate max-w-[120px]">
               <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse shrink-0"></span>
               {activeSpeaker.replace('_', ' ')}
             </span>
           )}
        </div>

        {/* KANAN: Topic Toggle & User */}
        <div className="flex items-center gap-2 md:gap-3 w-1/4 md:w-1/3 justify-end">
           {/* Tombol Info Mosi (Mobile Toggle) */}
           <button 
                onClick={() => setShowTopicMobile(!showTopicMobile)} 
                className={`p-1.5 rounded-lg border transition-all ${showTopicMobile ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}
           >
               <Info size={16} />
           </button>
           
           <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center shrink-0">
               <Users size={14} />
           </div>
        </div>

        {/* POPUP MOSI (Muncul jika tombol Info diklik) */}
        <AnimatePresence>
            {showTopicMobile && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-4 right-4 mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl z-[60]"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-pro uppercase tracking-widest bg-pro/10 px-2 py-1 rounded">Topik Debat</span>
                        <button onClick={() => setShowTopicMobile(false)}><X size={14} className="text-gray-500" /></button>
                    </div>
                    <p className="text-white text-sm font-medium leading-relaxed">{roomData.topic}</p>
                </motion.div>
            )}
        </AnimatePresence>
      </header>

      {/* CONTENT */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT SIDEBAR (DESKTOP ONLY) */}
        <div className="hidden lg:flex w-64 bg-black/20 border-r border-white/5 flex-col p-3 overflow-y-auto shrink-0">
           <div className="mb-4 flex items-center gap-2 text-pro border-b border-white/5 pb-2"><Shield size={16} /><h2 className="font-black text-xs uppercase tracking-wider">Government</h2></div>
           <div className="space-y-3">
              {currentRoles.PRO.map((role, idx) => {
                 const seatNum = idx + 1; const sitter = getSitter('PRO', seatNum);
                 let isActive = activeSpeaker && activeSpeaker.startsWith('PRO') && parseInt(activeSpeaker.split('_')[1]) === seatNum;
                 return (
                   <div key={idx} onClick={() => handleClaimSeat('PRO', seatNum)} className={`p-3 rounded-lg border text-xs transition-all cursor-pointer ${isActive ? 'ring-1 ring-green-500 bg-pro/10' : ''} ${sitter ? 'border-pro/30' : 'bg-white/5 border-white/5 text-gray-500 hover:border-pro'}`}>
                      <p className="font-bold uppercase mb-1 text-pro">{role}</p>
                      {sitter ? <span className="font-bold text-white">{sitter.username}</span> : <span className="italic opacity-50">Kosong</span>}
                   </div>
                 );
              })}
           </div>
        </div>

        {/* CENTER FEED */}
        <div className="flex-1 flex flex-col relative bg-transparent min-w-0">
           
           {/* VOTING BAR */}
           {(gameStatus === 'ACTIVE' || gameStatus === 'FINISHED') && (
               <div className="shrink-0 bg-black/20 backdrop-blur-md border-y border-white/5 px-4 py-2 z-30 shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-2">
                   <div className="max-w-3xl mx-auto flex items-center gap-3">
                       <button onClick={() => handleCastVote('PRO')} disabled={myVote === 'PRO'} className={`p-1.5 md:p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold ${myVote === 'PRO' ? 'bg-pro text-black ring-2 ring-white' : 'bg-white/5 text-gray-400 hover:text-pro hover:bg-white/10'}`}><ThumbsUp size={14} /> <span className="hidden sm:inline">VOTE</span></button>
                       <div className="flex-1 h-2 md:h-3 bg-white/5 border border-white/10 rounded-full overflow-hidden relative flex">
                           <div style={{ width: `${proPercent}%` }} className="h-full bg-gradient-to-r from-teal-600 to-pro transition-all duration-700 ease-in-out relative group"></div>
                           <div style={{ width: `${contraPercent}%` }} className="h-full bg-gradient-to-l from-orange-600 to-contra transition-all duration-700 ease-in-out relative group"></div>
                       </div>
                       <button onClick={() => handleCastVote('CONTRA')} disabled={myVote === 'CONTRA'} className={`p-1.5 md:p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold ${myVote === 'CONTRA' ? 'bg-contra text-white ring-2 ring-white' : 'bg-white/5 text-gray-400 hover:text-contra hover:bg-white/10'}`}><span className="hidden sm:inline">VOTE</span><ThumbsDown size={14} /> </button>
                   </div>
               </div>
           )}

           <AnimatePresence>
             {gameStatus === 'FINISHED' && showOverlay && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#121212] border border-white/20 p-8 rounded-3xl shadow-2xl max-w-md w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                     <button onClick={() => setShowOverlay(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                     <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-6 border border-blue-500/50"><CheckCircle size={32} /></div>
                     <h2 className="text-3xl font-black text-white mb-2">DEBAT SELESAI</h2>
                     <p className="text-gray-400 text-sm mb-8">Debat berakhir. Analisis AI sedang diproses...</p>
                     
                     {isAnalyzing && (
                        <div className="w-full py-4 bg-white/5 border border-blue-500/30 rounded-xl flex flex-col items-center justify-center gap-2 animate-pulse">
                           <div className="flex items-center gap-2 text-blue-400 font-bold"><span className="animate-spin">⏳</span>AI MENGANALISIS...</div>
                           <p className="text-[10px] text-gray-500">Membaca argumen & menentukan pemenang</p>
                        </div>
                     )}

                     {!isAnalyzing && aiResult && (
                        <div className="space-y-4">
                            <button onClick={() => setShowOverlay(false)} className="w-full py-4 bg-gray-800 rounded-xl font-bold text-white hover:bg-gray-700 transition-all border border-white/10 animate-bounce">LIHAT HASIL</button>
                            {canRetryAnalysis && retryCount < 1 && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartAIAnalysis(); }} className="relative z-50 flex items-center justify-center gap-2 w-full py-3 mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all border border-red-500/20 cursor-pointer shadow-lg hover:shadow-red-500/10">
                                    <RefreshCw size={14} /> Analisis Ulang (Sisa: {1 - retryCount})
                                </button>
                            )}
                            {canRetryAnalysis && retryCount >= 1 && ( <div className="mt-2 text-[10px] text-gray-600 italic">Batas analisis ulang tercapai.</div> )}
                        </div>
                     )}

                     {!isAnalyzing && !aiResult && (
                        <div className="w-full py-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-2">
                           <span className="animate-bounce text-2xl">🤖</span>
                           <p className="text-xs text-gray-400 italic">Menunggu hasil otomatis...</p>
                           {canRetryAnalysis && (<button onClick={handleStartAIAnalysis} className="text-[10px] text-blue-400 underline hover:text-blue-300">Paksa Mulai Analisis</button>)}
                        </div>
                     )}
                  </motion.div>
               </motion.div>
             )}
           </AnimatePresence>

           <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-8 space-y-4 md:space-y-6 custom-scrollbar pb-32 md:pb-8">
              {messages.length === 0 && <div className="text-center opacity-30 mt-20"><Users size={48} className="mx-auto mb-4"/><p>Debat belum dimulai.</p></div>}

              {messages.map((msg, idx) => (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col max-w-full items-start group">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[9px] md:text-[10px] font-bold px-2 rounded border ${msg.side === 'PRO' ? 'text-pro border-pro/20' : 'text-contra border-contra/20'}`}>{msg.side}</span>
                    <span className="text-[10px] md:text-xs font-bold text-gray-300">{msg.role}</span>
                    <span className="text-[9px] md:text-[10px] text-gray-500 border-l border-white/10 pl-2 ml-1">{msg.roleTitle} • R{msg.round} • {msg.time}</span>
                    <button onClick={() => handleOpenTagModal(msg.id)} className="ml-auto opacity-50 md:opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400"><Flag size={12} /></button>
                  </div>
                  <div className={`max-w-full md:max-w-[95%] pl-3 md:pl-4 py-1.5 md:py-2 border-l-2 break-words text-left ${msg.side === 'PRO' ? 'border-pro' : 'border-contra'}`}>
                    <div className="prose prose-invert prose-sm break-words whitespace-pre-wrap leading-relaxed"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown></div>
                    {msg.tags && msg.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {msg.tags.map((tag, tIdx) => (
                                <div key={tIdx} className="bg-red-500/10 border border-red-500/30 text-red-300 px-2 py-1 rounded text-[9px] md:text-[10px] flex items-center gap-1"><AlertOctagon size={10} /> <span className="font-bold">{tag.type}</span></div>
                            ))}
                        </div>
                    )}
                  </div>
                </div>
              ))}
              
              {aiResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 border-t-2 border-dashed border-blue-500/30 pt-8 pb-12">
                   <div className="flex items-center gap-3 mb-4 justify-center"><Sparkles className="text-yellow-400" /><h3 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">SYSTEM REPORT: AI JUDGE</h3></div>
                   <div className="bg-[#151922] border border-blue-500/30 rounded-2xl p-4 md:p-8 max-w-3xl mx-auto overflow-hidden"><div className="prose prose-invert prose-blue max-w-none text-sm md:text-base"><ReactMarkdown>{aiResult}</ReactMarkdown></div></div>
                </motion.div>
              )}

              {ghostText && (
                <div className={`flex flex-col opacity-60 items-start`}>
                   <span className="text-[10px] text-contra font-bold animate-pulse">LAWAN MENGETIK...</span>
                   <div className="text-gray-400 italic text-sm border-r-2 border-contra pr-2 break-words max-w-[80%] whitespace-pre-wrap">{ghostText}</div>
                </div>
              )}
              <div ref={bottomRef} />
           </div>

           {/* INPUT AREA WRAPPER */}
           <div className="bg-[#121212] border-t border-white/10 shrink-0 z-40 relative p-0 md:p-4">
               
               {/* 1. MOBILE SEAT STRIP (Compact & Expandable) */}
               <div className="lg:hidden w-full bg-black/40 backdrop-blur border-b border-white/5 p-2 transition-all">
                  {!mobileExpand ? (
                      <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* CURRENT SPEAKER */}
                              {activeSpeaker ? (
                                  <div className={`flex items-center gap-2 p-1.5 px-3 rounded-lg border flex-1 min-w-0 ${activeSpeaker.startsWith('PRO') ? 'bg-pro/10 border-pro/30' : 'bg-contra/10 border-contra/30'}`}>
                                      <div className={`w-2 h-2 rounded-full animate-pulse ${activeSpeaker.startsWith('PRO') ? 'bg-pro' : 'bg-contra'}`}></div>
                                      <div className="truncate">
                                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">SEKARANG</div>
                                          <div className="text-[10px] font-bold text-white truncate">{getRoleName(activeSpeaker.split('_')[0], parseInt(activeSpeaker.split('_')[1]))}</div>
                                      </div>
                                  </div>
                              ) : ( <div className="text-[10px] text-gray-500 italic p-2">Menunggu mulai...</div> )}

                              <ArrowLeft size={12} className="rotate-180 text-gray-600 shrink-0" />

                              {/* NEXT SPEAKER */}
                              <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg border border-white/5 bg-white/5 flex-1 min-w-0 opacity-60">
                                  {(() => {
                                      const next = getNextSpeaker();
                                      return (
                                          <div className="truncate">
                                              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">NEXT</div>
                                              <div className="text-[10px] font-bold text-gray-300 truncate">{getRoleName(next.side, next.seat)}</div>
                                          </div>
                                      );
                                  })()}
                              </div>
                          </div>
                          <button onClick={() => setMobileExpand(true)} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 shrink-0"><Users size={16} /></button>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-white">Daftar Kursi</span>
                              <button onClick={() => setMobileExpand(false)} className="p-1 bg-white/10 rounded text-gray-400"><X size={14}/></button>
                          </div>
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                              <div className="flex gap-1.5 shrink-0">
                                  {currentRoles.PRO.map((role, idx) => {
                                      const seatNum = idx + 1; const sitter = getSitter('PRO', seatNum);
                                      const isActive = activeSpeaker === `PRO_${seatNum}`;
                                      return (
                                          <div key={idx} onClick={() => {handleClaimSeat('PRO', seatNum); setMobileExpand(false);}} className={`w-24 p-2 rounded border text-[9px] cursor-pointer flex-shrink-0 ${isActive ? 'bg-pro/20 border-pro' : 'bg-white/5 border-white/10'}`}>
                                              <div className="font-bold text-pro truncate mb-0.5">{role}</div>
                                              <div className="text-white truncate">{sitter ? sitter.username : 'Kosong'}</div>
                                          </div>
                                      )
                                  })}
                              </div>
                              <div className="w-[1px] bg-white/10 shrink-0"></div>
                              <div className="flex gap-1.5 shrink-0">
                                  {currentRoles.CONTRA.map((role, idx) => {
                                      const seatNum = idx + 1; const sitter = getSitter('CONTRA', seatNum);
                                      const isActive = activeSpeaker === `CONTRA_${seatNum}`;
                                      return (
                                          <div key={idx} onClick={() => {handleClaimSeat('CONTRA', seatNum); setMobileExpand(false);}} className={`w-24 p-2 rounded border text-[9px] cursor-pointer flex-shrink-0 ${isActive ? 'bg-contra/20 border-contra' : 'bg-white/5 border-white/10'}`}>
                                              <div className="font-bold text-contra truncate mb-0.5">{role}</div>
                                              <div className="text-white truncate">{sitter ? sitter.username : 'Kosong'}</div>
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                      </div>
                  )}
               </div>

               {isMyTurn() && gameStatus !== 'FINISHED' && (
                 <div className={`mx-2 md:mx-auto max-w-4xl flex items-end gap-2 md:gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pl-3 md:pl-4 transition-all duration-300 ${timeLeft===0 && !isInfinite ? 'ring-1 ring-red-500 bg-red-900/10' : ''} mt-2 md:mt-0`}>
                    <div className="mb-4 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse shrink-0"></div>
                    <TextareaAutosize 
                        minRows={1} maxRows={6} value={inputText} onChange={handleTyping} autoFocus
                        placeholder={timerStatus === 'READING' ? "Tunggu..." : "Ketik argumen..."} 
                        className="bg-transparent border-none text-white w-full focus:ring-0 text-sm md:text-base py-2 md:py-3 resize-y min-h-[40px] md:min-h-[50px] max-h-[30vh]" 
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} 
                    />
                    <button onClick={handleSend} className="mb-1 bg-pro text-black p-2 rounded-xl hover:bg-teal-400 transition-colors"><Send size={16} /></button>
                    <button onClick={handleNextTurn} className={`mb-1 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 px-3 rounded-xl text-[10px] md:text-xs font-bold h-10`}>SELESAI</button>
                 </div>
               )}
               
               {!isMyTurn() && gameStatus !== 'FINISHED' && ( <div className="p-4 text-center text-[10px] md:text-xs text-gray-500 uppercase tracking-widest">{gameStatus === 'ACTIVE' ? `Menunggu giliran lawan...` : 'Menunggu Host memulai debat'}</div> )}
               
               {gameStatus === 'WAITING' && (
                 <div className="absolute bottom-24 right-4 md:right-8 z-50 flex flex-col items-end gap-2 pointer-events-auto">
                   {isHost ? (
                     <button onClick={handleStartGame} className="bg-pro hover:bg-teal-400 text-black font-bold px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg border-2 border-black flex items-center gap-2 text-sm md:text-base"><Play size={18} fill="black" /> MULAI DEBAT</button>
                   ) : (
                     <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-xs text-gray-400 italic">Menunggu Host...</div>
                   )}
                 </div>
               )}
           </div>
        </div>

        {/* RIGHT SIDEBAR (DESKTOP ONLY) */}
        <div className="hidden lg:flex w-64 bg-black/20 border-l border-white/5 flex-col p-3 overflow-y-auto shrink-0">
           <div className="mb-4 flex items-center justify-end gap-2 text-contra border-b border-white/5 pb-2"><h2 className="font-black text-xs uppercase tracking-wider">Opposition</h2><AlertTriangle size={16} /></div>
           <div className="space-y-3">
              {currentRoles.CONTRA.map((role, idx) => {
                 const seatNum = idx + 1; const sitter = getSitter('CONTRA', seatNum);
                 let isActive = activeSpeaker && activeSpeaker.startsWith('CONTRA') && parseInt(activeSpeaker.split('_')[1]) === seatNum;
                 return (
                   <div key={idx} onClick={() => handleClaimSeat('CONTRA', seatNum)} className={`p-3 rounded-lg border text-xs text-right cursor-pointer transition-all ${isActive ? 'ring-1 ring-orange-500 bg-contra/10' : ''} ${sitter ? 'border-contra/30' : 'bg-white/5 border-white/5 text-gray-500 hover:border-contra'}`}>
                      <p className="font-bold uppercase mb-1 text-contra">{role}</p>
                      {sitter ? <span className="font-bold text-white">{sitter.username}</span> : <span className="italic opacity-50">Kosong</span>}
                   </div>
                 );
              })}
           </div>
        </div>

      </div>

      {/* MODAL TAG FALLACY */}
      <AnimatePresence>
        {tagModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTagModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl">
                    <button onClick={() => setTagModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
                    <div className="flex items-center gap-3 mb-6 text-red-400">
                        <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20"><AlertOctagon size={24} /></div>
                        <h3 className="text-xl font-bold text-white">Laporkan Cacat Logika</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Jenis Fallacy</label>
                            <select value={tagForm.type} onChange={(e) => setTagForm({...tagForm, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 focus:outline-none appearance-none text-sm">
                                {FALLACY_TYPES.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Penjelasan Singkat</label>
                            <textarea value={tagForm.desc} onChange={(e) => setTagForm({...tagForm, desc: e.target.value})} placeholder="Kenapa ini sesat pikir?" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 focus:outline-none text-sm min-h-[100px]" />
                        </div>
                        <button onClick={handleSubmitTag} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white transition-colors">TANDAI SEBAGAI FALLACY</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RoomPage;