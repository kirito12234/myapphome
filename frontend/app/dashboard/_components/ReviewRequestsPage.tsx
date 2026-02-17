"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, apiHost } from "../../lib/api";

export default function ReviewRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  const loadRequests = async () => {
    try {
      const res = await apiFetch<any>("/payments/pending");
      const list = Array.isArray(res?.data) ? res.data : [];
      setRequests(list);
    } catch {
      // ignore periodic refresh errors to keep page usable
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/payments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "approved" }),
      });
      setRequests((prev) => prev.filter((item) => String(item?._id || item?.id) !== String(id)));
      setStatus("Payment approved.");
    } catch {
      setStatus("Failed to approve payment.");
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
          <h1 className="text-lg font-semibold text-slate-900">Review Requests</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Payment requests</p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {requests.length === 0 && (
              <p className="text-xs text-slate-500">No payment submissions yet.</p>
            )}
            {requests.map((request) => {
              const requestId = String(request?._id || request?.id || "");
              const studentName =
                request?.student?.name || request?.studentName || request?.user?.name || "Student";
              const courseTitle = request?.course?.title || request?.courseTitle || "Course";
              const screenshotPath = request?.screenshotUrl || request?.screenshot || "";
              const screenshotUrl = screenshotPath
                ? screenshotPath.startsWith("http")
                  ? screenshotPath
                  : `${apiHost}${screenshotPath}`
                : "";

              return (
                <div
                  key={requestId}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{studentName}</p>
                    <p className="text-xs text-slate-500">{courseTitle}</p>
                    <p className="text-xs text-slate-400">{screenshotPath || "Screenshot"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {screenshotUrl && (
                      <a
                        href={screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand-600"
                      >
                        View
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApprove(requestId)}
                      disabled={request?.status === "approved"}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        request?.status === "approved"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {request?.status === "approved" ? "Approved" : "Approve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {status && <p className="mt-3 text-xs text-emerald-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}
