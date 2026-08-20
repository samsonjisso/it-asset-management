"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Field, TextInput, Button } from '../../components/FormControls';
import { GBBLogo } from '../../components/GBBLogo';
import { KeyRound, Lock, ShieldCheck, LogOut } from 'lucide-react';

// Shown instead of the app when the signed-in user's account has
// must_change_password set — by an admin creating the account, by an
// admin resetting their password, or on the seeded default admin
// account. The user cannot proceed until they set their own password.
export function ForcePasswordChangePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Password updated successfully', 'success');
    await refreshProfile();
  };

  return (
    <div className="min-h-screen flex items-center justify-center gbb-mesh-bg p-4">
      <div className="bg-white rounded-2xl shadow-lift border border-gray-100 p-8 max-w-md w-full gbb-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white rounded-xl p-2 shadow-soft border border-gray-100">
            <GBBLogo size={40} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-700">Set a New Password</h2>
            <p className="text-xs text-gray-500">Required before you can continue</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
          <ShieldCheck size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            {profile?.full_name ? `Hi ${profile.full_name}, your` : 'Your'} account requires a password change
            before you can access the Asset Inventory Management Portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New Password" required>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="pl-10"
                required
                minLength={6}
                autoFocus
              />
            </div>
          </Field>
          <Field label="Confirm New Password" required>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pl-10"
                required
                minLength={6}
              />
            </div>
          </Field>
          <Button type="submit" variant="primary" className="w-full" disabled={saving}>
            {saving ? 'Updating...' : <><KeyRound size={16} /> Set Password &amp; Continue</>}
          </Button>
        </form>

        <button
          onClick={signOut}
          className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={14} /> Sign out instead
        </button>
      </div>
    </div>
  );
}
