"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ManageStudentsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const reqRes = await apiFetch<any>("/teacher-requests");
        setRequests(reqRes.data || []);
      } catch {
        // ignore
      }
      try {
        const enrollRes = await apiFetch<any>("/enrollments");
        setEnrollments(enrollRes.data || []);
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeStudents = requests.filter((item) => item.status === "accepted");
  const normalized = search.trim().toLowerCase();

  const filteredActiveStudents = useMemo(() => {
    if (!normalized) return activeStudents;
    return activeStudents.filter((item) => {
      const name = String(item.student?.name || "").toLowerCase();
      const course = String(item.course?.title || "").toLowerCase();
      return name.includes(normalized) || course.includes(normalized);
    });
  }, [activeStudents, normalized]);

  const filteredEnrollments = useMemo(() => {
    if (!normalized) return enrollments;
    return enrollments.filter((item) => {
      const name = String(item.student?.name || "").toLowerCase();
      const course = String(item.course?.title || "").toLowerCase();
      return name.includes(normalized) || course.includes(normalized);
    });
  }, [enrollments, normalized]);

  const deactivateStudent = async (requestId: string) => {
    try {
      setStatus("");
      setBusyId(requestId);
      await apiFetch(`/teacher-requests/${requestId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      });
      setRequests((prev) =>
        prev.map((item) => (item._id === requestId ? { ...item, status: "cancelled" } : item))
      );
      setStatus("Accepted student deactivated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to deactivate student.");
    } finally {
      setBusyId("");
    }
  };

  const removeEnrollment = async (enrollmentId: string) => {
    try {
      setStatus("");
      setBusyId(enrollmentId);
      await apiFetch(`/enrollments/${enrollmentId}`, { method: "DELETE" });
      setEnrollments((prev) => prev.filter((item) => item._id !== enrollmentId));
      setStatus("Enrollment removed from database.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to remove enrollment.");
    } finally {
      setBusyId("");
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
          <h1 className="text-lg font-semibold text-slate-900">Manage Students</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-700">Student requests</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student or course"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-xs md:w-72"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {requests.length === 0
              ? "No requests yet."
              : `${requests.length} request(s) - ${activeStudents.length} accepted.`}
          </p>
          {status && <p className="mt-2 text-xs text-brand-600">{status}</p>}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Accepted students</p>
          <div className="mt-4 flex flex-col gap-3">
            {filteredActiveStudents.length === 0 && (
              <p className="text-xs text-slate-500">No active students yet.</p>
            )}
            {filteredActiveStudents.map((student) => (
              <div
                key={student._id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                    {(student.student?.name || "S").slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {student.student?.name || "Student"}
                    </p>
                    <p className="text-xs text-slate-500">{student.course?.title || "Course"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-600">
                    Active
                  </span>
                  <button
                    type="button"
                    disabled={busyId === student._id}
                    onClick={() => deactivateStudent(student._id)}
                    className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-600 disabled:opacity-60"
                  >
                    {busyId === student._id ? "Working..." : "Deactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Enrolled students (paid)</p>
          <div className="mt-4 flex flex-col gap-3">
            {filteredEnrollments.length === 0 && (
              <p className="text-xs text-slate-500">No enrolled students yet.</p>
            )}
            {filteredEnrollments.map((enroll) => (
              <div
                key={enroll._id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                    {(enroll.student?.name || "S").slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {enroll.student?.name || "Student"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {enroll.course?.title || "Course"} - {enroll.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-600">
                    Enrolled
                  </span>
                  <button
                    type="button"
                    disabled={busyId === enroll._id}
                    onClick={() => removeEnrollment(enroll._id)}
                    className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-600 disabled:opacity-60"
                  >
                    {busyId === enroll._id ? "Deleting..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
