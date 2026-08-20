"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const r = await api.post("/auth/reset-password", { token, password });
    setLoading(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/login"), 1200);
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5fc] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-[#343494]">Reset password</h1>
        {done ? (
          <>
            <p className="mt-4 text-green-700">
              Password updated successfully. Redirecting to login...
            </p>
            <Link className="block mt-5 text-[#343494]" href="/login">
              Go to login
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4 mt-6">
            <input
              className="w-full border rounded-lg px-4 py-3"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
            <input
              className="w-full border rounded-lg px-4 py-3"
              type="password"
              minLength={6}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading || !token}
              className="w-full rounded-lg bg-[#343494] text-white py-3 font-medium"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
