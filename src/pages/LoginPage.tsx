"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { GBBLogo } from "../components/GBBLogo";
import { isValidEmail } from "../lib/validation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";

const REMEMBER_KEY = "gbb_remembered_email";

// Single centered-card layout (matches the plain reference "Login"
// template) instead of the old split welcome-panel shell — one card,
// on a brand-colored gradient backdrop, with the GBB logo on top.
// Kept from the system's original login page: work-email + password
// validation, the show/hide password toggle, "remember my email", and
// routing "Forgot password?" to the IT-administrator contact flow
// rather than a self-service reset. Dropped: the sign-up link — there
// is no self-registration, accounts are provisioned by an administrator.
export function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Same validation pattern as every other form in the app (see
    // noValidate on this <form>): one check at a time, stop and toast
    // on the first issue, so the browser's own — inconsistently worded
    // and unstyled — validation popup never fires alongside it.
    if (!email.trim()) {
      toast("Work email is required", "error");
      return;
    }
    if (!isValidEmail(email)) {
      toast("Please enter a valid email address", "error");
      return;
    }
    if (!password) {
      toast("Password is required", "error");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast(error, "error");
    } else {
      if (rememberEmail) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      toast(
        "Welcome to Goh Betoch Bank Asset Inventory Management Portal",
        "success",
      );
    }
  };

  const contactIT = () =>
    toast(
      "Please contact your IT Administrator for account access or password resets.",
      "info",
    );

  return (
    <main className="login-page">
      <div className="login-card">
        <GBBLogo size={88} className="login-logo" />
        <h1 className="login-title">Login</h1>
        <p className="login-subtitle">Asset Inventory Management Portal</p>

        <form noValidate className="login-form" onSubmit={handleSubmit}>
          <div className="gbb-input-wrap">
            <Mail
              className="input-icon"
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="gbb-input-wrap">
            <LockKeyhole
              className="input-icon"
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="visibility-button"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={17} strokeWidth={1.8} />
              ) : (
                <Eye size={17} strokeWidth={1.8} />
              )}
            </button>
          </div>

          <div className="login-row">
            <label className="remember-row">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
              />
              <span className="custom-checkbox">
                {rememberEmail && <Check size={12} strokeWidth={3} />}
              </span>
              <span>Remember my email</span>
            </label>
          </div>

          <button className="sign-in-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}{" "}
            <ArrowRight size={17} strokeWidth={2.2} />
          </button>
        </form>

        <button className="forgot-button" type="button" onClick={contactIT}>
          Forgot <span>Password?</span>
        </button>
        <p className="login-footer-note">
          Need access?{" "}
          <button type="button" onClick={contactIT}>
            Contact your IT Administrator
          </button>
        </p>
      </div>
    </main>
  );
}
