"use client";

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Field, TextInput, Button } from '../components/FormControls';
import { User, Lock, Mail, Phone, Save, KeyRound } from 'lucide-react';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  const [, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() })
      .eq('id', profile!.id);
    setSavingInfo(false);
    if (error) toast(error.message, 'error');
    else {
      toast('Profile updated successfully', 'success');
      refreshProfile();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast(error.message, 'error');
    else {
      toast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator', manager: 'Manager', register_user: 'Register User', assessor: 'Assessor (Read Only)',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><User size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-[#343494]">My Profile</h1>
          <p className="text-sm text-gray-500">Update your information and change password</p>
        </div>
      </div>

      {/* Profile info card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#343494] to-[#4e4ec1] text-white flex items-center justify-center text-2xl font-bold">
            {profile?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{profile?.full_name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Mail size={14} />{profile?.email}</p>
            <span className="text-xs px-2 py-1 rounded-full bg-[#343494]/10 text-[#343494] font-medium mt-1 inline-block">
              {roleLabels[profile?.role ?? '']}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdateInfo} className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2"><User size={18} /> Personal Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label="Email (read only)">
              <TextInput value={profile?.email ?? ''} disabled className="bg-gray-50" />
            </Field>
            <Field label="Phone Number">
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="pl-10" />
              </div>
            </Field>
            <Field label="Role (read only)">
              <TextInput value={roleLabels[profile?.role ?? '']} disabled className="bg-gray-50" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingInfo}>
              {savingInfo ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </Button>
          </div>
        </form>
      </div>

      {/* Password change card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2"><KeyRound size={18} /> Change Password</h4>
          <Field label="New Password" required>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="pl-10" required minLength={6} />
            </div>
          </Field>
          <Field label="Confirm New Password" required>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="pl-10" required minLength={6} />
            </div>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingPassword}>
              {savingPassword ? 'Changing...' : <><KeyRound size={16} /> Change Password</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
