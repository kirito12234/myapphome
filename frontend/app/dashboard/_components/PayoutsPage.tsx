"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, QrCode, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, getUser, apiHost } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

const paymentMethods = [
  { id: "esewa", label: "eSewa" },
  { id: "khalti", label: "Khalti" },
  { id: "imepay", label: "IME Pay" },
  { id: "bank", label: "Bank Transfer" }
] as const;

type MethodId = (typeof paymentMethods)[number]["id"];

export default function PayoutsPage({ role }: { role: "student" | "tutor" }) {
  const searchParams = useSearchParams();
  const normalizeMethod = (value: string): MethodId | null => {
    const key = String(value || "").trim().toLowerCase().replace(/[\s_-]/g, "");
    if (key === "esewa") return "esewa";
    if (key === "khalti") return "khalti";
    if (key === "imepay" || key === "ime") return "imepay";
    if (key === "bank" || key === "banktransfer") return "bank";
    return null;
  };
  const withCacheBust = (url: string, stamp?: string | number) => {
    if (!url) return "";
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}cb=${encodeURIComponent(String(stamp || Date.now()))}`;
  };
  const [method, setMethod] = useState<MethodId>("khalti");
  const [methodQrs, setMethodQrs] = useState<Record<MethodId, { name: string; url: string }>>({
    esewa: { name: "", url: "" },
    khalti: { name: "", url: "" },
    imepay: { name: "", url: "" },
    bank: { name: "", url: "" }
  });
  const [status, setStatus] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [premiumPlan] = useState({ title: "Premium Plan", amount: "NPR 600/month", cycle: "Monthly billing" });
  const source = searchParams.get("from");
  const backHref = source === "account" ? `/dashboard/${role}/account` : `/dashboard/${role}`;
  const recentCourses = useMemo(
    () => [...courses].sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""))),
    [courses]
  );

  const activeMethodQr = methodQrs[method];

  useEffect(() => {
    const load = async () => {
      try {
        if (role === "tutor") {
          const payoutSettings = await apiFetch<any>("/payout-settings");
          const settings = Array.isArray(payoutSettings.data) ? payoutSettings.data : payoutSettings.data || [];
          if (settings.length > 0) {
            const nextQrs: Record<MethodId, { name: string; url: string }> = {
              esewa: { name: "", url: "" },
              khalti: { name: "", url: "" },
              imepay: { name: "", url: "" },
              bank: { name: "", url: "" }
            };
            const latestByMethod: Record<MethodId, { item: any; rank: number } | null> = {
              esewa: null,
              khalti: null,
              imepay: null,
              bank: null
            };
            settings.forEach((item: any, index: number) => {
              const key = normalizeMethod(item.method);
              if (key && nextQrs[key]) {
                const ts = new Date(item?.updatedAt || item?.createdAt || "").getTime();
                const rank = Number.isFinite(ts) && ts > 0 ? ts : index + 1;
                const prev = latestByMethod[key];
                if (!prev || rank >= prev.rank) {
                  latestByMethod[key] = { item, rank };
                }
              }
            });
            (Object.keys(latestByMethod) as MethodId[]).forEach((key) => {
              const picked = latestByMethod[key]?.item;
              if (!picked) return;
              nextQrs[key] = {
                name: picked.details?.name || "",
                url: withCacheBust(picked.details?.qrImageUrl || "", picked.updatedAt || picked.createdAt || Date.now())
              };
            });
            setMethodQrs(nextQrs);
            const hasCurrent = settings.some((item: any) => normalizeMethod(item.method) === method);
            if (!hasCurrent) {
              const firstMethod = normalizeMethod(settings[0]?.method || "");
              if (firstMethod) {
                setMethod(firstMethod);
              }
            }
          }
          const pending = await apiFetch<any>("/payments/pending");
          setPayments(pending.data || []);
        }
        const coursesRes = await apiFetch<any>("/courses");
        const courseList = Array.isArray(coursesRes?.data) ? coursesRes.data : [];
        const currentUser = getUser<{ _id?: string }>();
        const ownOrAvailableCourses =
          role === "tutor"
            ? courseList.filter((item: any) => item.tutor?._id === currentUser?._id)
            : courseList;
        setCourses(ownOrAvailableCourses);
        setCreatedCount(ownOrAvailableCourses.length);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load payouts.");
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [role]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href={backHref}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Payouts</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Course Created</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{createdCount}</p>
              <p className="text-xs text-slate-500">Active courses on your profile</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                {premiumPlan.title}
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">{premiumPlan.amount}</p>
              <p className="text-xs text-emerald-700">{premiumPlan.cycle}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Select Payment Method</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-500">
              {paymentMethods.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMethod(item.id);
                  }}
                  className={`rounded-full border px-4 py-2 ${
                    method === item.id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <div className="w-56 rounded-2xl bg-slate-900 p-4 text-center text-[11px] text-white shadow-soft">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-white">
                {activeMethodQr.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeMethodQr.url.startsWith("http") ? activeMethodQr.url : `${apiHost}${activeMethodQr.url}`} alt={`${method} QR`} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <QrCode className="h-10 w-10 text-slate-700" />
                )}
              </div>
              <p className="mt-2 font-semibold capitalize">{method}</p>
              <p className="text-slate-300">{activeMethodQr.name || `Upload ${method} QR`}</p>
              <p className="text-slate-400">Teacher QR</p>
            </div>
          </div>

          <label className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload {method} QR
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] text-violet-600">
              Browse
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("qrCode", file);
                apiFetch<any>("/payout-settings/upload-qr", { method: "POST", body: fd, isForm: true })
                  .then((res) => {
                    const url = res.data?.url;
                    const versionedUrl = withCacheBust(url || "", Date.now());
                    setMethodQrs((prev) => ({
                      ...prev,
                      [method]: { name: file.name, url: versionedUrl }
                    }));
                    return apiFetch("/payout-settings", {
                      method: "POST",
                      body: JSON.stringify({
                        method,
                        details: { qrImageUrl: url, name: file.name },
                        isDefault: true
                      })
                    }).then(() => ({ url: versionedUrl, name: file.name }));
                  })
                  .then(({ url, name }) => {
                    const currentUser = getUser<{ _id?: string }>();
                    const socket = connectSocket();
                    socket.emit("payout:updated", {
                      tutorId: currentUser?._id,
                      method,
                      details: { qrImageUrl: url, name }
                    });
                    socket.emit("payout:settings-updated", {
                      tutorId: currentUser?._id,
                      method,
                      details: { qrImageUrl: url, name }
                    });
                    setStatus(`${method.toUpperCase()} payout method updated.`);
                  })
                  .catch((error) =>
                    setStatus(error instanceof Error ? error.message : "Upload failed.")
                  );
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setStatus("Fee paid - submitted for review.")}
            className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-semibold text-white"
          >
            I've Paid - Submit for Review
          </button>

          {status && <p className="mt-3 text-xs text-emerald-600">{status}</p>}
        </div>

        {role === "tutor" && (
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-sm font-semibold text-slate-700">Payment requests</h2>
            <div className="mt-4 flex flex-col gap-3">
              {payments.length === 0 && (
                <p className="text-xs text-slate-500">No payment submissions yet.</p>
              )}
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{payment.student?.name}</p>
                    <p className="text-xs text-slate-500">{payment.course?.title}</p>
                    <p className="text-xs text-slate-400">{payment.screenshotUrl || "Screenshot"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.screenshotUrl && (
                      <a
                        href={payment.screenshotUrl.startsWith("http") ? payment.screenshotUrl : `${apiHost}${payment.screenshotUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand-600"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => {
                        apiFetch(`/payments/${payment._id}/status`, {
                          method: "PUT",
                          body: JSON.stringify({ status: "approved" })
                        }).catch(() => {});
                      }}
                      disabled={payment.status === "approved"}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        payment.status === "approved"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {payment.status === "approved" ? "Approved" : "Approve"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">Recently created</h2>
          <div className="mt-4 flex flex-col gap-3">
            {recentCourses.length === 0 && (
              <p className="text-xs text-slate-500">No created courses found in database.</p>
            )}
            {recentCourses.map((course) => (
              <div key={course._id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{course.title || "Course"}</p>
                  <p className="text-xs text-slate-500">
                    {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "Pending payout"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand-600">
                  Rs {Number(course.price || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-700">Teacher QR</p>
            <div className="mt-4 flex h-40 items-center justify-center rounded-2xl bg-slate-50">
              <QrCode className="h-12 w-12 text-slate-400" />
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-700">Payment</p>
            <p className="mt-2 text-xs text-slate-500">Select a course and proceed with payment.</p>
            <button className="mt-4 w-full rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
              Make payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
