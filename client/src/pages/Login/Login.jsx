import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Bed, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Анимированная стеклянная карта входа (3D-наклон, бегущие лучи, свечение).
// Адаптировано под Vite/JS + react-router; подключено к реальному AuthContext.
export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 3D-наклон карты по движению мыши.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authLogin({ email, password });
      navigate('/orders');
    } catch (err) {
      const isNetwork = /failed to fetch|networkerror|load failed/i.test(err.message || '');
      setError(isNetwork ? 'Ошибка входа' : (err.message || 'Ошибка входа'));
    } finally {
      setIsLoading(false);
    }
  };

  const beam = (cls, axis, delay) => (
    <motion.div
      className={cls}
      initial={{ filter: 'blur(2px)' }}
      animate={{ [axis]: ['-50%', '100%'], opacity: [0.3, 0.7, 0.3], filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'] }}
      transition={{
        [axis]: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay },
        opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay },
        filter: { duration: 1.5, repeat: Infinity, repeatType: 'mirror', delay },
      }}
    />
  );

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
      {/* Фоновое свечение */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/40 via-indigo-700/50 to-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-indigo-400/20 blur-[80px]" />
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-indigo-400/20 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', delay: 1 }}
      />
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse opacity-40" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse delay-1000 opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10 px-4"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative group">
            {/* Бегущие лучи по периметру */}
            <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
              {beam('absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70', 'left', 0)}
              {beam('absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70', 'top', 0.6)}
              {beam('absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70', 'right', 1.2)}
              {beam('absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70', 'bottom', 1.8)}
            </div>

            {/* Стеклянная карта */}
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)',
                  backgroundSize: '30px 30px',
                }}
              />

              {/* Шапка */}
              <div className="text-center space-y-1 mb-5">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="mx-auto w-12 h-12 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden bg-white/5"
                >
                  <Bed className="w-6 h-6 text-white" strokeWidth={1.5} />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold tracking-wide text-white"
                >
                  MATRELAX
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/60 text-xs"
                >
                  Система управления заказами
                </motion.p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className={`relative ${focusedInput === 'email' ? 'z-10' : ''}`}>
                  <div className="relative flex items-center overflow-hidden rounded-lg">
                    <Mail className={`absolute left-3 w-4 h-4 transition-colors duration-300 ${focusedInput === 'email' ? 'text-white' : 'text-white/40'}`} />
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-white/5 border border-transparent focus:border-white/20 rounded-lg text-white placeholder:text-white/30 h-10 outline-none transition-all duration-300 pl-10 pr-3 focus:bg-white/10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className={`relative ${focusedInput === 'password' ? 'z-10' : ''}`}>
                  <div className="relative flex items-center overflow-hidden rounded-lg">
                    <Lock className={`absolute left-3 w-4 h-4 transition-colors duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-white/40'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-white/5 border border-transparent focus:border-white/20 rounded-lg text-white placeholder:text-white/30 h-10 outline-none transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 cursor-pointer"
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                      {showPassword
                        ? <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                        : <EyeOff className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />}
                    </button>
                  </div>
                </div>

                {/* Войти */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group/button mt-2"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />
                  <div className="relative overflow-hidden bg-white text-black font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70">
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-1 text-sm font-medium">
                          Войти
                          <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
