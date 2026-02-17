"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function SettingsPage({ role }: { role: "student" | "tutor" }) {
  const [email, setEmail] = useState("shreeya@mail.com");
  const [phone, setPhone] = useState("+977 9800000000");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [status, setStatus] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    apiFetch<any>("/users/me")
      .then((res) => {
        const user = res.data;
        if (user) {
          setEmail(user.email || email);
          setPhone(user.phone || phone);
          const settings = user.settings || {};
          setTwoFactor(Boolean(settings.twoFactorEnabled));
          setPrivateAccount(Boolean(settings.showProfile ?? true));
          setNotifications(Boolean(settings.emailUpdates ?? true));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = () => {
    apiFetch("/users/me", {
      method: "PUT",
      body: JSON.stringify({ email, phone })
    })
      .then(() => setStatus("Profile settings saved."))
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Save failed.")
      );
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      setStatus("Enter your current password.");
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    apiFetch("/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword })
    })
      .then(() => {
        setStatus("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      })
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Password update failed.")
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href={`/dashboard/${role}/account`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Settings &amp; Privacy</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">Profile details</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
              placeholder="Email"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
              placeholder="Phone"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Save profile
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">Privacy &amp; security</h2>
          <div className="mt-4 flex flex-col gap-3 text-xs text-slate-600">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              Private account
              <input
                type="checkbox"
                checked={privateAccount}
                onChange={() => setPrivateAccount((prev) => !prev)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              Two-factor authentication
              <input
                type="checkbox"
                checked={twoFactor}
                onChange={() => setTwoFactor((prev) => !prev)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              Email notifications
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications((prev) => !prev)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
            </label>
          </div>
          <button
            onClick={() => {
              apiFetch("/users/me/settings", {
                method: "PUT",
                body: JSON.stringify({
                  settings: {
                    twoFactorEnabled: twoFactor,
                    showProfile: privateAccount,
                    emailUpdates: notifications
                  }
                })
              })
                .then(() => setStatus("Privacy settings saved."))
                .catch((error) =>
                  setStatus(error instanceof Error ? error.message : "Save failed.")
                );
            }}
            className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Save privacy settings
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">Change password</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 pr-10 text-xs"
                placeholder="Current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 pr-10 text-xs"
                placeholder="New password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 pr-10 text-xs"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Update password
          </button>
        </div>

        {status && <p className="text-xs text-emerald-600">{status}</p>}
      </div>
    </div>
  );
}
