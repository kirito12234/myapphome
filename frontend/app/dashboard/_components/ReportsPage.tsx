"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type ReportItem = {
  id: string;
  title: string;
  status: "Ready" | "Pending";
  content: Record<string, unknown>;
};

const dummyReports: ReportItem[] = [
  {
    id: "dummy-jan",
    title: "January Teaching Report (Demo)",
    status: "Ready",
    content: { source: "demo", month: "January", notes: "Sample teaching report" },
  },
  {
    id: "dummy-feb",
    title: "February Teaching Report (Demo)",
    status: "Pending",
    content: { source: "demo", month: "February", notes: "Sample report not finalized" },
  },
];

export default function ReportsPage({ role }: { role: "student" | "tutor" }) {
  const [reports, setReports] = useState<ReportItem[]>(dummyReports);

  useEffect(() => {
    const load = async () => {
      try {
        if (role === "tutor") {
          const [coursesRes, enrollmentsRes, paymentsRes, progressRes] = await Promise.all([
            apiFetch<any>("/courses"),
            apiFetch<any>("/enrollments"),
            apiFetch<any>("/payments/summary"),
            apiFetch<any>("/lessons/progress/summary"),
          ]);

          const courseCount = Array.isArray(coursesRes?.data) ? coursesRes.data.length : 0;
          const enrolledCount = Array.isArray(enrollmentsRes?.data) ? enrollmentsRes.data.length : 0;
          const payments = paymentsRes?.data || {};
          const progress = progressRes?.data || {};

          const dbReports: ReportItem[] = [
            {
              id: "db-tutor-overview",
              title: "Teaching Overview Report (Database)",
              status: "Ready",
              content: {
                courses: courseCount,
                enrolledStudents: enrolledCount,
                completionPercentage: Number(progress?.overallPercentage || 0),
                completedStudents: Number(progress?.completedStudents || 0),
                totalEnrolled: Number(progress?.totalEnrolled || 0),
              },
            },
            {
              id: "db-tutor-earnings",
              title: "Earnings Report (Database)",
              status: "Ready",
              content: {
                total: Number(payments?.total || 0),
                thisMonth: Number(payments?.thisMonth || 0),
                lastMonth: Number(payments?.lastMonth || 0),
                pending: Number(payments?.pending || 0),
                currency: String(payments?.currency || "NPR"),
              },
            },
          ];

          setReports([...dbReports, ...dummyReports]);
          return;
        }

        const [coursesRes, sessionsRes] = await Promise.all([
          apiFetch<any>("/courses"),
          apiFetch<any>("/sessions"),
        ]);
        const enrolledCourses = Array.isArray(coursesRes?.data)
          ? coursesRes.data.filter((item: any) => Boolean(item?.hasAccess)).length
          : 0;
        const sessions = Array.isArray(sessionsRes?.data) ? sessionsRes.data : [];
        const completedSessions = sessions.filter((item: any) => String(item?.status || "") === "completed").length;

        const dbReports: ReportItem[] = [
          {
            id: "db-student-learning",
            title: "Student Learning Report (Database)",
            status: "Ready",
            content: {
              enrolledCourses,
              totalSessions: sessions.length,
              completedSessions,
            },
          },
        ];
        setReports([...dbReports, ...dummyReports]);
      } catch {
        setReports(dummyReports);
      }
    };

    load();
  }, [role]);

  const readyCount = useMemo(
    () => reports.filter((item) => item.status === "Ready").length,
    [reports]
  );

  const downloadReport = (item: ReportItem) => {
    const payload = {
      title: item.title,
      status: item.status,
      generatedAt: new Date().toISOString(),
      data: item.content,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-xs text-slate-500">
            Ready reports: {readyCount}/{reports.length}
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                  <p className="text-xs text-slate-500">{report.status}</p>
                </div>
                <button
                  disabled={report.status !== "Ready"}
                  onClick={() => downloadReport(report)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    report.status === "Ready"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
