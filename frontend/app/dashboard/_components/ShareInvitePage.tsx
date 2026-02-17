"use client";

import Link from "next/link";
import { ChevronLeft, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ShareInvitePage() {
  const [status, setStatus] = useState("");
  const [invitePath, setInvitePath] = useState("/invite/teacher");
  const [stats, setStats] = useState({
    clicks: 0,
    opens: 0,
    copies: 0,
    shares: 0,
    createdAt: "",
  });

  useEffect(() => {
    apiFetch<any>("/invites/my")
      .then((res) => {
        setInvitePath(String(res?.data?.path || "/invite/teacher"));
        setStats({
          clicks: Number(res?.data?.clicks || 0),
          opens: Number(res?.data?.opens || 0),
          copies: Number(res?.data?.copies || 0),
          shares: Number(res?.data?.shares || 0),
          createdAt: String(res?.data?.createdAt || ""),
        });
      })
      .catch(() => {
        setStatus("Unable to load invite link.");
      });
  }, []);

  const inviteLink =
    typeof window === "undefined"
      ? invitePath
      : `${window.location.origin}${invitePath}`;

  const track = async (action: "copy" | "share" | "click") => {
    try {
      await apiFetch("/invites/my/track", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setStats((prev) => ({
        ...prev,
        copies: action === "copy" ? prev.copies + 1 : prev.copies,
        shares: action === "share" ? prev.shares + 1 : prev.shares,
        clicks: action === "click" ? prev.clicks + 1 : prev.clicks,
      }));
    } catch {
      // ignore tracking failures
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      await track("copy");
      setStatus("Invite copied to clipboard.");
    } catch {
      setStatus("Unable to copy. Please copy manually.");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join HomeTutor",
          text: "Join me on HomeTutor using this invite link.",
          url: inviteLink,
        });
        await track("share");
        setStatus("Invite shared.");
        return;
      }
      await handleCopy();
    } catch {
      setStatus("Unable to share invite.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href="/dashboard/tutor"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Share Invite</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Invite link</p>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 break-all">
            {inviteLink}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
            >
              <Share2 className="h-4 w-4" />
              Copy invite
            </button>
            <button
              onClick={handleShare}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Share now
            </button>
            <a
              href={inviteLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("click")}
              className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700"
            >
              Open invite page
            </a>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Opens: <span className="font-semibold text-slate-900">{stats.opens}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Clicks: <span className="font-semibold text-slate-900">{stats.clicks}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Copies: <span className="font-semibold text-slate-900">{stats.copies}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Shares: <span className="font-semibold text-slate-900">{stats.shares}</span>
            </div>
          </div>
          {stats.createdAt && (
            <p className="mt-2 text-xs text-slate-500">
              Link created: {new Date(stats.createdAt).toLocaleString()}
            </p>
          )}
          {status && <p className="mt-2 text-xs text-emerald-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}
