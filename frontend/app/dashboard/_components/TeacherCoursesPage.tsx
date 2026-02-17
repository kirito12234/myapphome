"use client";

import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, getUser } from "../../lib/api";

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch<any>("/courses");
        const user = getUser<{ _id?: string }>();
        const data = response.data || [];
        const filtered = user?._id
          ? data.filter((course: any) => course.tutor?._id === user._id)
          : data;
        setCourses(filtered);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load courses.");
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async () => {
    if (confirmId === null) return;
    await apiFetch(`/courses/${confirmId}`, { method: "DELETE" }).catch(() => {});
    setCourses((prev) => prev.filter((course) => course._id !== confirmId));
    setConfirmId(null);
    setStatus("Course deleted.");
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
          <h1 className="text-lg font-semibold text-slate-900">My Courses</h1>
        </div>

        <Link
          href="/dashboard/tutor/create-course"
          className="rounded-2xl bg-brand-600 px-4 py-3 text-center text-xs font-semibold text-white"
        >
          Create course
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Courses</p>
            <button
              onClick={() => {
                setStatus("Clear all not supported by API.");
              }}
              className="text-xs font-semibold text-slate-500"
            >
              Clear courses
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {courses.length === 0 && <p className="text-xs text-slate-500">No courses yet.</p>}
            {courses.map((course) => (
              <Link
                key={course._id}
                href={`/dashboard/tutor/course/${course._id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                  <p className="text-xs text-slate-500">{course.category}</p>
                  <p className="text-xs text-slate-400">
                    {course.createdAt ? course.createdAt.split("T")[0] : ""}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                    {course.isNew ? "new" : course.isPopular ? "popular" : "active"}
                  </span>
                </div>
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setConfirmId(course._id);
                  }}
                  className="rounded-full bg-slate-100 p-2 text-slate-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Link>
            ))}
          </div>
        </div>

        {status && <p className="text-xs text-emerald-600">{status}</p>}
      </div>

      {confirmId !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-900">Delete course?</p>
            <p className="mt-2 text-xs text-slate-500">This action cannot be undone.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
