"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

type LessonDraft = {
  id: string;
  title: string;
  description: string;
  fileType: "pdf" | "video" | "resource";
  file: File | null;
};

const createLessonDraft = (): LessonDraft => ({
  id: Math.random().toString(36).slice(2),
  title: "",
  description: "",
  fileType: "pdf",
  file: null,
});

export default function CreateCoursePage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    level: "Beginner",
  });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [coursePdf, setCoursePdf] = useState<File | null>(null);
  const [lessons, setLessons] = useState<LessonDraft[]>([createLessonDraft()]);
  const [status, setStatus] = useState("");
  const [createdCourseId, setCreatedCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const getFileName = (file: File | null, fallback: string) => (file ? file.name : fallback);

  const updateLesson = (id: string, patch: Partial<LessonDraft>) => {
    setLessons((prev) => prev.map((lesson) => (lesson.id === id ? { ...lesson, ...patch } : lesson)));
  };

  const addLesson = () => setLessons((prev) => [...prev, createLessonDraft()]);
  const removeLesson = (id: string) => setLessons((prev) => prev.filter((lesson) => lesson.id !== id));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    if (!form.title.trim()) {
      setStatus("Course title is required.");
      return;
    }
    if (!coursePdf) {
      setStatus("Course PDF is required.");
      return;
    }

    const validLessons = lessons.filter((l) => l.title.trim() || l.file);
    for (const lesson of validLessons) {
      if (!lesson.title.trim() || !lesson.file) {
        setStatus("Each lesson must include title and file.");
        return;
      }
    }

    try {
      setLoading(true);
      const courseForm = new FormData();
      courseForm.append("title", form.title.trim());
      courseForm.append("description", form.description.trim());
      courseForm.append("category", form.category.trim());
      courseForm.append("price", form.price || "0");
      courseForm.append("level", form.level);
      courseForm.append("coursePdf", coursePdf);
      if (thumbnail) courseForm.append("thumbnail", thumbnail);

      const created = await apiFetch<any>("/courses", {
        method: "POST",
        body: courseForm,
      });
      const course = created.data;
      const courseId = course?._id;
      if (!courseId) throw new Error("Course created but id is missing.");
      setCreatedCourseId(courseId);

      for (let index = 0; index < validLessons.length; index += 1) {
        const lesson = validLessons[index];
        const lessonForm = new FormData();
        lessonForm.append("title", lesson.title.trim());
        lessonForm.append("description", lesson.description.trim());
        lessonForm.append("fileType", lesson.fileType);
        lessonForm.append("orderIndex", String(index + 1));
        lessonForm.append("lessonFile", lesson.file as File);
        await apiFetch(`/courses/${courseId}/lessons`, {
          method: "POST",
          body: lessonForm,
        });
      }

      setStatus("Course created. Waiting for admin approval before students can access it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Course creation failed.");
    } finally {
      setLoading(false);
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
          <h1 className="text-lg font-semibold text-slate-900">Create Course</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Title"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="Category"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description"
              className="min-h-[90px] rounded-2xl border border-slate-200 px-4 py-2 text-xs md:col-span-2"
            />
            <input
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="Price"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <input
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
              placeholder="Level"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs"
            />
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-2 text-xs md:col-span-2">
              <span>Course image (optional)</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="max-w-[220px] truncate text-slate-500">{getFileName(thumbnail, "No file chosen")}</span>
                <label
                  htmlFor="course-image"
                  className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                >
                  Browse
                </label>
                <input
                  id="course-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-2 text-xs md:col-span-2">
              <span>Course PDF (required)</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="max-w-[220px] truncate text-slate-500">{getFileName(coursePdf, "No file chosen")}</span>
                <label
                  htmlFor="course-pdf"
                  className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                >
                  Browse
                </label>
                <input
                  id="course-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCoursePdf(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Lessons</p>
            <div className="mt-3 flex flex-col gap-3">
              {lessons.map((lesson, index) => (
                <div key={lesson.id} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Lesson {index + 1}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input
                      value={lesson.title}
                      onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                      placeholder="Lesson title"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    />
                    <select
                      value={lesson.fileType}
                      onChange={(e) =>
                        updateLesson(lesson.id, { fileType: e.target.value as LessonDraft["fileType"] })
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="resource">Resource</option>
                    </select>
                    <textarea
                      value={lesson.description}
                      onChange={(e) => updateLesson(lesson.id, { description: e.target.value })}
                      placeholder="Lesson description (optional)"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs md:col-span-2"
                    />
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs md:col-span-2">
                      <span>Choose file</span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="max-w-[220px] truncate text-slate-500">
                          {getFileName(lesson.file, "No file chosen")}
                        </span>
                        <label
                          htmlFor={`lesson-file-${lesson.id}`}
                          className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          Browse
                        </label>
                        <input
                          id={`lesson-file-${lesson.id}`}
                          type="file"
                          accept="application/pdf,video/mp4,video/webm,image/png,image/jpeg,image/jpg,image/webp"
                          onChange={(e) => updateLesson(lesson.id, { file: e.target.files?.[0] ?? null })}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLesson(lesson.id)}
                      className="mt-2 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      Remove lesson
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLesson}
              className="mt-3 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Add lesson
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-brand-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create course"}
          </button>
          {status && <p className="mt-2 text-xs text-emerald-600">{status}</p>}
          {createdCourseId && (
            <Link
              href={`/dashboard/tutor/course/${createdCourseId}`}
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white"
            >
              View created course
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
