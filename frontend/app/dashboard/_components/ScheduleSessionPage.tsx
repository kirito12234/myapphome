"use client";

import Link from "next/link";
import { ChevronLeft, Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type CourseItem = {
  _id: string;
  title: string;
};

type EnrollmentItem = {
  _id: string;
  student?: {
    _id?: string;
    name?: string;
  };
  course?: {
    _id?: string;
    title?: string;
  };
  status?: string;
};

export default function ScheduleSessionPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [form, setForm] = useState({
    courseId: "",
    student: "",
    date: "",
    time: "",
    duration: "60",
    notes: "",
  });
  const [status, setStatus] = useState("");
  const notifySessionUpdate = async (payload: {
    studentId?: string;
    course: string;
    date: string;
    time: string;
  }) => {
    const message = `Session scheduled: ${payload.course} on ${payload.date} ${payload.time}`.trim();
    const body = {
      type: "session_updated",
      title: "Session Update",
      message,
      userId: payload.studentId,
      role: "student",
    };
    const attempts = ["/notifications", "/notifications/broadcast"];
    for (const path of attempts) {
      try {
        await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
        return;
      } catch {
        // try next endpoint
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const sessRes = await apiFetch<any>("/sessions");
        setSessions(sessRes.data || []);
      } catch {
        // ignore
      }
      try {
        const enrollRes = await apiFetch<any>("/enrollments");
        setEnrollments(Array.isArray(enrollRes.data) ? enrollRes.data : []);
      } catch {
        // ignore
      }
      try {
        const courseRes = await apiFetch<any>("/courses");
        setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleChange =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((prev) => {
        if (field === "courseId") {
          return { ...prev, courseId: value, student: "" };
        }
        return { ...prev, [field]: value };
      });
    };

  const availableStudents = useMemo(() => {
    const byCourse = form.courseId
      ? enrollments.filter((e) => String(e.course?._id || "") === form.courseId)
      : enrollments;

    const unique = new Map<string, { _id: string; name: string }>();
    byCourse.forEach((item) => {
      const studentId = String(item.student?._id || "");
      if (!studentId || unique.has(studentId)) return;
      unique.set(studentId, {
        _id: studentId,
        name: item.student?.name || "Student",
      });
    });
    return Array.from(unique.values());
  }, [enrollments, form.courseId]);

  const handleCreate = async () => {
    try {
      setStatus("");
      const selectedCourse = courses.find((course) => course._id === form.courseId);
      await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          student: form.student || undefined,
          course: selectedCourse?.title || "Session",
          courseRef: selectedCourse?._id || undefined,
          date: form.date || "",
          time: form.time || "",
          duration: Number(form.duration) || 60,
          notes: form.notes || "",
        }),
      });
      await notifySessionUpdate({
        studentId: form.student || undefined,
        course: selectedCourse?.title || "Session",
        date: form.date || "TBD",
        time: form.time || "",
      });
      setStatus("Session created successfully.");
      // Refresh
      const sessRes = await apiFetch<any>("/sessions");
      setSessions(sessRes.data || []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create session.");
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
          <h1 className="text-lg font-semibold text-slate-900">Schedule Session</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Upcoming sessions</p>
          <div className="mt-4 flex flex-col gap-3">
            {sessions.length === 0 && (
              <p className="text-xs text-slate-500">No sessions yet.</p>
            )}
            {sessions.map((session) => (
              <div
                key={session._id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {session.course || "Session"} · {session.student?.name || "Student"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session.date || "TBD"} {session.time || ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    session.status === "completed"
                      ? "bg-emerald-100 text-emerald-600"
                      : session.status === "cancelled"
                        ? "bg-rose-100 text-rose-500"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {session.status || "Scheduled"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Create session</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              value={form.courseId}
              onChange={handleChange("courseId")}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title || "Course"}
                </option>
              ))}
            </select>
            <select
              value={form.student}
              onChange={handleChange("student")}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            >
              <option value="">Select student</option>
              {availableStudents.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            {form.courseId && availableStudents.length === 0 && (
              <p className="text-xs text-rose-500 md:col-span-2">
                No enrolled students found for this course.
              </p>
            )}
            <input
              value={form.date}
              onChange={handleChange("date")}
              placeholder="Pick date (YYYY-MM-DD)"
              type="date"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <input
              value={form.time}
              onChange={handleChange("time")}
              placeholder="Pick time"
              type="time"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <input
              value={form.duration}
              onChange={handleChange("duration")}
              placeholder="Duration (minutes)"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <input
              value={form.notes}
              onChange={handleChange("notes")}
              placeholder="Notes (optional)"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 w-full rounded-2xl bg-brand-600 px-4 py-3 text-xs font-semibold text-white"
          >
            Create session
          </button>
          {status && <p className="mt-2 text-xs text-emerald-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}
