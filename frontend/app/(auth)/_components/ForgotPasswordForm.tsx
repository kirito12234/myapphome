"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../lib/api";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const extractResetToken = (payload: any): string => {
    const fromMessage = String(payload?.message || "").match(/[A-Za-z0-9]{8,}/)?.[0] || "";
    return (
      payload?.data?.data?.resetToken ||
      payload?.data?.data?.token ||
      payload?.data?.resetToken ||
      payload?.data?.token ||
      payload?.resetToken ||
      payload?.token ||
      fromMessage ||
      ""
    );
  };

  const requestReset = async () => {
    try {
      setStatus("");
      setGeneratedToken("");
      const normalizedEmail = email.trim().toLowerCase();
      const res = await api.forgotPassword({ email: normalizedEmail });
      const resetToken = extractResetToken(res);
      const expiresRaw = (res as any)?.data?.expiresAt || (res as any)?.expiresAt;
      const expiresAt = expiresRaw ? new Date(expiresRaw).toLocaleString() : "";
      setGeneratedToken(resetToken);
      if (resetToken) {
        setStatus(
          expiresAt
            ? `Reset token generated. Expires at ${expiresAt}.`
            : "Reset token generated. Use it below to set a new password."
        );
      } else {
        setStatus(
          "Request accepted. No token returned by API response. Check your email inbox/spam for reset token."
        );
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate reset token.");
    }
  };

  const reset = async () => {
    try {
      setStatus("");
      await api.resetPassword({ token, newPassword });
      setStatus("Password reset successful. You can now log in.");
      setToken("");
      setNewPassword("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to reset password.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">Account Recovery</p>
        <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
        <p className="text-sm text-slate-500">Request reset token and set a new password.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-700">1. Request reset token</p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          placeholder="Enter email"
        />
        <button
          onClick={requestReset}
          className="mt-3 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Request token
        </button>
        {generatedToken && (
          <p className="mt-2 text-xs text-slate-600">
            Token: <span className="font-semibold">{generatedToken}</span>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-700">2. Reset password</p>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          placeholder="Enter reset token"
        />
        <div className="relative mt-2">
          <input
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none"
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400"
            title={showNewPassword ? "Hide password" : "Show password"}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={reset}
          className="mt-3 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Reset password
        </button>
      </div>

      {status && <p className="text-xs text-emerald-600">{status}</p>}

      <p className="text-sm text-slate-500">
        Back to <Link href="/login" className="font-semibold text-brand-600">Login</Link>
      </p>
    </div>
  );
}
