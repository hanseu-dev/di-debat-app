import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Mic2, Zap, AlertCircle, CheckCircle, Mail, User, Lock } from 'lucide-react'; 
import axios from 'axios';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true); 
  
  // State Data User
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [status, setStatus] = useState({ type: '', msg: '' }); 
  const [loading, setLoading] = useState(false);

  // --- EFEK MOUSE (Tetap Sama) ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 100 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);
  const x1 = useTransform(x, value => value * 0.5);
  const y1 = useTransform(y, value => value * 0.5);
  const x2 = useTransform(x, value => value * -0.5);
  const y2 = useTransform(y, value => value * -0.5);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX - innerWidth / 2);
      mouseY.set(e.clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus({ type: '', msg: '' });

    // Validasi
    if (isLogin) {
       // Validasi Login: Cukup Username & Pass
       if (!formData.username || !formData.password) {
          setStatus({ type: 'error', msg: 'Username dan Password wajib diisi!' });
          setLoading(false); return;
       }
    } else {
       // Validasi Register: Wajib Semua
       if (!formData.username || !formData.email || !formData.password) {
          setStatus({ type: 'error', msg: 'Semua kolom wajib diisi untuk mendaftar!' });
          setLoading(false); return;
       }
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const url = `http://localhost:3000${endpoint}`;
      
      const res = await axios.post(url, formData);

      if (isLogin) {
        // LOGIN SUKSES
        const { token, user } = res.data;
        localStorage.setItem('token', token); 
        localStorage.setItem('user', JSON.stringify(user));
        
        setStatus({ type: 'success', msg: `Welcome back, ${user.username}!` });
        
        setTimeout(() => {
          window.location.href = '/dashboard'; 
        }, 1000);

      } else {
        // REGISTER SUKSES
        setStatus({ type: 'success', msg: 'Akun berhasil dibuat! Silakan Login.' });
        setIsLogin(true); // Pindah ke mode login
        setFormData({ ...formData, password: '' }); // Clear pass
      }

    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Terjadi kesalahan server";
      setStatus({ type: 'error', msg: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-dark-bg">
      
      {/* Background Effects */}
      <motion.div style={{ x: x1, y: y1 }} className="absolute top-1/4 left-1/4 w-96 h-96 bg-pro/20 rounded-full blur-[120px] pointer-events-none" />
      <motion.div style={{ x: x2, y: y2 }} className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-contra/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* MAIN CARD */}
      <motion.div 
        className="w-full max-w-md p-8 glass-panel rounded-3xl shadow-2xl relative z-10 border border-white/10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-pro to-blue-600 mb-4 shadow-[0_0_30px_rgba(0,191,165,0.4)]"
            whileHover={{ scale: 1.1, rotate: 180 }}
            transition={{ duration: 0.5 }}
          >
            <Mic2 className="text-white w-8 h-8" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            DI<span className="text-pro">-</span>DEBAT
          </h1>
          <p className="text-text-secondary text-xs mt-2 uppercase tracking-[0.3em] font-bold">
            {isLogin ? 'Secure Login' : 'New Agent Registration'}
          </p>
        </div>

        {/* Notifikasi */}
        <AnimatePresence>
          {status.msg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className={`mb-6 p-3 rounded-lg flex items-center gap-2 text-sm font-bold ${status.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}
            >
              {status.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>}
              {status.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          
          {/* USERNAME (Selalu Ada) */}
          <div className="group">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1 group-focus-within:text-pro transition-colors">
               <User size={12}/> Username
            </label>
            <input 
              name="username"
              value={formData.username}
              onChange={handleChange}
              type="text" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pro focus:ring-1 focus:ring-pro transition-all placeholder:text-gray-700"
              placeholder="Username anda"
            />
          </div>

          {/* EMAIL (Hanya muncul saat Register) */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="group"
              >
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1 group-focus-within:text-pro transition-colors">
                   <Mail size={12}/> Email Address
                </label>
                <input 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pro focus:ring-1 focus:ring-pro transition-all placeholder:text-gray-700"
                  placeholder="email@contoh.com"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* PASSWORD (Selalu Ada) */}
          <div className="group">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1 group-focus-within:text-contra transition-colors">
               <Lock size={12}/> Password
            </label>
            <input 
              name="password"
              value={formData.password}
              onChange={handleChange}
              type="password" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-contra focus:ring-1 focus:ring-contra transition-all placeholder:text-gray-700"
              placeholder="••••••••"
            />
          </div>

          <motion.button 
            onClick={handleSubmit}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg mt-6 flex items-center justify-center gap-2 transition-all relative overflow-hidden group
              ${isLogin ? 'bg-gradient-to-r from-pro to-teal-600 text-black' : 'bg-gradient-to-r from-contra to-orange-600 text-white'}
              ${loading ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {loading ? <span className="animate-pulse">PROCESSING...</span> : (
               <>
                 <Zap className="w-5 h-5 fill-current" />
                 {isLogin ? 'ENTER ARENA' : 'REGISTER ACCOUNT'}
               </>
            )}
          </motion.button>
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-gray-500 text-sm">
            {isLogin ? "Belum punya akses? " : "Sudah punya akun? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setStatus({type:'', msg:''}); }}
              className="text-white font-bold hover:underline decoration-pro underline-offset-4 ml-1 transition-colors hover:text-pro"
            >
              {isLogin ? "Daftar Sekarang" : "Login di sini"}
            </button>
          </p>
        </div>

      </motion.div>
    </div>
  );
};

export default LoginPage;