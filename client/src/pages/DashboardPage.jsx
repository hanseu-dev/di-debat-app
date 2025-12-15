import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Radio, Play, Plus, X, ArrowRight, MessageSquare, Globe, User, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_URL } from '../config';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // State Motions (Default Array Kosong biar aman)
  const [motions, setMotions] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  // State Form Create Motion
  const [newMotion, setNewMotion] = useState({
    topic: '',
    description: ''
  });

  // Background Engine
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useSpring(mouseX, { damping: 25, stiffness: 100 });
  const y = useSpring(mouseY, { damping: 25, stiffness: 100 });
  const x1 = useTransform(x, v => v * 0.5); const y1 = useTransform(y, v => v * 0.5);
  const x2 = useTransform(x, v => v * -0.5); const y2 = useTransform(y, v => v * -0.5);

  // --- FUNGSI-FUNGSI ---

  const fetchMotions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${API_URL}/motions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // SAFETY CHECK: Pastikan data yang masuk adalah Array
      if (Array.isArray(res.data)) {
        setMotions(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setMotions(res.data.data);
      } else {
        setMotions([]); 
      }
    } catch (err) {
      console.error("Gagal load mosi", err);
      // Jangan setMotions null, biarkan array kosong
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Berhasil Logout");
    navigate('/login');
  };

  const createMotion = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Validasi
      if (!newMotion.topic.trim()) {
          toast.error("Topik mosi wajib diisi!");
          return;
      }

      // PERBAIKAN 1: Simpan hasil axios ke variabel 'res'
      const res = await axios.post(`${API_URL}/motions`, {
            // PERBAIKAN 2: Ambil string topic dari object newMotion
            topic: newMotion.topic, 
            description: newMotion.description
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
      
      toast.success("Mosi berhasil dibuat!");
      setShowCreateModal(false);
      
      // Reset Form
      setNewMotion({ topic: '', description: '' });
      
      // Refresh Data Mosi
      fetchMotions();

      // Opsional: Langsung masuk ke detail motion (pastikan struktur res benar)
      if(res.data && res.data.motion && res.data.motion.id) {
          navigate(`/motion/${res.data.motion.id}`);
      }
      
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat mosi.");
    }
  };

  const joinRoom = async () => {
    if(!joinCode) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/rooms/join`, 
        { room_code: joinCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Masuk ke Arena ${joinCode}`);
      navigate(`/room/${res.data.room_id}`);
    } catch (err) {
      console.error(err);
      toast.error("Room tidak ditemukan!");
    }
  };

  // --- USE EFFECT UTAMA ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX - innerWidth / 2);
      mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    fetchMotions(); 

    return () => window.removeEventListener("mousemove", handleMouseMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg via-black to-dark-bg text-gray-200 p-4 md:p-12 relative overflow-y-auto font-sans overflow-x-hidden">
      <Toaster position="top-center" />

      {/* BACKGROUND */}
      <motion.div style={{ x: x1, y: y1 }} className="fixed top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-pro/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />
      <motion.div style={{ x: x2, y: y2 }} className="fixed bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-contra/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col gap-8 md:gap-12">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4 md:gap-0">
          
          {/* Bagian Kiri: Logo & Welcome */}
          <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/20 flex items-center justify-center shadow-lg shrink-0">
                <Users className="text-pro w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter truncate">DI<span className="text-pro">-</span>DEBAT</h1>
              <p className="text-xs md:text-sm text-gray-400 mt-1 truncate">
                 Lobby Utama // <span className="hidden md:inline">Selamat datang,</span> <span className="text-pro font-bold">{user?.username}</span>
              </p>
            </div>
          </div>

          {/* Bagian Kanan: Tombol Navigasi */}
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {/* TOMBOL LEADERBOARD */}
           <button 
              onClick={() => navigate('/leaderboard')} 
              className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all shrink-0"
              title="Leaderboard"
            >
              <Trophy size={18} />
            </button>
              
             {/* Tombol Profile */}
             <button 
                onClick={() => navigate('/profile')} 
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 md:px-4 py-2 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition-all shadow-lg shrink-0"
             >
                <User size={16} className="text-pro" /> <span className="hidden sm:inline">PROFIL SAYA</span><span className="sm:hidden">PROFIL</span>
             </button>

             {/* Divider */}
             <div className="h-6 w-px bg-white/10 mx-1 md:mx-0 shrink-0"></div>

             {/* Tombol Logout */}
             <button onClick={handleLogout} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all shrink-0" title="Keluar">
                <LogOut size={20} />
             </button>
          </div>

        </header>

        {/* MENU AREA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* CARD BUAT MOSI BARU */}
            <motion.div 
              whileHover={{ y: -5, scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateModal(true)}
              className="group relative h-auto md:h-64 cursor-pointer"
            >
              <div className="absolute inset-0 bg-pro/10 blur-3xl rounded-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              <div className="relative h-full bg-[#121212]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden group-hover:border-pro/50 transition-colors gap-4">
                <MessageSquare className="absolute -right-6 -bottom-6 w-32 h-32 md:w-48 md:h-48 text-white/5 group-hover:text-pro/10 group-hover:rotate-12 transition-all duration-700" />
                <div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-pro/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 text-pro group-hover:bg-pro group-hover:text-black transition-all"><Plus size={20} className="md:w-6 md:h-6" /></div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Buat Mosi Baru</h2>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed max-w-xs group-hover:text-gray-200 transition-colors">Punya topik menarik? Buat mosi baru dan biarkan orang-orang berdebat di dalamnya.</p>
                </div>
                <div className="flex items-center gap-2 text-pro text-xs font-bold tracking-widest uppercase opacity-70 group-hover:opacity-100 transition-opacity mt-2 md:mt-0">Mulai Topik <ArrowRight size={14} /></div>
              </div>
            </motion.div>

            {/* CARD GABUNG VIA KODE */}
            <motion.div whileHover={{ y: -5, scale: 1.01 }} className="group relative h-auto md:h-64">
              <div className="absolute inset-0 bg-contra/10 blur-3xl rounded-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              <div className="relative h-full bg-[#121212]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden group-hover:border-contra/50 transition-colors gap-4">
                <Radio className="absolute -right-6 -bottom-6 w-32 h-32 md:w-48 md:h-48 text-white/5 group-hover:text-contra/10 group-hover:-rotate-12 transition-all duration-700" />
                <div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-contra/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 text-contra group-hover:bg-contra group-hover:text-white transition-all"><Play size={20} className="ml-1 md:w-6 md:h-6" /></div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Gabung via Kode</h2>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed max-w-xs group-hover:text-gray-200 transition-colors">Sudah punya kode room spesifik? Masukkan di sini untuk langsung melompat ke arena.</p>
                </div>
                <div className="relative z-20 mt-auto flex items-center bg-black/40 border border-white/10 rounded-lg p-1 focus-within:border-contra/50 transition-colors w-full">
                  <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="KODE ROOM..." className="bg-transparent border-none text-white w-full px-3 md:px-4 py-2 text-xs md:text-sm focus:ring-0 placeholder:text-gray-600 font-mono tracking-widest uppercase outline-none" />
                  <button onClick={joinRoom} className="bg-contra hover:bg-orange-600 text-white p-2 rounded shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0"><ArrowRight size={16} /></button>
                </div>
              </div>
            </motion.div>
        </div>

        {/* LIST MOSI TRENDING */}
        <div>
           <div className="flex items-center gap-3 mb-4 md:mb-6">
              <Globe className="text-blue-400 w-5 h-5 md:w-6 md:h-6" />
              <h3 className="text-lg md:text-xl font-bold text-white">Mosi Trending & Populer</h3>
              <div className="h-px bg-white/10 flex-1"></div>
           </div>

           {/* PERBAIKAN 3: Safety Check Array.isArray agar tidak error map is not function */}
           {Array.isArray(motions) && motions.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                 {motions.map((motionItem) => (
                    <motion.div 
                      key={motionItem.id}
                      whileHover={{ x: 4 }} 
                      className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 md:p-6 hover:border-blue-400/50 transition-all group cursor-pointer w-full relative overflow-hidden"
                      onClick={() => navigate(`/motion/${motionItem.id}`)} 
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
                           <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                 <span className="text-[10px] text-pro font-bold tracking-widest uppercase bg-pro/10 px-2 py-1 rounded whitespace-nowrap">TOPIC #{motionItem.id}</span>
                                 <span className="text-[10px] text-gray-500 truncate">by <span className="text-white font-bold">{motionItem.creator_name}</span></span>
                              </div>
                              <h4 className="text-white font-bold text-lg md:text-xl mb-2 group-hover:text-blue-400 transition-colors line-clamp-2 md:line-clamp-none">{motionItem.topic}</h4>
                              <p className="text-gray-400 text-xs md:text-sm line-clamp-2 max-w-2xl">{motionItem.description || "Tidak ada deskripsi."}</p>
                           </div>
                           
                           <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto md:text-right border-t border-white/5 pt-3 md:pt-0 md:border-0 mt-2 md:mt-0">
                              <div className="flex items-center gap-2 md:block">
                                 <div className="text-xl md:text-3xl font-black text-white/80 group-hover:text-white transition-colors">{motionItem.active_rooms || 0}</div>
                                 <div className="text-[10px] text-gray-500 uppercase tracking-widest">Room Aktif</div>
                              </div>
                              <ArrowRight className="md:hidden text-white/20 w-5 h-5" />
                           </div>
                        </div>
                    </motion.div>
                 ))}
              </div>
           ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
                 <p className="text-gray-500 text-sm md:text-base">Belum ada mosi yang dibuat atau gagal memuat data.</p>
                 <button onClick={() => setShowCreateModal(true)} className="text-pro text-xs md:text-sm font-bold mt-2 hover:underline">Buat topik pertama!</button>
              </div>
           )}
        </div>
      </div>

      {/* MODAL CREATE MOSI */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#1a1a1a] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl relative z-10 overflow-hidden">
              <div className="px-6 md:px-8 py-5 md:py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-pro/20 flex items-center justify-center text-pro"><Plus size={18} /></div>
                  Mulai Topik Baru
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 md:p-8 space-y-5 md:space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Judul Mosi</label>
                  <textarea value={newMotion.topic} onChange={(e) => setNewMotion({...newMotion, topic: e.target.value})} placeholder="Contoh: Dewan ini percaya bahwa..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-pro focus:outline-none transition-colors text-sm font-bold resize-none" rows="2" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Deskripsi / Konteks (Opsional)</label>
                  <textarea value={newMotion.description} onChange={(e) => setNewMotion({...newMotion, description: e.target.value})} placeholder="Jelaskan latar belakang mosi ini..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-pro focus:outline-none transition-colors text-sm resize-none" rows="4" />
                </div>
                
                <button onClick={createMotion} className="w-full py-4 bg-gradient-to-r from-pro to-teal-600 rounded-xl font-bold text-black shadow-lg hover:shadow-pro/20 hover:scale-[1.02] active:scale-[0.98] transition-all">TERBITKAN MOSI</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;