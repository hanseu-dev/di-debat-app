import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
// PERBAIKAN: Menambahkan X, Minus, Shield, AlertTriangle, User ke dalam import
import { ArrowLeft, Plus, Users, ArrowRight, Globe, Hash, Clock, Mic2, X, Minus, Shield, AlertTriangle, User } from 'lucide-react'; 
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_URL } from '../config';

const MotionPage = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [motionData, setMotionData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal Create Room
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    format: 'Asian Parliamentary',
    is_public: true,
    max_rounds: 3, 
    speech_duration: 0,
    allow_spectator_join: false
  });

  // --- BACKGROUND ENGINE ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 100 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);
  const x1 = useTransform(x, v => v * 0.5); const y1 = useTransform(y, v => v * 0.5);
  const x2 = useTransform(x, v => v * -0.5); const y2 = useTransform(y, v => v * -0.5);

  useEffect(() => {
    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        mouseX.set(e.clientX - innerWidth / 2);
        mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    fetchMotionDetails();
    return () => window.removeEventListener("mousemove", handleMouseMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchMotionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/motions/${id}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setMotionData(res.data.motion);
      setRooms(res.data.rooms);
      setLoading(false);
    } catch (err) {
      toast.error("Gagal memuat data mosi");
      navigate('/dashboard');
    }
  };

  const handleStepper = (field, type, min, max) => {
    setNewRoom(prev => {
      const currentVal = parseInt(prev[field]);
      let newVal = type === 'inc' ? currentVal + 1 : currentVal - 1;
      if (newVal < min) newVal = min;
      if (newVal > max) newVal = max;
      return { ...prev, [field]: newVal };
    });
  };

  const createRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/rooms/create`, 
        { 
            motion_id: id, 
            config: { format: newRoom.format }, 
            is_public: newRoom.is_public,
            max_rounds: newRoom.max_rounds,
            speech_duration: parseInt(newRoom.speech_duration) * 60,
            allow_spectator_join: newRoom.allow_spectator_join 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Room berhasil dibuat!");
      setShowCreateModal(false);
      navigate(`/room/${res.data.room_id}`); 
    } catch (err) {
      toast.error("Gagal membuat room.");
    }
  };

  if (loading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-mono animate-pulse">MEMUAT ARENA...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a] text-gray-200 font-sans p-6 md:p-12 relative overflow-hidden">
      <Toaster position="top-center" />

      {/* BACKGROUND ANIMATION */}
      <motion.div style={{ x: x1, y: y1 }} className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pro/20 rounded-full blur-[120px] pointer-events-none" />
      <motion.div style={{ x: x2, y: y2 }} className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-contra/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-xs font-bold uppercase tracking-wider group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Mosi Trending
            </button>
            
            <div className="bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-pro/10 rounded-full blur-[60px] pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-black bg-pro font-black tracking-widest text-[10px] uppercase px-2 py-1 rounded">TOPIC #{motionData.id}</span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={12}/> {new Date(motionData.created_at).toLocaleDateString()}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight max-w-4xl">{motionData.topic}</h1>
                            <p className="text-gray-400 max-w-3xl text-sm leading-relaxed border-l-2 border-white/10 pl-4">{motionData.description || "Tidak ada deskripsi tambahan."}</p>
                        </div>
                        <div className="text-right hidden md:block shrink-0">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Creator</div>
                            <div className="font-bold text-white text-lg">{motionData.creator_name}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* ROOM LIST HEADER */}
        <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe size={20} className="text-blue-400"/> Ruang Debat Aktif
            </h3>
            <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-pro to-teal-600 text-black px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-pro/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                <Plus size={18} /> BUAT RUANG BARU
            </button>
        </div>

        {/* ROOM LIST GRID */}
        {rooms.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                    <Hash size={32} />
                </div>
                <p className="text-gray-400 font-medium">Belum ada perdebatan di mosi ini.</p>
                <button onClick={() => setShowCreateModal(true)} className="text-pro text-sm font-bold mt-2 hover:underline">Jadilah yang pertama membuka arena!</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rooms.map(room => (
                    <motion.div 
                        key={room.id} 
                        whileHover={{ y: -5 }} 
                        onClick={() => navigate(`/room/${room.id}`)} 
                        className="bg-[#121212]/80 backdrop-blur border border-white/10 rounded-2xl p-5 hover:border-blue-400/50 transition-all cursor-pointer group flex flex-col justify-between h-full"
                    >
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${room.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                        {room.status === 'WAITING' ? 'MENUNGGU' : room.status === 'ACTIVE' ? '🔴 LIVE' : 'SELESAI'}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-500">#{room.room_code}</span>
                                </div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase">HOST: {room.host_name}</div>
                            </div>
                            
                            {/* DAFTAR DEBATER */}
                            <div className="mb-4">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Mic2 size={10} /> Sedang Bertanding
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {room.debaters && room.debaters.length > 0 ? (
                                        room.debaters.map((debater, idx) => (
                                            <span key={idx} className="bg-white/10 text-white text-xs px-2 py-1 rounded-md font-bold truncate max-w-[100px]">
                                                {debater}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-gray-600 text-xs italic">Menunggu Debater...</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex justify-between items-center mt-auto">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{room.config?.format?.split(' ')[0]}</span>
                                <span className="flex items-center gap-1" title="Total Orang di Room"><Users size={12}/> {room.participant_count}</span>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-black transition-all">
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </div>

      {/* MODAL CREATE ROOM (STEPPER) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#1a1a1a] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl relative z-10 overflow-hidden">
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Plus size={18} className="text-pro"/> Buat Ruang Debat</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                
                {/* PILIHAN FORMAT */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Format Debat</label>
                    <select value={newRoom.format} onChange={(e) => setNewRoom({...newRoom, format: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-pro focus:outline-none appearance-none text-sm">
                      <option>Asian Parliamentary</option>
                      <option>British Parliamentary</option>
                      <option>1 vs 1 (Duel)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* STEPPER: JML RONDE (1v1 ONLY) */}
                  {newRoom.format === '1 vs 1 (Duel)' && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Jml. Ronde</label>
                      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
                         <button onClick={() => handleStepper('max_rounds', 'dec', 1, 10)} className="p-2 hover:bg-white/10 rounded-lg text-pro/80 transition-colors"><Minus size={16}/></button>
                         <span className="flex-1 text-center text-white font-mono font-bold text-sm">{newRoom.max_rounds}</span>
                         <button onClick={() => handleStepper('max_rounds', 'inc', 1, 10)} className="p-2 hover:bg-white/10 rounded-lg text-pro/80 transition-colors"><Plus size={16}/></button>
                      </div>
                    </div>
                  )}
                  
                  {/* STEPPER: DURASI WAKTU */}
                  <div className={newRoom.format === '1 vs 1 (Duel)' ? 'col-span-1' : 'col-span-2'}>
                      <div className="flex justify-between mb-2">
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu Bicara</label>
                         <span className={`text-[10px] font-bold ${newRoom.speech_duration === 0 ? 'text-blue-400' : 'text-pro'}`}>
                            {newRoom.speech_duration === 0 ? '∞ TANPA BATAS' : `${newRoom.speech_duration} MENIT`}
                         </span>
                      </div>
                      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
                         <button onClick={() => handleStepper('speech_duration', 'dec', 0, 60)} className="p-2 hover:bg-white/10 rounded-lg text-pro/80 transition-colors"><Minus size={16}/></button>
                         <div className="flex-1 text-center">
                            {newRoom.speech_duration === 0 ? <span className="text-blue-400 font-black text-lg">∞</span> : <span className="text-white font-mono font-bold text-lg">{newRoom.speech_duration}</span>}
                         </div>
                         <button onClick={() => handleStepper('speech_duration', 'inc', 0, 60)} className="p-2 hover:bg-white/10 rounded-lg text-pro/80 transition-colors"><Plus size={16}/></button>
                      </div>
                  </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Akses</label>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mb-4">
                      <button onClick={() => setNewRoom({...newRoom, is_public: true})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newRoom.is_public ? 'bg-pro text-black' : 'text-gray-500'}`}>PUBLIK</button>
                      <button onClick={() => setNewRoom({...newRoom, is_public: false})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!newRoom.is_public ? 'bg-pro text-black' : 'text-gray-500'}`}>PRIVAT</button>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                        <input type="checkbox" id="allowJoin" checked={newRoom.allow_spectator_join} onChange={(e) => setNewRoom({...newRoom, allow_spectator_join: e.target.checked})} className="w-5 h-5 rounded bg-black border-white/20 text-pro focus:ring-0 cursor-pointer" />
                        <label htmlFor="allowJoin" className="text-sm text-gray-300 cursor-pointer select-none">
                           <span className="block font-bold text-white text-xs">Izinkan Late Join</span>
                           <span className="text-[10px] text-gray-500">Penonton boleh mengisi kursi kosong saat debat berlangsung.</span>
                        </label>
                    </div>
                </div>

                <button onClick={createRoom} className="w-full py-4 bg-gradient-to-r from-pro to-teal-600 rounded-xl font-bold text-black shadow-lg hover:shadow-pro/20 hover:scale-[1.02] active:scale-[0.98] transition-all">BUAT RUANGAN</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MotionPage;