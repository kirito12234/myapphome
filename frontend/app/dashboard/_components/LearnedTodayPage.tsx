"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "../../lib/api";

type SessionStatus = "scheduled" | "completed" | "cancelled";

const toLocalDateKey = (dateValue?: string) => {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue).slice(0, 10);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function LearnedTodayPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [dailyGoal, setDailyGoal] = useState(60);
  const [status, setStatus] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [updatingSessionId, setUpdatingSessionId] = useState("");
  const [showFilterHint, setShowFilterHint] = useState(false);

  const load = async () => {
    try {
      const [sessionsRes, meRes] = await Promise.all([
        apiFetch<any>("/sessions"),
        apiFetch<any>("/users/me"),
      ]);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      const storedGoal = Number(meRes?.data?.settings?.learnedDailyGoal || 60);
      setDailyGoal(Math.max(1, Number.isFinite(storedGoal) ? storedGoal : 60));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load sessions.");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const todayKey = toLocalDateKey(new Date().toISOString());
  const todaysSessions = useMemo(
    () => sessions.filter((s) => toLocalDateKey(String(s.date || "")) === todayKey),
    [sessions, todayKey]
  );

  const learnedMinutes = useMemo(
    () =>
      todaysSessions
        .filter((s) => String(s.status || "").toLowerCase() === "completed")
        .reduce((sum, s) => sum + Number(s.duration || 0), 0),
    [todaysSessions]
  );

  const progress = Math.min(100, Math.round((learnedMinutes / Math.max(1, dailyGoal)) * 100));

  const statusCounts = useMemo(() => {
    const scheduled = todaysSessions.filter((s) => String(s.status || "").toLowerCase() === "scheduled").length;
    const completed = todaysSessions.filter((s) => String(s.status || "").toLowerCase() === "completed").length;
    const cancelled = todaysSessions.filter((s) => String(s.status || "").toLowerCase() === "cancelled").length;
    return { scheduled, completed, cancelled };
  }, [todaysSessions]);

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return todaysSessions.filter((session) => {
      const sessionStatus = String(session.status || "scheduled").toLowerCase() as SessionStatus;
      const statusOk = statusFilter === "all" || sessionStatus === statusFilter;
      const course = String(session.course || "").toLowerCase();
      const student = String(session.student?.name || "").toLowerCase();
      const tutor = String(session.tutor?.name || "").toLowerCase();
      const queryOk = !normalized || course.includes(normalized) || student.includes(normalized) || tutor.includes(normalized);
      return statusOk && queryOk;
    });
  }, [todaysSessions, statusFilter, query]);

  const saveDailyGoal = async (nextGoal: number) => {
    const safeGoal = Math.max(1, nextGoal || 60);
    setDailyGoal(safeGoal);
    try {
      setIsSavingGoal(true);
      await apiFetch("/users/me/settings", {
        method: "PUT",
        body: JSON.stringify({ learnedDailyGoal: safeGoal }),
      });
      setStatus("Daily goal updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save daily goal.");
    } finally {
      setIsSavingGoal(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, nextStatus: SessionStatus) => {
    if (!sessionId) return;
    try {
      setUpdatingSessionId(sessionId);
      await apiFetch(`/sessions/${sessionId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setSessions((prev) =>
        prev.map((session) =>
          String(session._id) === String(sessionId) ? { ...session, status: nextStatus } : session
        )
      );
      setStatus(`Session marked ${nextStatus}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update session status.");
    } finally {
      setUpdatingSessionId("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center justify-start gap-3">
          <Link
            href="/dashboard/student"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Learned today</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div>
              <p className="font-semibold text-slate-900">Learned today</p>
              <p>
                {learnedMinutes} min / {dailyGoal} min
              </p>
            </div>
            <p className="font-semibold text-brand-600">{progress}%</p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-orange-400" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-600">Scheduled: {statusCounts.scheduled}</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-600">Completed: {statusCounts.completed}</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-600">Cancelled: {statusCounts.cancelled}</div>
          </div>
          <div className="mt-4 flex w-full max-w-[240px] items-center gap-2">
            <input
              type="number"
              min={1}
              value={dailyGoal}
              onChange={(event) => setDailyGoal(Math.max(1, Number(event.target.value) || 60))}
              onBlur={() => saveDailyGoal(dailyGoal)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
              placeholder="Daily goal (min)"
            />
            <button
              type="button"
              onClick={() => saveDailyGoal(dailyGoal)}
              disabled={isSavingGoal}
              className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isSavingGoal ? "Saving" : "Save"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-slate-400">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search session or student"
              className="flex-1 bg-transparent text-sm text-slate-600 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowFilterHint((prev) => !prev)}
              className="rounded-full p-1 text-slate-500"
              title="Filter help"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {showFilterHint && (
            <p className="mt-2 text-xs text-slate-500">Use status chips and search to quickly find sessions.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "scheduled", label: "Scheduled" },
              { key: "completed", label: "Completed" },
              { key: "cancelled", label: "Cancelled" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key as "all" | SessionStatus)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusFilter === item.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {filteredSessions.map((session) => {
              const sessionStatus = String(session.status || "scheduled").toLowerCase() as SessionStatus;
              return (
                <div key={session._id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{session.course || "Session"}</p>
                  <p className="text-xs text-slate-500">
                    {session.date || "TBD"} {session.time || ""} - {session.duration || 0} min
                  </p>
                  <p className="text-xs text-slate-500">
                    Student: {session.student?.name || "N/A"} - Tutor: {session.tutor?.name || "N/A"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        sessionStatus === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : sessionStatus === "cancelled"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {sessionStatus}
                    </span>
                    <button
                      type="button"
                      disabled={updatingSessionId === String(session._id)}
                      onClick={() => updateSessionStatus(String(session._id), "completed")}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={updatingSessionId === String(session._id)}
                      onClick={() => updateSessionStatus(String(session._id), "scheduled")}
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Scheduled
                    </button>
                    <button
                      type="button"
                      disabled={updatingSessionId === String(session._id)}
                      onClick={() => updateSessionStatus(String(session._id), "cancelled")}
                      className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredSessions.length === 0 && <p className="text-xs text-slate-500">No matching sessions for today.</p>}
          </div>
          {status && <p className="mt-3 text-xs text-emerald-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}
