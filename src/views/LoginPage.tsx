"use client";

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { GBBLogo } from '../components/GBBLogo';
import { Button, TextInput } from '../components/FormControls';
import { Lock, Mail, Shield, Server, Database, Network } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Welcome to Goh Betoch Bank IT Asset Inventory', 'success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#242467] via-[#343494] to-[#4e4ec1]">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#ffc800]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#ffc800]/10 blur-3xl" />
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Floating icons */}
      <div className="absolute top-20 left-20 text-[#ffc800]/20 hidden lg:block">
        <Server size={64} />
      </div>
      <div className="absolute bottom-32 right-24 text-[#ffc800]/20 hidden lg:block">
        <Network size={56} />
      </div>
      <div className="absolute top-1/2 right-16 text-[#ffc800]/15 hidden lg:block">
        <Database size={48} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/97 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden gbb-fade-in">
          {/* Header with logo */}
          <div className="bg-gradient-to-r from-[#343494] to-[#4e4ec1] px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-white rounded-2xl p-3 shadow-lg">
                <GBBLogo size={68} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-3">Goh Betoch Bank</h1>
            <p className="text-[#ffc800] font-semibold text-sm mt-1 tracking-wide uppercase">
              IT Asset Inventory Management System
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <TextInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gohbetochbank.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <TextInput
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Sign In
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Authorized personnel only. Contact your administrator for access.
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center">
            <p className="text-xs text-gray-600">
              Developed In-house by{' '}
              <span className="font-semibold text-[#343494]">
                Infrastructure Management Department
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Server and Datacenter Team / Samuel T.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
