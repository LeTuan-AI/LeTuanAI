import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a small delay for luxury feel
    setTimeout(() => {
      if (username === 'NGANTHOMVLOG' && password === '123123') {
        onLogin();
      } else {
        setError('Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-luxury-purple-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-luxury-gold/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-luxury-purple-light/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="luxury-card relative overflow-hidden border-luxury-gold/20">
          {/* Brand Signature */}
          <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
            <span className="text-[8px] font-black text-luxury-gold uppercase tracking-[0.4em]">BY LÊ TUẤN</span>
          </div>

          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-luxury-gold rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)] mb-6">
              <ShieldCheck className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight mb-2">HỆ THỐNG BẢO MẬT</h1>
            <p className="text-luxury-gold/60 font-black text-[10px] tracking-[0.4em] uppercase">Cinematic AI Engine Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="luxury-label">Tài khoản (ID)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40">
                  <User className="w-4 h-4" />
                </div>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-12"
                  placeholder="Nhập ID của bạn..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="luxury-label">Mật khẩu</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-sm relative overflow-hidden group"
            >
              <span className={isLoading ? 'opacity-0' : 'opacity-100'}>XÁC THỰC TRUY CẬP</span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
             <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">
               © 2026 Cinematic AI Engine LÊ TUẤN — <span className="text-luxury-gold/40">Security Protocol</span>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
