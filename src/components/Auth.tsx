import React, { useState, useEffect, useCallback } from 'react';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  RefreshCw, 
  ArrowRight, 
  Stethoscope,
  UserCircle,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, db, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthProps {
  onLogin: (user: { uid?: string; name: string; role: string; email: string }) => void;
  onRegister: (user: { name: string; role: string; email: string }) => void;
  users: { name: string; role: string; email: string }[];
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, users }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [formData, setFormData] = useState({
    user: '',
    password: '',
    role: 'Terapis Gigi dan Mulut',
    name: '',
    email: ''
  });
  const [error, setError] = useState('');

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setCaptchaInput('');
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaInput !== captcha) {
      setError('Captcha tidak sesuai');
      generateCaptcha();
      return;
    }

    if (isLogin) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, formData.user, formData.password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          onLogin({ uid: userCredential.user.uid, name: userData.name, role: userData.role, email: userData.email });
        } else {
          // Fallback if user doc doesn't exist but auth succeeded
          onLogin({ uid: userCredential.user.uid, name: userCredential.user.email || 'User', role: 'Terapis Gigi dan Mulut', email: userCredential.user.email || '' });
        }
      } catch (err: any) {
        console.error(err);
        setError('Username/email atau password salah');
      }
    } else {
      // Register
      if (formData.user && formData.password && formData.name && formData.email) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const newUser = {
            uid: userCredential.user.uid,
            name: formData.name,
            email: formData.email,
            role: formData.role
          };
          await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
          
          // Sign out immediately to force manual login
          await auth.signOut();
          
          alert('Pendaftaran berhasil! Silakan login menggunakan email dan password Anda.');
          setIsLogin(true);
          setFormData({ ...formData, password: '', user: formData.email });
          generateCaptcha();
          setCaptchaInput('');
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Gagal mendaftar');
        }
      } else {
        setError('Semua field wajib diisi');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        onLogin({ uid: result.user.uid, name: userData.name, role: userData.role, email: userData.email });
      } else {
        // New Google user, create profile
        const newUser = {
          uid: result.user.uid,
          name: result.user.displayName || 'User Google',
          email: result.user.email || '',
          role: 'Terapis Gigi dan Mulut' // Default role
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
        onLogin({ uid: result.user.uid, name: newUser.name, role: newUser.role, email: newUser.email });
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal masuk dengan Google');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-4">
              <LogIn size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">DentaCare RME</h1>
            <p className="text-slate-500 text-sm font-medium">
              {isLogin ? 'Masuk ke akun Anda' : 'Daftar akun petugas baru'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required={!isLogin}
                        autoComplete="off"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        placeholder="Masukkan nama lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required={!isLogin}
                        autoComplete="off"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        placeholder="Masukkan email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value, user: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis User</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none transition-all"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Dokter Gigi">Dokter Gigi</option>
                        <option value="Terapis Gigi dan Mulut">Terapis Gigi dan Mulut</option>
                        <option value="Dosen">Dosen</option>
                        <option value="Pasien">Pasien</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="Email"
                    value={formData.user}
                    onChange={(e) => setFormData({...formData, user: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs font-bold text-blue-600 hover:underline">Lupa Password?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Captcha Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 font-mono text-xl font-bold tracking-widest text-blue-600 select-none italic shadow-inner">
                    {captcha}
                  </div>
                  <button 
                    type="button"
                    onClick={generateCaptcha}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Verifikasi Captcha</span>
              </div>
              <input 
                type="text" 
                required
                placeholder="Masukkan kode di atas"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold tracking-widest"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-bold text-red-500 text-center"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
            >
              <span>{isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-bold">Atau masuk dengan</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Google</span>
          </button>

          <p className="mt-8 text-center text-sm text-slate-500">
            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 font-bold text-blue-600 hover:underline"
            >
              {isLogin ? 'Daftar Baru' : 'Masuk di sini'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
