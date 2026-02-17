"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import DashboardNav from "./DashboardNav";
import { apiFetch, apiHost } from "../../lib/api";

const NAME_STORAGE_KEY = "hometutor.name";

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [requestedIds, setRequestedIds] = useState<number[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [learnedMinutes, setLearnedMinutes] = useState(0);

  useEffect(() => {
    const storedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (storedName) {
      setStudentName(storedName.split(" ")[0]);
    }
    const load = async () => {
      try {
        const tutorRes = await apiFetch<any>("/tutors", { auth: false });
        setTutors(tutorRes.data || []);
        // Load courses that student has access to
        const coursesRes = await apiFetch<any>("/courses");
        const coursesData = Array.isArray(coursesRes.data) ? coursesRes.data : (coursesRes as any).data?.data || [];
        setCourses(coursesData);
        const sessionsRes = await apiFetch<any>("/sessions");
        const today = new Date().toISOString().slice(0, 10);
        const todaysMinutes = (sessionsRes.data || [])
          .filter((s: any) => String(s.date || "").slice(0, 10) === today)
          .reduce((sum: number, s: any) => sum + Number(s.duration || 0), 0);
        setLearnedMinutes(todaysMinutes);
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleRequest = (id: number) => {
    if (!requestedIds.includes(id)) {
      setRequestedIds((prev) => [...prev, id]);
      const tutor = tutors.find((item) => item.user?._id === id || item._id === id);
      if (tutor) {
        apiFetch("/teacher-requests", {
          method: "POST",
          body: JSON.stringify({
            tutor: tutor.user?._id || tutor._id,
            message: `Request from ${studentName}`
          })
        }).catch(() => {});
      }
    }
  };

  const tutorCards = useMemo(() => tutors, [tutors]);
  const dailyGoal = 60;
  const learnedProgress = Math.min(100, Math.round((learnedMinutes / dailyGoal) * 100));
  const resolveCourseImage = (course: any) => {
    const raw = course?.thumbnailUrl || course?.imageUrl || "";
    if (!raw) return "";
    return String(raw).startsWith("http") ? raw : `${apiHost}${raw}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <DashboardNav role="student" />

        <div className="flex flex-1 flex-col gap-8">
          <div className="rounded-3xl bg-brand-600 p-6 text-white shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Hi, {studentName}</h1>
                <p className="text-sm text-brand-50">Let&apos;s start learning</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <span className="text-sm font-semibold">ST</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/student/learn-today"
            className="rounded-3xl bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div>
                <p className="font-semibold text-slate-900">Learned today</p>
                <p>{learnedMinutes} min / {dailyGoal} min</p>
              </div>
              <span className="font-semibold text-brand-600">{learnedProgress}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-orange-400" style={{ width: `${learnedProgress}%` }} />
            </div>
          </Link>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-brand-100 p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
                  <GraduationCap className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">What do you want to learn today?</p>
                  <p className="text-xs text-slate-500">Pick a course and start now.</p>
                </div>
              </div>
              <Link
                href="/dashboard/student/course"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </div>

            {courses.length > 0 ? (
              <Link
                href={`/dashboard/student/course/${courses[0]._id || courses[0].id}`}
                className="rounded-3xl bg-orange-100 p-5 shadow-soft transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Continue learning</p>
                    <p className="text-xs text-slate-500">{courses[0].title || "Course"}</p>
                  </div>
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-orange-400/20">
                    {resolveCourseImage(courses[0]) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveCourseImage(courses[0])}
                        alt={courses[0].title || "Course"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen className="h-5 w-5 text-orange-500" />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-3xl bg-orange-100 p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">No courses yet</p>
                    <p className="text-xs text-slate-500">Request a tutor to get started</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-400/20">
                    <BookOpen className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Learning Plan</h2>
              <Link href="/dashboard/student/course" className="text-sm font-semibold text-brand-600">
                View all
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {courses.length > 0 ? (
                courses.slice(0, 3).map((course) => (
                  <Link
                    key={course._id || course.id}
                    href={`/dashboard/student/course/${course._id || course.id}`}
                    className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-slate-50"
                  >
                    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-brand-600 bg-brand-100">
                      {resolveCourseImage(course) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveCourseImage(course)}
                          alt={course.title || "Course"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-brand-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{course.title || "Course"}</p>
                      <p className="text-xs text-slate-500">
                        {course.tutor?.name || "Teacher"} • {course.category || "General"}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No courses available yet</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Top Tutors</h2>
              <Link href="/dashboard/student/search" className="text-sm font-semibold text-brand-600">
                See more
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {tutorCards.map((tutor: any) => (
                <div key={tutor.user?._id || tutor._id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {tutor.user?.name || tutor.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {tutor.subjects?.map((s: any) => s.title).join(", ") || "Tutor"} •{" "}
                        {tutor.location || "Kathmandu"}
                      </p>
                    </div>
                    <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                      {tutor.rating || 4.8} ★
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-700">
                    {tutor.hourlyRate ? `Rs ${tutor.hourlyRate}/hr` : "Rs 800/hr"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRequest(tutor.user?._id || tutor._id)}
                    className={`mt-4 w-full rounded-2xl px-4 py-2 text-xs font-semibold ${
                      requestedIds.includes(tutor.user?._id || tutor._id)
                        ? "bg-slate-100 text-slate-400"
                        : "bg-brand-600 text-white hover:bg-brand-500"
                    }`}
                    disabled={requestedIds.includes(tutor.user?._id || tutor._id)}
                  >
                    {requestedIds.includes(tutor.user?._id || tutor._id) ? "Request sent" : "Request tutor"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
