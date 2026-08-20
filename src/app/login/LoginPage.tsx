"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Button, TextInput } from '../../components/FormControls';
import { Eye, EyeOff, Lock, Mail, Shield, Server, Database, Network } from 'lucide-react';

const REMEMBER_KEY = 'gbb_remember_email';

export function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) return toast(error, 'error');
    if (remember) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);
    toast('Welcome to Goh Betoch Bank Asset Inventory Management Portal', 'success');
    const returnPath = sessionStorage.getItem('gbb_return_path');
    sessionStorage.removeItem('gbb_return_path');
    router.replace(returnPath && returnPath.startsWith('/') ? returnPath : '/dashboard');
  };

  return (
    <div className="gbb-login-shell min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#ffc800]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#ffc800]/10 blur-3xl" />
        <Server className="absolute top-20 left-20 text-[#ffc800]/20 hidden lg:block" size={64} />
        <Network className="absolute bottom-32 right-24 text-[#ffc800]/20 hidden lg:block" size={56} />
        <Database className="absolute top-1/2 right-16 text-[#ffc800]/15 hidden lg:block" size={48} />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="gbb-login-panel backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#343494] to-[#4e4ec1] px-8 py-8 text-center">
            <div className="mb-3 flex justify-center overflow-hidden">
              <img
                src="/assets/image.png"
                alt="Goh Betoch Bank Logo"
                className="block h-24 w-full max-w-[280px] rounded-2xl object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Goh Betoch Bank</h1>
            <p className="text-[#ffc800] font-semibold text-sm mt-1 tracking-wide uppercase">IT Asset Inventory Management System</p>
          </div>
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="space-y-1.5"><label className="text-sm font-medium text-[var(--gbb-text)]">Email Address</label><div className="relative"><Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><TextInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gohbetochbank.com" className="pl-10" /></div></div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-[var(--gbb-text)]">Password</label><div className="relative"><Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><TextInput type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="pl-10 pr-10" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)} className="gbb-icon-button absolute right-1 top-1/2 min-h-0 min-w-0 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-[var(--gbb-text-muted)] cursor-pointer"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" />Remember my email</label><Link href="/forgot-password" className="font-medium text-[#343494] dark:text-[#b7b7ff] hover:underline">Forgot password?</Link></div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>{loading ? 'Signing in...' : <><Shield size={18} /> Sign In</>}</Button>
            <p className="text-center text-xs text-[var(--gbb-text-muted)]">Authorized personnel only. Contact your administrator for access.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
