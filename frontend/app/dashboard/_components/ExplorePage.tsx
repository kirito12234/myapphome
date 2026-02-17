"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function ExplorePage({ role }: { role: "student" | "tutor" }) {
  const router = useRouter();
  const [messageSent, setMessageSent] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<any>("/professionals", { auth: false })
      .then((res) => setProfessionals(res.data || []))
      .catch(() => setProfessionals([]));
  }, []);

  const handleMessage = async (tutorId: string) => {
    try {
      setMessageSent(tutorId);
      await apiFetch("/messages/threads/request", {
        method: "POST",
        body: JSON.stringify({ tutorId }),
      });
      setTimeout(() => {
        router.push(`/dashboard/${role}/message`);
      }, 500);
    } catch {
      setMessageSent(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href={`/dashboard/${role}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Explore</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Available professionals</p>
          <div className="mt-4 flex flex-col gap-3">
            {professionals.length === 0 && (
              <p className="text-xs text-slate-500">No professionals available.</p>
            )}
            {professionals.map((pro) => (
              <div
                key={pro._id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{pro.user?.name || "Tutor"}</p>
                  <p className="text-xs text-slate-500">
                    {pro.subjects?.map((s: any) => s.title).join(", ") || "Tutor"} -{" "}
                    {pro.location || "Kathmandu"}
                  </p>
                  <p className="text-xs text-slate-400">Rating {pro.rating || 4.8}</p>
                </div>
                <button
                  onClick={() => {
                    if (role === "student") handleMessage(pro._id);
                  }}
                  disabled={role !== "student" || messageSent === pro._id}
                  className="flex items-center gap-2 rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <MessageSquare className="h-3 w-3" />
                  {role !== "student" ? "Student only" : messageSent === pro._id ? "Sent" : "Message"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
