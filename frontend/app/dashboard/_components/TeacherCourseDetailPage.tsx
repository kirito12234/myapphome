"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { apiFetch, apiHost } from "../../lib/api";
import LiveSessionPanel from "./LiveSessionPanel";

type TeacherCourseDetailPageProps = {
  courseId: string;
  returnTo?: string;
};

type LessonFileType = "pdf" | "video" | "image" | "resource";

const FILE_TYPE_LABEL: Record<LessonFileType, string> = {
  pdf: "PDF",
  video: "Video",
  image: "Image",
  resource: "Resource",
};

const FILE_TYPE_ACCEPT: Record<LessonFileType, string> = {
  pdf: "application/pdf",
  video: "video/mp4,video/webm",
  image: "image/png,image/jpeg,image/jpg,image/webp",
  resource: "application/pdf,video/mp4,video/webm,image/png,image/jpeg,image/jpg,image/webp",
};

export default function TeacherCourseDetailPage({ courseId, returnTo }: TeacherCourseDetailPageProps) {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [busyLessonId, setBusyLessonId] = useState("");
  const [form, setForm] = useState<{
    title: string;
    description: string;
    fileType: LessonFileType;
    file: File | null;
  }>({
    title: "",
    description: "",
    fileType: "pdf",
    file: null,
  });

  const resolveFileUrl = (value?: string) => {
    if (!value) return "";
    return value.startsWith("http") ? value : `${apiHost}${value}`;
  };

  const getLessonType = (lesson: any): LessonFileType => {
    const raw = String(lesson?.fileType || "").toLowerCase();
    if (raw === "pdf" || raw === "video" || raw === "image") return raw;
    const fileUrl = String(lesson?.fileUrl || lesson?.pdfUrl || lesson?.imageUrl || "").toLowerCase();
    if (fileUrl.endsWith(".pdf")) return "pdf";
    if (fileUrl.endsWith(".mp4") || fileUrl.endsWith(".webm")) return "video";
    if (fileUrl.endsWith(".png") || fileUrl.endsWith(".jpg") || fileUrl.endsWith(".jpeg") || fileUrl.endsWith(".webp")) {
      return "image";
    }
    return "resource";
  };

  const lessons = useMemo(() => {
    const raw = Array.isArray(course?.lessons) ? course.lessons : [];
    return raw
      .map((item: any) => ({
        ...item,
        _type: getLessonType(item),
        _url: resolveFileUrl(item.fileUrl || item.pdfUrl || item.imageUrl),
      }))
      .sort((a: any, b: any) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
  }, [course]);

  const groupedLessons = useMemo(
    () => ({
      video: lessons.filter((item: any) => item._type === "video"),
      pdf: lessons.filter((item: any) => item._type === "pdf"),
      image: lessons.filter((item: any) => item._type === "image"),
      resource: lessons.filter((item: any) => item._type === "resource"),
    }),
    [lessons]
  );

  const load = async () => {
    try {
      const response = await apiFetch<any>(`/courses/${courseId}`);
      setCourse(response.data || null);
    } catch {
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [courseId]);

  const addLesson = async () => {
    if (!form.title.trim() || !form.file) {
      setStatus("Lesson title and file are required.");
      return;
    }
    try {
      setStatus("");
      setBusyLessonId("add");
      const lessonForm = new FormData();
      lessonForm.append("title", form.title.trim());
      lessonForm.append("description", form.description.trim());
      lessonForm.append("fileType", form.fileType);
      lessonForm.append("orderIndex", String((Array.isArray(course?.lessons) ? course.lessons.length : 0) + 1));
      lessonForm.append("lessonFile", form.file);
      await apiFetch(`/courses/${courseId}/lessons`, {
        method: "POST",
        body: lessonForm,
      });
      setForm({ title: "", description: "", fileType: "pdf", file: null });
      setStatus("Lesson added and students notified.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add lesson.");
    } finally {
      setBusyLessonId("");
    }
  };

  const removeLesson = async (lessonId: string) => {
    try {
      setStatus("");
      setBusyLessonId(lessonId);
      await apiFetch(`/courses/lessons/${lessonId}`, { method: "DELETE" });
      setStatus("Lesson deleted from database.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete lesson.");
    } finally {
      setBusyLessonId("");
    }
  };

  const renderLessonRow = (lesson: any) => {
    const url = lesson._url || "";
    return (
      <div
        key={lesson._id}
        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-700">{lesson.title || "Lesson"}</p>
            <p className="text-xs text-slate-500">{FILE_TYPE_LABEL[lesson._type as LessonFileType]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {url && (
            <>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600">
                Open
              </a>
              <a href={url} download className="text-xs font-semibold text-slate-600">
                Download
              </a>
            </>
          )}
          <button
            type="button"
            disabled={busyLessonId === lesson._id}
            onClick={() => removeLesson(String(lesson._id))}
            className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-60"
          >
            {busyLessonId === lesson._id ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    );
  };

  if (!course && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm text-slate-500">Course not found.</p>
          <Link href="/dashboard/tutor/course" className="mt-3 inline-flex text-sm text-brand-600">
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          {returnTo ? (
            <a
              href={returnTo}
              target="_top"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </a>
          ) : (
            <Link
              href="/dashboard/tutor/course"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </Link>
          )}
          <h1 className="text-lg font-semibold text-slate-900">{course?.title || "Course"}</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50">
              {course?.thumbnailUrl || course?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveFileUrl(String(course?.thumbnailUrl || course?.imageUrl))}
                  alt={course?.title || "Course"}
                  className="h-40 w-40 rounded-2xl object-cover"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-slate-300" />
              )}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Course info</p>
              <p className="mt-2">Category: {course?.category}</p>
              <p>Level: {course?.level || "Beginner"}</p>
              <p>Price: {course?.price ?? "N/A"}</p>
              <p>Lessons: {Array.isArray(course?.lessons) ? course.lessons.length : 0}</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <div className="rounded-3xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-700">Description</p>
              <p className="mt-2 text-sm text-slate-600">{course?.description || "No description provided."}</p>
              <p className="mt-4 text-sm font-semibold text-slate-700">Features</p>
              <p className="mt-2 text-sm text-slate-600">
                {Array.isArray(course?.features) && course.features.length > 0 ? course.features.join(", ") : "Not specified."}
              </p>
            </div>

            <LiveSessionPanel role="tutor" courseId={courseId} />

            <div className="rounded-3xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-700">Add lesson material</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Lesson title"
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
                />
                <select
                  value={form.fileType}
                  onChange={(e) => setForm((prev) => ({ ...prev, fileType: e.target.value as LessonFileType, file: null }))}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
                >
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="resource">Other Resource</option>
                </select>
                <input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Lesson description (optional)"
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs md:col-span-2"
                />
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-2 text-xs md:col-span-2">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Upload className="h-4 w-4" />
                    {form.file?.name || "Select lesson file"}
                  </span>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] text-violet-600">Browse</span>
                  <input
                    type="file"
                    accept={FILE_TYPE_ACCEPT[form.fileType]}
                    className="hidden"
                    onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busyLessonId === "add"}
                onClick={addLesson}
                className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busyLessonId === "add" ? "Adding..." : "Add lesson material"}
              </button>
              {status && <p className="mt-2 text-xs text-brand-600">{status}</p>}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-700">Lesson materials by type</p>
              <div className="mt-3 flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Videos</p>
                  <div className="flex flex-col gap-2">
                    {groupedLessons.video.length > 0 ? (
                      groupedLessons.video.map(renderLessonRow)
                    ) : (
                      <p className="text-xs text-slate-400">No video lessons.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">PDFs</p>
                  <div className="flex flex-col gap-2">
                    {groupedLessons.pdf.length > 0 ? (
                      groupedLessons.pdf.map(renderLessonRow)
                    ) : (
                      <p className="text-xs text-slate-400">No PDF lessons.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Images</p>
                  <div className="flex flex-col gap-2">
                    {groupedLessons.image.length > 0 ? (
                      groupedLessons.image.map(renderLessonRow)
                    ) : (
                      <p className="text-xs text-slate-400">No image lessons.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Other resources</p>
                  <div className="flex flex-col gap-2">
                    {groupedLessons.resource.length > 0 ? (
                      groupedLessons.resource.map(renderLessonRow)
                    ) : (
                      <p className="text-xs text-slate-400">No additional resources.</p>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Students enrolled in this course get a notification each time you add a lesson.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
