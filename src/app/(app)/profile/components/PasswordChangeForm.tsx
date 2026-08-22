"use client";

// "Change Password" form. All state/mutation logic lives in
// usePasswordChange; this component only renders fields and wires events.

import { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { Field, TextInput, Button } from "../../../../components/FormControls";
import { usePasswordChange } from "../hooks/usePasswordChange";

export function PasswordChangeForm() {
  const {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    savingPassword,
    handleChangePassword,
  } = usePasswordChange();

  // Purely local UI state — visibility toggles don't affect validation
  // or submission, so they stay in the component rather than the hook.
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <form onSubmit={handleChangePassword} className="space-y-4">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <KeyRound size={18} /> Change Password
        </h4>
        <Field label="New Password" required>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <TextInput
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="pl-10 pr-10"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Field label="Confirm New Password" required>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <TextInput
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="pl-10 pr-10"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={savingPassword}>
            {savingPassword ? (
              "Changing..."
            ) : (
              <>
                <KeyRound size={16} /> Change Password
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
