"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export default function PublicInvitePage({ params }: { params: { code: string } }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("Loading invite...");

  useEffect(() => {
    fetch(`${API_BASE}/invites/public/${params.code}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Invite not found");
        }
        return json;
      })
      .then((json) => {
        setData(json.data || null);
        setStatus("");
      })
      .catch((error) => {
        setData(null);
        setStatus(error instanceof Error ? error.message : "Invite not found");
      });
  }, [params.code]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Tutor Invite</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          {data ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-slate-900">
                You are invited by {data?.tutor?.name || "Tutor"}
              </p>
              <p className="text-xs text-slate-500">
                Subject: {data?.tutor?.subject || "General"} {data?.tutor?.experience ? `| Experience: ${data.tutor.experience}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={data?.joinUrl || "/register?role=student"}
                  className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Join as student
                </Link>
                <Link
                  href="/login?role=student"
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Already have account
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
}
