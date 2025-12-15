import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Medal, Crown, TrendingUp, Shield, Users, ExternalLink } from 'lucide-react'; // Tambah ExternalLink icon
import axios from 'axios';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); 

  // --- ANIMATION ENGINE ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 100 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);
  const x1 = useTransform(x, (v) => v * 0.5); const y1 = useTransform(y, (v) => v * 0.5);
  const x2 = useTransform(x, (v) => v * -0.5); const y2 = useTransform(y, (v) => v * -0.5);

  useEffect(() => {
    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        mouseX.set(e.clientX - innerWidth / 2);
        mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    fetchLeaderboard();
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/leaderboard`);
      setLeaders(res.data);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const getWinRate = (user) => {
      const total = (user.wins || 0) + (user.losses || 0) + (user.draws || 0);
      if (total === 0) return 0;
      return Math.round((user.wins / total) * 100);
  };

  // --- NAVIGATE TO PROFILE ---
  const handleUserClick = (targetId) => {
      navigate(`/profile/${targetId}`);
  };

  // --- SUB-COMPONENTS ---
  const PodiumItem = ({ user, rank, delay }) => {
      if (!user) return null;
      let colorClass = ""; let heightClass = ""; let icon = null; let shadowClass = "";

      if (rank === 1) { 
          colorClass = "from-yellow-400 to-yellow-600"; heightClass = "h-48 md:h-56"; 
          icon = <Crown size={36} className="text-white drop-shadow-lg mb-2" />;
          shadowClass = "shadow-[0_-10px_30px_rgba(234,179,8,0.3)]";
      }
      if (rank === 2) { 
          colorClass = "from-gray-300 to-gray-500"; heightClass = "h-36 md:h-44"; 
          icon = <Medal size={28} className="text-white mb-2" />;
          shadowClass = "shadow-[0_-10px_20px_rgba(209,213,219,0.2)]";
      }
      if (rank === 3) { 
          colorClass = "from-orange-400 to-orange-600"; heightClass = "h-28 md:h-32"; 
          icon = <Medal size={24} className="text-white mb-2" />;
          shadowClass = "shadow-[0_-10px_20px_rgba(249,115,22,0.2)]";
      }

      return (
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay, type: "spring", stiffness: 120 }}
            className="flex flex-col items-center justify-end relative z-10 cursor-pointer group"
            onClick={() => handleUserClick(user.id)} // KLIK DISINI
          >
              <div className="mb-3 text-center relative group-hover:-translate-y-2 transition-transform duration-300">
                  {rank === 1 && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce"><Crown size={20}/></div>}
                  <div className="font-black text-white text-lg tracking-wider truncate max-w-[100px] md:max-w-[140px] relative z-10 flex items-center justify-center gap-1">
                      {user.username}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"/>
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold bg-black/50 px-2 py-1 rounded-full inline-block mt-1 border border-white/10">{user.wins} Wins • {getWinRate(user)}% WR</div>
              </div>
              <div className={`w-24 md:w-36 ${heightClass} bg-gradient-to-b ${colorClass} rounded-t-2xl flex flex-col items-center justify-start pt-4 relative overflow-hidden ${shadowClass} group-hover:brightness-110 transition-all`}>
                  {icon}
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-2 text-5xl font-black text-white/30 z-10">{rank}</div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent skew-x-12 opacity-50"></div>
              </div>
          </motion.div>
      );
  };

  return (
    <div className="h-screen bg-gradient-to-b from-dark-bg via-black to-dark-bg text-gray-200 flex flex-col font-sans overflow-hidden relative">
      <motion.div style={{ x: x1, y: y1, rotate: -10 }} className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <motion.div style={{ x: x2, y: y2, rotate: 15 }} className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
      
      <header className="h-20 shrink-0 border-b border-white/10 bg-[#121212]/90 backdrop-blur-md flex items-center justify-between px-6 z-50 relative">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors shrink-0"><ArrowLeft size={20} /></button>
            <div>
                <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 uppercase leading-none">HALL OF FAME</h1>
                <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">Global Leaderboard</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right hidden md:block"><p className="text-[10px] text-gray-500 font-bold">User</p><p className="text-xs font-bold text-white">{user?.username}</p></div>
           <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center"><Users size={18} /></div>
        </div>
      </header>

      <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto w-full px-6 py-10">
              
              {!loading && leaders.length > 0 && (
                  <div className="flex justify-center items-end gap-3 md:gap-6 mb-16 mt-6 relative">
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-t from-blue-500/10 to-transparent blur-3xl pointer-events-none -z-10"></div>
                      <PodiumItem user={leaders[1]} rank={2} delay={0.2} />
                      <PodiumItem user={leaders[0]} rank={1} delay={0.4} />
                      <PodiumItem user={leaders[2]} rank={3} delay={0.3} />
                  </div>
              )}

              <div className="space-y-3 relative z-10">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Penantang Lainnya</h3>
                  {loading ? (
                      <div className="flex flex-col gap-3">{[1,2,3].map(i => (<div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>))}</div>
                  ) : (
                      leaders.slice(3).map((user, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + (idx * 0.05) }}
                            onClick={() => handleUserClick(user.id)} // KLIK DISINI JUGA
                            className="bg-[#121212]/80 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 hover:border-blue-500/30 transition-all group cursor-pointer"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="font-mono text-gray-500 font-bold w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">#{idx + 4}</div>
                                  <div>
                                      <div className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                                          {user.username}
                                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500"/>
                                      </div>
                                      <div className="text-[10px] text-gray-500 flex gap-3 font-medium uppercase tracking-wider">
                                          <span className="text-green-400/80">{user.wins} W</span>
                                          <span className="text-red-400/80">{user.losses} L</span>
                                          <span className="text-gray-400/80">{user.draws} D</span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="text-right bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 group-hover:bg-black/50">
                                  <div className="text-sm font-black text-blue-400 flex items-center gap-1 justify-end">{getWinRate(user)}% <TrendingUp size={14} /></div>
                                  <div className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Win Rate</div>
                              </div>
                          </motion.div>
                      ))
                  )}
                  {!loading && leaders.length === 0 && (
                      <div className="text-center py-20 opacity-50"><Shield size={48} className="mx-auto mb-4 text-gray-600" /><p className="text-gray-400 font-bold">Belum ada data petarung.</p></div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;