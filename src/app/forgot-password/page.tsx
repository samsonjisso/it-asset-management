"use client";
import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setLoading(true); const r = await api.post<{message:string}>('/auth/forgot-password', { email }); setLoading(false); setMessage(r.data?.message || r.error?.message || 'Please try again.'); }
  return <div className="min-h-screen flex items-center justify-center bg-[#f5f5fc] p-4"><div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"><h1 className="text-2xl font-bold text-[#343494]">Forgot password</h1><p className="text-sm text-gray-500 mt-2">Enter your account email. If the account exists, you will receive a reset link.</p><form onSubmit={submit} className="space-y-4 mt-6"><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input className="w-full border rounded-lg px-10 py-3" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@gohbetochbank.com"/></div><button disabled={loading} className="w-full rounded-lg bg-[#343494] text-white py-3 font-medium">{loading?'Sending...':'Send reset link'}</button></form>{message && <p className="mt-4 text-sm text-gray-600">{message}</p>}<Link className="block mt-6 text-sm text-[#343494] hover:underline" href="/login">Back to login</Link></div></div>;
}
