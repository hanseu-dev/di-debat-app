import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
// PERBAIKAN: Tambah icon Gavel, Lock, Globe
import { ArrowLeft, User, Mail, Calendar, Trophy, Activity, Clock, Hash, Shield, AlertTriangle, LogOut, PenTool, Layers, Gavel, Lock, Globe, X} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ongoing'); 

  // --- BACKGROUND ENGINE ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useSpring(mouseX, { damping: 25, stiffness: 100 });
  const y = useSpring(mouseY, { damping: 25, stiffness: 100 });
  const x1 = useTransform(x, v => v * 0.5); const y1 = useTransform(y, v => v * 0.5);
  const x2 = useTransform(x, v => v * -0.5); const y2 = useTransform(y, v => v * -0.5);

  useEffect(() => {
    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        mouseX.set(e.clientX - innerWidth / 2);
        mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    fetchProfile();
    return () => window.removeEventListener("mousemove", handleMouseMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
          navigate('/login');
          return;
      }
      const res = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setLoading(false);
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
          toast.error("Sesi habis. Harap login ulang.");
          localStorage.removeItem('token'); 
          localStorage.removeItem('user');
          setTimeout(() => navigate('/login'), 1500); 
      } else {
          toast.error("Gagal memuat profil.");
          setLoading(false);
      }
    }
  };

  if (loading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-mono animate-pulse">MEMUAT DATA PROFIL...</div>;
  
  if (!profile) return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-gray-500 gap-4">
        <p>Gagal memuat data pengguna.</p>
        <button onClick={() => navigate('/login')} className="px-4 py-2 bg-pro text-black font-bold rounded hover:bg-teal-400 transition-colors">Login Ulang</button>
    </div>
  );

  // DATA FILTERING
  const ongoingRooms = profile.history.filter(r => r.status === 'ACTIVE' || r.status === 'WAITING');
  const finishedRooms = profile.history.filter(r => r.status === 'FINISHED');
  const createdMotions = profile.created_motions || [];
  const createdRooms = profile.created_rooms || []; // NEW DATA

  const totalDebates = profile.history.length;
  const totalCreated = createdMotions.length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-screen bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a] text-gray-200 font-sans flex flex-col overflow-hidden relative">
      <Toaster position="top-center" />
      
      {/* BACKGROUND LAYER */}
      <motion.div style={{ x: x1, y: y1 }} className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pro/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <motion.div style={{ x: x2, y: y2 }} className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-contra/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

      {/* HEADER (FIXED TOP) */}
      <div className="shrink-0 border-b border-white/10 bg-[#121212]/50 backdrop-blur-md p-6 md:px-12 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 text-xs font-bold uppercase tracking-wider">
                <ArrowLeft size={14} /> Dashboard
                </button>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">PROFIL <span className="text-pro">DEBATER</span></h1>
            </div>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="p-3 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-all" title="Logout">
                <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* BODY CONTENT (SPLIT VIEW) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden max-w-6xl w-full mx-auto relative z-10 custom-scrollbar">
        
        {/* --- SIDEBAR KIRI: INFO USER --- */}
        <div className="w-full md:w-1/3 p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 shrink-0 bg-[#0a0a0a]/30 backdrop-blur-sm md:overflow-y-auto md:h-full">
           <div className="space-y-6">
               <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-[#121212]/80 border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-blue-900/20 to-transparent"></div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                     <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-white/20 flex items-center justify-center mb-4 shadow-xl">
                        <span className="text-2xl font-black text-white">{profile.user.username.substring(0,2).toUpperCase()}</span>
                     </div>
                     <h2 className="text-xl font-bold text-white mb-1">{profile.user.username}</h2>
                     <p className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">ID: #{profile.user.id}</p>
                  </div>
                  <div className="mt-6 space-y-3">
                     <div className="flex items-center gap-3 text-xs text-gray-400">
                        <Mail size={14} className="text-blue-400" />
                        <span className="truncate">{profile.user.email}</span>
                     </div>
                     <div className="flex items-center gap-3 text-xs text-gray-400">
                        <Calendar size={14} className="text-pro" />
                        <span>Join: {formatDate(profile.user.created_at)}</span>
                     </div>
                  </div>
               </motion.div>

               {/* CARD STATS (UPDATED WITH REAL DB STATS) */}
               <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-[#121212]/80 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Statistik Arena</h3>
                  <div className="grid grid-cols-3 gap-3">
                     <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20 text-center">
                        <Trophy className="mx-auto mb-1 text-green-500" size={16} />
                        <div className="text-xl font-black text-white">{profile.user.wins || 0}</div>
                        <div className="text-[9px] text-gray-500 uppercase">Menang</div>
                     </div>
                     <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
                        <X className="mx-auto mb-1 text-red-500" size={16} />
                        <div className="text-xl font-black text-white">{profile.user.losses || 0}</div>
                        <div className="text-[9px] text-gray-500 uppercase">Kalah</div>
                     </div>
                     <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                        <Activity className="mx-auto mb-1 text-gray-400" size={16} />
                        <div className="text-xl font-black text-white">{profile.user.draws || 0}</div>
                        <div className="text-[9px] text-gray-500 uppercase">Seri</div>
                     </div>
                  </div>
                  
                  {/* Total Partisipasi */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-gray-400">
                      <span>Total Debat</span>
                      <span className="font-bold text-white">{totalDebates}</span>
                  </div>
               </motion.div>
           </div>
        </div>

        {/* --- AREA KANAN: KONTEN TAB --- */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent md:h-full md:overflow-hidden">
           {/* HEADER TAB */}
           <div className="shrink-0 z-30 bg-[#0a0a0a] border-b border-white/10 px-6 md:px-8 pt-6 pb-0 shadow-[0_10px_30px_rgba(0,0,0,0.5)] sticky top-0 md:relative">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar mask-gradient-right pb-1">
                 <TabButton active={activeTab === 'ongoing'} onClick={() => setActiveTab('ongoing')} label={`Aktif (${ongoingRooms.length})`} icon={<Activity size={14}/>} color="pro" />
                 <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label={`Riwayat (${finishedRooms.length})`} icon={<Clock size={14}/>} color="blue" />
                 <TabButton active={activeTab === 'created_rooms'} onClick={() => setActiveTab('created_rooms')} label={`Ruang (${createdRooms.length})`} icon={<Gavel size={14}/>} color="orange" />
                 <TabButton active={activeTab === 'created_motions'} onClick={() => setActiveTab('created_motions')} label={`Mosi (${createdMotions.length})`} icon={<PenTool size={14}/>} color="purple" />
              </div>
           </div>

           {/* LIST CONTENT */}
           <div className="flex-1 md:overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-4 bg-gradient-to-b from-black/50 to-transparent">
              
              {activeTab === 'ongoing' && (
                 ongoingRooms.length === 0 ? <EmptyState text="Tidak ada debat aktif." /> : ongoingRooms.map(room => <RoomCard key={room.id} room={room} navigate={navigate} />)
              )}

              {activeTab === 'history' && (
                 finishedRooms.length === 0 ? <EmptyState text="Belum ada riwayat." /> : finishedRooms.map(room => <RoomCard key={room.id} room={room} navigate={navigate} />)
              )}

              {/* TAB 3: RUANG SAYA (Created Rooms) */}
              {activeTab === 'created_rooms' && (
                 createdRooms.length === 0 ? (
                    <EmptyState text="Anda belum membuat ruangan debat." />
                 ) : (
                    createdRooms.map(room => (
                        <motion.div 
                           key={room.id}
                           layout 
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                           whileHover={{ scale: 1.02 }} 
                           onClick={() => navigate(`/room/${room.id}`)}
                           className="bg-[#1a1a1a]/80 border border-white/10 rounded-xl p-5 hover:border-orange-500/50 transition-all cursor-pointer group relative overflow-hidden shadow-lg"
                        >
                           <div className="flex justify-between items-start mb-3 relative z-10">
                              <div className="flex items-center gap-2">
                                 <span className="text-[9px] font-bold px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 tracking-wider flex items-center gap-1">
                                    <Gavel size={10} /> HOST
                                 </span>
                                 <span className={`text-[9px] font-bold px-2 py-1 rounded border ${room.is_public ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'} flex items-center gap-1`}>
                                    {room.is_public ? <Globe size={10}/> : <Lock size={10}/>}
                                    {room.is_public ? 'PUBLIC' : 'PRIVATE'}
                                 </span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${room.status === 'ACTIVE' ? 'bg-red-500/10 text-red-500 border-red-500/20' : room.status === 'WAITING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                 {room.status}
                              </span>
                           </div>

                           <h4 className="text-white font-bold text-sm md:text-base mb-3 leading-snug group-hover:text-orange-400 transition-colors relative z-10">
                              {room.motion_title || room.topic}
                           </h4>

                           <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto relative z-10">
                              <span className="text-xs font-mono text-gray-500">#{room.room_code}</span>
                              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                 <Clock size={10} /> {new Date(room.created_at).toLocaleDateString()}
                              </div>
                           </div>
                        </motion.div>
                    ))
                 )
              )}

              {/* TAB 4: MOSI SAYA */}
              {activeTab === 'created_motions' && (
                 createdMotions.length === 0 ? (
                    <EmptyState text="Anda belum membuat mosi apapun." />
                 ) : (
                    createdMotions.map(motionItem => (
                        <motion.div 
                           key={motionItem.id}
                           layout 
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                           whileHover={{ scale: 1.02 }}
                           onClick={() => navigate(`/motion/${motionItem.id}`)}
                           className="bg-[#1a1a1a]/80 border border-white/10 rounded-xl p-5 hover:border-purple-500/50 transition-all cursor-pointer group relative overflow-hidden shadow-sm"
                        >
                           <div className="flex justify-between items-start mb-3 relative z-10">
                              <span className="text-[9px] font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 tracking-wider">
                                 TOPIC #{motionItem.id}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">{formatDate(motionItem.created_at)}</span>
                           </div>
                           <h4 className="text-white font-bold text-lg mb-4 leading-snug group-hover:text-purple-400 transition-colors relative z-10">{motionItem.topic}</h4>
                           <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-white/5 pt-3 relative z-10">
                              <div className="flex items-center gap-1.5"><Layers size={14} className="text-purple-400"/> <span className="text-gray-300 font-bold">{motionItem.total_rooms}</span> Room</div>
                           </div>
                        </motion.div>
                    ))
                 )
              )}
              
              <div className="h-12"></div>
           </div>

        </div>

      </div>
    </div>
  );
};

// Sub-Component: Tab Button
const TabButton = ({ active, onClick, label, icon, color }) => {
    let activeClass = 'text-gray-500 border-transparent hover:text-white';
    if(active) {
        if(color === 'pro') activeClass = 'text-pro border-pro';
        else if(color === 'blue') activeClass = 'text-blue-400 border-blue-400';
        else if(color === 'purple') activeClass = 'text-purple-400 border-purple-400';
        else if(color === 'orange') activeClass = 'text-orange-400 border-orange-400';
    }
    
    return (
        <button 
            onClick={onClick}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeClass}`}
        >
            {icon} {label}
        </button>
    )
}

// Sub-Component: Empty State
const EmptyState = ({ text }) => (
    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
       <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-600">
          <Hash size={20} />
       </div>
       <p className="text-gray-500 text-xs">{text}</p>
    </div>
);

// Sub-Component: RoomCard (Used for Ongoing & History)
const RoomCard = ({ room, navigate }) => {
    const isPro = room.side === 'PRO';
    const isContra = room.side === 'CONTRA';
    
    return (
        <motion.div 
           layout 
           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
           whileHover={{ scale: 1.02 }} 
           onClick={() => navigate(`/room/${room.id}`)}
           className="bg-[#1a1a1a]/80 border border-white/10 rounded-2xl p-5 hover:border-white/30 transition-all cursor-pointer group relative overflow-hidden shadow-lg z-0 hover:z-10"
        >
           <div className="absolute -right-2 -top-4 text-[50px] font-black text-white/[0.03] group-hover:text-white/[0.08] transition-colors pointer-events-none select-none font-mono">
              #{room.room_code}
           </div>

           <div className="flex justify-between items-center mb-3 relative z-10">
              <div className="flex items-center gap-3">
                 <span className="text-lg font-black font-mono text-white/40 group-hover:text-pro transition-all duration-300 tracking-wider">
                    #{room.room_code}
                 </span>
                 <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${room.status === 'ACTIVE' ? 'bg-red-500/10 text-red-500 border-red-500/20' : room.status === 'WAITING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                    {room.status}
                 </span>
              </div>
           </div>

           <motion.h4 layout className="text-white font-bold text-sm md:text-base mb-4 leading-snug line-clamp-1 group-hover:line-clamp-none transition-all duration-300 relative z-10">
              {room.motion_title || room.topic}
           </motion.h4>

           <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto relative z-10">
              <div className="flex items-center gap-2">
                 <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded ${isPro ? 'bg-pro/10 text-pro' : isContra ? 'bg-contra/10 text-contra' : 'bg-gray-700 text-gray-300'}`}>
                    {isPro ? <Shield size={10}/> : isContra ? <AlertTriangle size={10}/> : <User size={10}/>}
                    {room.role === 'HOST' ? 'HOST' : room.side || 'SPECTATOR'}
                 </div>
                 {room.role === 'DEBATER' && (
                    <span className="text-[10px] text-gray-600">#{room.seat_number}</span>
                 )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                 <Clock size={10} />
                 {new Date(room.created_at).toLocaleDateString()}
              </div>
           </div>
        </motion.div>
    );
};

export default ProfilePage;