"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Heart, PlayCircle, QrCode, Upload } from "lucide-react";
import { apiFetch, apiHost } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import LiveSessionPanel from "./LiveSessionPanel";

export default function CourseDetailPage({
  role,
  courseId,
  returnTo,
}: {
  role: "student" | "tutor";
  courseId: string;
  returnTo?: string;
}) {
  type MethodId = "esewa" | "khalti" | "imepay" | "bank";
  const paymentMethods: Array<{ id: MethodId; label: string }> = [
    { id: "esewa", label: "eSewa" },
    { id: "khalti", label: "Khalti" },
    { id: "imepay", label: "IME Pay" },
    { id: "bank", label: "Bank Transfer" },
  ];
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "approved" | "rejected" | "none">("none");
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<MethodId>("khalti");
  const [methodQrs, setMethodQrs] = useState<Record<MethodId, { name: string; url: string }>>({
    esewa: { name: "", url: "" },
    khalti: { name: "", url: "" },
    imepay: { name: "", url: "" },
    bank: { name: "", url: "" },
  });
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<{
    percentage: number;
    completedCount: number;
    totalLessons: number;
    completedLessonIds: string[];
  }>({
    percentage: 0,
    completedCount: 0,
    totalLessons: 0,
    completedLessonIds: [],
  });
  const [completingLessonId, setCompletingLessonId] = useState("");
  const [resolvedTutorId, setResolvedTutorId] = useState("");
  const [favoriteCourseIds, setFavoriteCourseIds] = useState<string[]>([]);
  const [favoriteLessonIds, setFavoriteLessonIds] = useState<string[]>([]);
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

  const hydratePayoutSettings = (settings: any[]) => {
    const next: Record<MethodId, { name: string; url: string }> = {
      esewa: { name: "", url: "" },
      khalti: { name: "", url: "" },
      imepay: { name: "", url: "" },
      bank: { name: "", url: "" },
    };
    const latestByMethod: Record<MethodId, { item: any; rank: number } | null> = {
      esewa: null,
      khalti: null,
      imepay: null,
      bank: null,
    };
    settings.forEach((item: any, index: number) => {
      const method = normalizeMethod(item?.method);
      if (!method || !next[method]) return;
      const ts = new Date(item?.updatedAt || item?.createdAt || "").getTime();
      const rank = Number.isFinite(ts) && ts > 0 ? ts : index + 1;
      const prev = latestByMethod[method];
      if (!prev || rank >= prev.rank) {
        latestByMethod[method] = { item, rank };
      }
    });
    (Object.keys(latestByMethod) as MethodId[]).forEach((method) => {
      const picked = latestByMethod[method]?.item;
      if (!picked) return;
      next[method] = {
        name: picked?.details?.name || "",
        url: withCacheBust(picked?.details?.qrImageUrl || "", picked?.updatedAt || picked?.createdAt || Date.now()),
      };
    });
    setMethodQrs(next);
  };

  const allowAccess = role === "tutor" ? true : hasAccess;
  const canUploadPayment = paymentStatus === "none" || paymentStatus === "rejected";
  const tutorId = useMemo(
    () =>
      resolvedTutorId ||
      course?.tutor?._id ||
      course?.tutorId?._id ||
      course?.teacher?._id ||
      course?.teacherId?._id ||
      course?.tutorId ||
      course?.teacherId ||
      course?.tutor ||
      course?.teacher ||
      "",
    [course, resolvedTutorId]
  );
  const selectedQr = methodQrs[selectedMethod] || { name: "", url: "" };
  const currentQrUrl = selectedQr.url;
  const currentQrName = selectedQr.name;
  const resolveLessonUrl = (lesson: any) => {
    const raw = lesson?.fileUrl || lesson?.pdfUrl || lesson?.imageUrl || "";
    if (!raw) return "";
    return String(raw).startsWith("http") ? raw : `${apiHost}${raw}`;
  };
  const lessonType = (lesson: any): "pdf" | "video" | "image" | "resource" => {
    const rawType = String(lesson?.fileType || "").toLowerCase();
    if (rawType === "pdf" || rawType === "video" || rawType === "image") return rawType;
    const url = String(lesson?.fileUrl || lesson?.pdfUrl || lesson?.imageUrl || "").toLowerCase();
    if (url.endsWith(".pdf")) return "pdf";
    if (url.endsWith(".mp4") || url.endsWith(".webm")) return "video";
    if (url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".webp")) return "image";
    return "resource";
  };
  const sortedLessons = useMemo(
    () =>
      [...lessons].sort((a, b) => {
        const ao = Number(a?.orderIndex ?? a?.order ?? 0);
        const bo = Number(b?.orderIndex ?? b?.order ?? 0);
        if (ao !== bo) return ao - bo;
        return String(a?._id || "").localeCompare(String(b?._id || ""));
      }),
    [lessons]
  );
  const groupedLessons = useMemo(
    () => ({
      video: sortedLessons.filter((lesson) => lessonType(lesson) === "video"),
      pdf: sortedLessons.filter((lesson) => lessonType(lesson) === "pdf"),
      image: sortedLessons.filter((lesson) => lessonType(lesson) === "image"),
      resource: sortedLessons.filter((lesson) => lessonType(lesson) === "resource"),
    }),
    [sortedLessons]
  );
  const completedLessonSet = useMemo(
    () => new Set((progress.completedLessonIds || []).map((id) => String(id))),
    [progress.completedLessonIds]
  );
  const totalLessonCount = sortedLessons.length;
  const nextPendingLesson = useMemo(
    () => sortedLessons.find((lesson) => !completedLessonSet.has(String(lesson._id))) || null,
    [sortedLessons, completedLessonSet]
  );
  const openLesson = (lesson: any) => {
    const url = resolveLessonUrl(lesson);
    if (!url) return;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  const openAndCompleteLesson = async (lesson: any) => {
    openLesson(lesson);
    if (role !== "student") return;
    const lessonId = String(lesson?._id || "");
    if (!lessonId || completedLessonSet.has(lessonId)) return;
    await markLessonCompleted(lessonId);
  };
  const toggleCourseFavorite = async (targetCourseId: string) => {
    if (role !== "student" || !targetCourseId) return;
    const exists = favoriteCourseIds.includes(targetCourseId);
    setFavoriteCourseIds((prev) =>
      exists ? prev.filter((id) => id !== targetCourseId) : [...prev, targetCourseId]
    );
    try {
      await apiFetch(`/users/me/favorites/courses/${targetCourseId}`, {
        method: exists ? "DELETE" : "POST",
      });
    } catch {
      setFavoriteCourseIds((prev) =>
        exists ? [...prev, targetCourseId] : prev.filter((id) => id !== targetCourseId)
      );
    }
  };
  const toggleLessonFavorite = async (lessonId: string) => {
    if (role !== "student" || !lessonId) return;
    const exists = favoriteLessonIds.includes(lessonId);
    setFavoriteLessonIds((prev) =>
      exists ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
    try {
      await apiFetch(`/users/me/favorites/lessons/${lessonId}`, {
        method: exists ? "DELETE" : "POST",
      });
    } catch {
      setFavoriteLessonIds((prev) =>
        exists ? [...prev, lessonId] : prev.filter((id) => id !== lessonId)
      );
    }
  };

  const loadMyProgress = async () => {
    if (role !== "student") return;
    try {
      const res = await apiFetch<any>(`/lessons/progress/me/${courseId}`);
      setProgress({
        percentage: Number(res?.data?.percentage || 0),
        completedCount: Number(res?.data?.completedCount || 0),
        totalLessons: Number(res?.data?.totalLessons || 0),
        completedLessonIds: Array.isArray(res?.data?.completedLessonIds) ? res.data.completedLessonIds : [],
      });
    } catch {
      // ignore if no access yet
    }
  };

  const markLessonCompleted = async (lessonId: string) => {
    if (!lessonId || role !== "student") return;
    try {
      setCompletingLessonId(lessonId);
      const res = await apiFetch<any>(`/lessons/${lessonId}/complete`, { method: "POST" });
      setProgress({
        percentage: Number(res?.data?.percentage || 0),
        completedCount: Number(res?.data?.completedCount || 0),
        totalLessons: Number(res?.data?.totalLessons || 0),
        completedLessonIds: Array.isArray(res?.data?.completedLessonIds) ? res.data.completedLessonIds : [],
      });
      setStatus("Lesson marked complete.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to mark lesson complete.");
    } finally {
      setCompletingLessonId("");
    }
  };

  useEffect(() => {
    const extractTutorId = (data: any) =>
      data?.tutor?._id ||
      data?.tutorId?._id ||
      data?.teacher?._id ||
      data?.teacherId?._id ||
      data?.tutorId ||
      data?.teacherId ||
      data?.tutor ||
      data?.teacher ||
      "";
    const load = async () => {
      try {
        let nextCourse: any = null;
        let denied = false;
        try {
          const courseRes = await apiFetch<any>(`/courses/${courseId}`);
          nextCourse = courseRes.data;
        } catch (error) {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          denied =
            role === "student" &&
            (message.includes("not available yet") ||
              message.includes("request tutor approval") ||
              message.includes("forbidden") ||
              message.includes("403"));
          if (!denied) throw error;
        }

        if (!nextCourse && role === "student") {
          const listRes = await apiFetch<any>("/courses");
          const allCourses = Array.isArray(listRes?.data) ? listRes.data : [];
          nextCourse = allCourses.find((item: any) => String(item?._id) === String(courseId)) || null;
        }

        if (nextCourse) {
          setCourse(nextCourse);
          setLessons(Array.isArray(nextCourse?.lessons) ? nextCourse.lessons : []);
          setResolvedTutorId(String(extractTutorId(nextCourse) || ""));
        }

        if (role === "student") {
          const pay = await apiFetch<any>(`/payments/status/${courseId}`);
          setPaymentStatus(pay.data?.status || "none");
          setHasAccess(Boolean(pay.data?.hasAccess));
          await loadMyProgress();
          const fav = await apiFetch<any>("/users/me/favorites");
          setFavoriteCourseIds(
            Array.isArray(fav?.data?.courses) ? fav.data.courses.map((item: any) => String(item._id || item)) : []
          );
          setFavoriteLessonIds(
            Array.isArray(fav?.data?.lessons) ? fav.data.lessons.map((item: any) => String(item._id || item)) : []
          );

          const nextTutorId = String(extractTutorId(nextCourse) || "");
          if (nextTutorId) {
            const payout = await apiFetch<any>(`/payout-settings/tutor/${nextTutorId}?t=${Date.now()}`, {
              cache: "no-store",
            });
            const settings = Array.isArray(payout.data) ? payout.data : [];
            hydratePayoutSettings(settings);
          }
          if (!nextCourse && !denied) {
            setStatus("Unable to load course.");
          }
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load course.");
      }
    };
    load();
    const interval = setInterval(load, role === "student" ? 4000 : 8000);
    return () => clearInterval(interval);
  }, [courseId, role]);

  useEffect(() => {
    const socket = connectSocket();
    const handlePaymentStatusUpdate = (payload: any) => {
      if (String(payload?.courseId) !== String(courseId)) return;
      setPaymentStatus(payload.status === "approved" ? "approved" : payload.status === "pending" ? "pending" : "none");
      setHasAccess(Boolean(payload.hasAccess));
    };
    socket.on("payment:status-updated", handlePaymentStatusUpdate);

    const handlePayoutUpdated = (payload: any) => {
      const payloadTutorId = String(payload?.tutorId || payload?.userId || "");
      if (!payloadTutorId || String(payloadTutorId) !== String(tutorId)) return;
      apiFetch<any>(`/payout-settings/tutor/${payloadTutorId}?t=${Date.now()}`, { cache: "no-store" })
        .then((payout) => {
          const settings = Array.isArray(payout.data) ? payout.data : [];
          hydratePayoutSettings(settings);
        })
        .catch(() => {});
    };
    const handleQrUpdated = (payload: any) => {
      const payloadTutorId = String(payload?.tutorId || "");
      if (!payloadTutorId || String(payloadTutorId) !== String(tutorId)) return;
      apiFetch<any>(`/payout-settings/tutor/${payloadTutorId}?t=${Date.now()}`, { cache: "no-store" })
        .then((payout) => {
          const settings = Array.isArray(payout.data) ? payout.data : [];
          hydratePayoutSettings(settings);
        })
        .catch(() => {});
    };
    socket.on("payout:updated", handlePayoutUpdated);
    socket.on("payout:settings-updated", handlePayoutUpdated);
    socket.on("qr:updated", handleQrUpdated);

    return () => {
      socket.off("payment:status-updated", handlePaymentStatusUpdate);
      socket.off("payout:updated", handlePayoutUpdated);
      socket.off("payout:settings-updated", handlePayoutUpdated);
      socket.off("qr:updated", handleQrUpdated);
    };
  }, [courseId, tutorId]);

  const fallbackBackHref = `/dashboard/${role}/course`;
  const normalizedReturnTo = String(returnTo || "").trim();

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          {normalizedReturnTo ? (
            <a
              href={normalizedReturnTo}
              target="_top"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </a>
          ) : (
            <Link
              href={fallbackBackHref}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </Link>
          )}
          <h1 className="text-lg font-semibold text-slate-900">Learning Plan</h1>
        </div>

        <div className="rounded-3xl bg-brand-100 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{course?.title || "Course"}</h2>
            {role === "student" && (
              <button
                type="button"
                onClick={() => toggleCourseFavorite(String(course?._id || courseId))}
                className={`rounded-full p-2 ${
                  favoriteCourseIds.includes(String(course?._id || courseId))
                    ? "bg-rose-100 text-rose-600"
                    : "bg-white text-slate-500"
                }`}
                title="Toggle favourite course"
              >
                <Heart
                  className="h-4 w-4"
                  fill={favoriteCourseIds.includes(String(course?._id || courseId)) ? "currentColor" : "none"}
                />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">{course?.description || "No description provided."}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-white px-3 py-1">{course?.level || "Beginner"}</span>
            <span className="rounded-full bg-white px-3 py-1">{lessons.length} lessons</span>
            <span className="rounded-full bg-white px-3 py-1">Rs {course?.price || 0}</span>
          </div>
        </div>

        {role === "student" && !allowAccess ? (
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-700">
              {paymentStatus === "approved" ? "Waiting admin approval" : "Payment required"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {paymentStatus === "approved"
                ? "Tutor approved your payment. Admin will approve enrollment to unlock this course."
                : paymentStatus === "pending"
                  ? "Payment screenshot sent. Waiting for tutor approval."
                  : "Upload payment screenshot to request course access."}
            </p>
            {canUploadPayment && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-500">
              {paymentMethods.map((item) => {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(item.id);
                    }}
                    className={`rounded-full border px-4 py-2 ${
                      selectedMethod === item.id
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            )}
            {canUploadPayment && (
            <div className="mt-4 flex items-center justify-center">
              <div className="w-48 rounded-2xl bg-slate-900 p-4 text-center text-[11px] text-white shadow-soft">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-white">
                  {currentQrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentQrUrl.startsWith("http") ? currentQrUrl : `${apiHost}${currentQrUrl}`}
                      alt="QR code"
                      className="h-16 w-16 rounded-lg object-contain"
                    />
                  ) : (
                    <QrCode className="h-10 w-10 text-slate-700" />
                  )}
                </div>
                <p className="mt-2 font-semibold capitalize">{selectedMethod}</p>
                <p className="text-slate-300">{currentQrName || "Teacher QR"}</p>
              </div>
            </div>
            )}
            {canUploadPayment && !selectedQr.url && (
              <p className="mt-2 text-center text-xs text-amber-600">
                QR not uploaded for {selectedMethod}. Ask teacher to upload this method.
              </p>
            )}
            {canUploadPayment && (
            <label className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2 text-xs text-slate-600">
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Screenshot
              </span>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] text-violet-600">Browse</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("courseId", courseId);
                  fd.append("amount", String(course?.price || 0));
                  fd.append("paymentMethod", selectedMethod);
                  fd.append("screenshot", file);
                  apiFetch(`/payments/submit`, { method: "POST", body: fd })
                    .then(() => {
                      setPaymentStatus("pending");
                      setStatus("Payment screenshot uploaded successfully. Waiting for teacher approval.");
                    })
                    .catch((error) => setStatus(error instanceof Error ? error.message : "Upload failed."));
                }}
              />
            </label>
            )}
            {paymentStatus === "pending" && <p className="mt-3 text-xs text-amber-600">Pending approval from teacher.</p>}
            {paymentStatus === "approved" && (
              <p className="mt-3 text-xs text-amber-600">Pending enrollment approval from admin.</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-700">Course video</p>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                  <PlayCircle className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{lessons[0]?.title || "Lesson video"}</p>
                  <p className="text-xs text-slate-500">Watch the lesson content</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">&gt;</span>
            </div>
          </div>
        )}

        {allowAccess && (
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-slate-700">Learning modules by type</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Total lessons: <span className="font-semibold text-slate-900">{totalLessonCount}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Videos: <span className="font-semibold text-slate-900">{groupedLessons.video.length}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                PDFs: <span className="font-semibold text-slate-900">{groupedLessons.pdf.length}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Images: <span className="font-semibold text-slate-900">{groupedLessons.image.length}</span>
              </div>
            </div>
            {role === "student" && (
              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Completed: {progress.completedCount}/{progress.totalLessons || lessons.length} lessons ({progress.percentage}
                %)
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, progress.percentage || 0))}%` }}
                  />
                </div>
                {nextPendingLesson && (
                  <button
                    type="button"
                    onClick={() => openAndCompleteLesson(nextPendingLesson)}
                    className="mt-3 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white"
                  >
                    Continue next lesson: {nextPendingLesson.title || "Lesson"}
                  </button>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Videos</p>
                <div className="flex flex-col gap-2">
                  {groupedLessons.video.map((lesson) => {
                    const url = resolveLessonUrl(lesson);
                    const isDone = completedLessonSet.has(String(lesson._id));
                    return (
                      <div
                        key={lesson._id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-slate-700">
                          {lesson.title}
                        </a>
                        <div className="flex items-center gap-2">
                          {role === "student" && (
                            <button
                              type="button"
                              onClick={() => toggleLessonFavorite(String(lesson._id))}
                              className={`rounded-full p-1.5 ${
                                favoriteLessonIds.includes(String(lesson._id))
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                              title="Toggle favourite lesson"
                            >
                              <Heart
                                className="h-3.5 w-3.5"
                                fill={favoriteLessonIds.includes(String(lesson._id)) ? "currentColor" : "none"}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openLesson(lesson)}
                            className="text-xs font-semibold text-brand-600"
                          >
                            Watch
                          </button>
                          {role === "student" && (
                            <button
                              type="button"
                              disabled={completingLessonId === String(lesson._id)}
                              onClick={() => openAndCompleteLesson(lesson)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-brand-600 text-white disabled:opacity-60"
                              }`}
                            >
                              {isDone ? "Completed" : completingLessonId === String(lesson._id) ? "Saving..." : "Open & Complete"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {groupedLessons.video.length === 0 && <p className="text-xs text-slate-400">No video lessons.</p>}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">PDFs</p>
                <div className="flex flex-col gap-2">
                  {groupedLessons.pdf.map((lesson) => {
                    const url = resolveLessonUrl(lesson);
                    const isDone = completedLessonSet.has(String(lesson._id));
                    return (
                      <div
                        key={lesson._id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-slate-700">
                          {lesson.title}
                        </a>
                        <div className="flex items-center gap-2">
                          {role === "student" && (
                            <button
                              type="button"
                              onClick={() => toggleLessonFavorite(String(lesson._id))}
                              className={`rounded-full p-1.5 ${
                                favoriteLessonIds.includes(String(lesson._id))
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                              title="Toggle favourite lesson"
                            >
                              <Heart
                                className="h-3.5 w-3.5"
                                fill={favoriteLessonIds.includes(String(lesson._id)) ? "currentColor" : "none"}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openLesson(lesson)}
                            className="text-xs font-semibold text-brand-600"
                          >
                            Open PDF
                          </button>
                          {role === "student" && (
                            <button
                              type="button"
                              disabled={completingLessonId === String(lesson._id)}
                              onClick={() => openAndCompleteLesson(lesson)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-brand-600 text-white disabled:opacity-60"
                              }`}
                            >
                              {isDone ? "Completed" : completingLessonId === String(lesson._id) ? "Saving..." : "Open & Complete"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {groupedLessons.pdf.length === 0 && <p className="text-xs text-slate-400">No PDF lessons.</p>}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Images</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {groupedLessons.image.map((lesson) => {
                    const url = resolveLessonUrl(lesson);
                    const isDone = completedLessonSet.has(String(lesson._id));
                    return (
                      <div key={lesson._id} className="rounded-2xl bg-slate-50 p-3">
                        <a href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={lesson.title || "Lesson image"} className="h-32 w-full rounded-xl object-cover" />
                          <p className="mt-2 text-xs font-semibold text-slate-700">{lesson.title}</p>
                        </a>
                        {role === "student" && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleLessonFavorite(String(lesson._id))}
                              className={`rounded-full p-1.5 ${
                                favoriteLessonIds.includes(String(lesson._id))
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                              title="Toggle favourite lesson"
                            >
                              <Heart
                                className="h-3.5 w-3.5"
                                fill={favoriteLessonIds.includes(String(lesson._id)) ? "currentColor" : "none"}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => openLesson(lesson)}
                              className="text-xs font-semibold text-brand-600"
                            >
                              View image
                            </button>
                            <button
                              type="button"
                              disabled={completingLessonId === String(lesson._id)}
                              onClick={() => openAndCompleteLesson(lesson)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-brand-600 text-white disabled:opacity-60"
                              }`}
                            >
                              {isDone ? "Completed" : completingLessonId === String(lesson._id) ? "Saving..." : "Open & Complete"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {groupedLessons.image.length === 0 && <p className="text-xs text-slate-400">No image lessons.</p>}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Other resources</p>
                <div className="flex flex-col gap-2">
                  {groupedLessons.resource.map((lesson) => {
                    const url = resolveLessonUrl(lesson);
                    const isDone = completedLessonSet.has(String(lesson._id));
                    return (
                      <div
                        key={lesson._id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-slate-700">
                          {lesson.title}
                        </a>
                        <div className="flex items-center gap-2">
                          {role === "student" && (
                            <button
                              type="button"
                              onClick={() => toggleLessonFavorite(String(lesson._id))}
                              className={`rounded-full p-1.5 ${
                                favoriteLessonIds.includes(String(lesson._id))
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                              title="Toggle favourite lesson"
                            >
                              <Heart
                                className="h-3.5 w-3.5"
                                fill={favoriteLessonIds.includes(String(lesson._id)) ? "currentColor" : "none"}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openLesson(lesson)}
                            className="text-xs font-semibold text-brand-600"
                          >
                            Open
                          </button>
                          {role === "student" && (
                            <button
                              type="button"
                              disabled={completingLessonId === String(lesson._id)}
                              onClick={() => openAndCompleteLesson(lesson)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-brand-600 text-white disabled:opacity-60"
                              }`}
                            >
                              {isDone ? "Completed" : completingLessonId === String(lesson._id) ? "Saving..." : "Open & Complete"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {groupedLessons.resource.length === 0 && <p className="text-xs text-slate-400">No additional resources.</p>}
                </div>
              </div>
            </div>
            {sortedLessons.length === 0 && <p className="mt-3 text-xs text-slate-500">No lessons available yet.</p>}
          </div>
        )}

        {allowAccess && <LiveSessionPanel role={role} courseId={courseId} />}

        {status && <p className="text-xs text-emerald-600">{status}</p>}
        {!allowAccess && role === "student" && tutorId && (
          <Link
            href="/dashboard/student/message"
            className="rounded-2xl bg-brand-600 px-4 py-3 text-center text-xs font-semibold text-white"
          >
            Message Tutor for Access
          </Link>
        )}
      </div>
    </div>
  );
}
