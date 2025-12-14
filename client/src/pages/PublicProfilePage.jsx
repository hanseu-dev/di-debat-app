import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, X as IconX, Activity, Calendar, Shield, Swords, User, Clock, Eye } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import axios from 'axios';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ANIMATION ENGINE ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 100 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  const x1 = useTransform(x, (value) => value * 0.5);
  const y1 = useTransform(y, (value) => value * 0.5);
  const x2 = useTransform(x, (value) => value * -0.5);
  const y2 = useTransform(y, (value) => value * -0.5);

  useEffect(() => {
    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        mouseX.set(e.clientX - innerWidth / 2);
        mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/users/${userId}/public`);
        setData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Gagal load profil", err);
        setLoading(false);
      }
    };
    fetchPublicProfile();
  }, [userId]);

  if (loading) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center text-gray-500 font-bold tracking-widest animate-pulse">
        MEMUAT DATA...
    </div>
  );

  if (!data) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-gray-500 gap-4">
        <User size={48} />
        <span className="font-bold tracking-widest">USER TIDAK DITEMUKAN</span>
        <button onClick={() => navigate(-1)} className="text-blue-400 hover:text-blue-300 text-sm underline">Kembali</button>
    </div>
  );

  const { user, history } = data;
  const totalGames = (user.wins || 0) + (user.losses || 0) + (user.draws || 0);
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  return (
    <div className="h-screen bg-gradient-to-b from-dark-bg via-black to-dark-bg text-gray-200 flex flex-col font-sans overflow-hidden relative">
      
      {/* --- BACKGROUND ANIMATION --- */}
      <motion.div style={{ x: x1, y: y1, rotate: -10 }} className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <motion.div style={{ x: x2, y: y2, rotate: 15 }} className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

      {/* --- HEADER --- */}
      <header className="h-20 shrink-0 border-b border-white/10 bg-[#121212]/90 backdrop-blur-md flex items-center gap-4 px-6 z-50 relative">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={20} />
        </button>
        <div>
            <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase leading-none">
                PUBLIC PROFILE
            </h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">Player Statistics</p>
        </div>
      </header>

      {/* --- CONTENT --- */}
      <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 1. USER IDENTITY CARD */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="bg-[#121212]/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl relative overflow-hidden"
            >
                 <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                 
                 <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                     <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-3xl font-black text-white border border-white/20 shadow-2xl shrink-0">
                         {user.username.charAt(0).toUpperCase()}
                     </div>
                     
                     <div className="text-center md:text-left flex-1">
                         <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{user.username}</h1>
                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <Calendar size={12} className="text-blue-400" />
                                Member since {new Date(user.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <Swords size={12} className="text-purple-400" />
                                {totalGames} Debates
                            </span>
                         </div>
                     </div>
                     
                     <div className="text-center px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            {winRate}%
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Win Rate</div>
                     </div>
                 </div>
            </motion.div>

            {/* 2. STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-[#121212]/60 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-green-500/30 transition-all">
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Victory</p>
                        <p className="text-3xl font-black text-white group-hover:text-green-400 transition-colors">{user.wins}</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-500 group-hover:scale-110 transition-transform"><Trophy size={20} /></div>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-[#121212]/60 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-red-500/30 transition-all">
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Defeat</p>
                        <p className="text-3xl font-black text-white group-hover:text-red-400 transition-colors">{user.losses}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:scale-110 transition-transform"><IconX size={20} /></div>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-[#121212]/60 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-gray-500/30 transition-all">
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Draw</p>
                        <p className="text-3xl font-black text-white group-hover:text-gray-300 transition-colors">{user.draws}</p>
                    </div>
                    <div className="p-3 bg-gray-500/10 rounded-xl text-gray-500 group-hover:scale-110 transition-transform"><Activity size={20} /></div>
                </motion.div>
            </div>

            {/* 3. RECENT ACTIVITY LIST (UPDATE: CLICKABLE) */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={14} /> Riwayat Pertandingan
                </h3>
                
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-12 bg-[#121212]/50 rounded-2xl border border-white/5 border-dashed">
                            <Shield size={32} className="mx-auto mb-3 text-gray-600" />
                            <p className="text-gray-500 text-sm italic">Belum ada riwayat debat.</p>
                        </div>
                    ) : (
                        history.map((room, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                transition={{ delay: 0.4 + (idx * 0.1) }} 
                                onClick={() => navigate(`/room/${room.id}`)} // KLIK DISINI
                                className="bg-[#121212]/60 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 hover:border-blue-500/30 transition-all group cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="min-w-0 relative z-10">
                                     <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold bg-white/5 text-gray-400 px-1.5 py-0.5 rounded border border-white/5 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-colors">
                                            {room.room_code}
                                        </span>
                                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                            {new Date(room.created_at).toLocaleDateString()}
                                        </span>
                                     </div>
                                     <h4 className="text-sm font-bold text-gray-200 line-clamp-1 group-hover:text-white transition-colors flex items-center gap-2">
                                        {room.topic || room.motion_title || 'Topik Rahasia'}
                                        <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                     </h4>
                                </div>

                                <div className="text-right shrink-0 ml-4 relative z-10">
                                     {room.role === 'DEBATER' ? (
                                        <div className={`flex flex-col items-end`}>
                                            <span className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${room.side === 'PRO' ? 'text-green-400' : 'text-orange-400'}`}>
                                                {room.side} SIDE
                                            </span>
                                            <span className="text-[9px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                                                Seat {room.seat_number}
                                            </span>
                                        </div>
                                     ) : (
                                        <div className="flex items-center gap-1.5 text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Shield size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Spectator</span>
                                        </div>
                                     )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;