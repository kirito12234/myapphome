"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, SlidersHorizontal } from "lucide-react";
import DashboardNav from "./DashboardNav";
import { apiFetch, apiHost } from "../../lib/api";

export default function CoursePage({ role }: { role: "student" | "tutor" }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [courses, setCourses] = useState<any[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [status, setStatus] = useState("");
  const [favoriteCourseIds, setFavoriteCourseIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (categoryFilter !== "All") params.set("category", categoryFilter);
        if (levelFilter !== "All") params.set("level", levelFilter);
        const res = await apiFetch<any>(`/courses?${params.toString()}`, {
          auth: role !== "student" ? true : undefined,
        });
        setCourses(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load courses.");
      }
    };
    load();
  }, [search, categoryFilter, levelFilter, role]);

  useEffect(() => {
    if (role !== "student") return;
    apiFetch<any>("/users/me/favorites")
      .then((res) => {
        const ids = Array.isArray(res?.data?.courses) ? res.data.courses.map((item: any) => String(item._id || item)) : [];
        setFavoriteCourseIds(ids);
      })
      .catch(() => {});
  }, [role]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((c) => c.category).filter(Boolean)))],
    [courses]
  );
  const levels = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((c) => c.level).filter(Boolean)))],
    [courses]
  );

  const filteredCourses = useMemo(() => {
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    const next = courses.filter((course) => {
      const price = Number(course.price || 0);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      return true;
    });
    next.sort((a, b) => {
      if (sortBy === "priceAsc") return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "priceDesc") return Number(b.price || 0) - Number(a.price || 0);
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    return next;
  }, [courses, minPrice, maxPrice, sortBy]);
  const resolveCourseImage = (course: any) => {
    const raw = course?.thumbnailUrl || course?.imageUrl || "";
    if (!raw) return "";
    return String(raw).startsWith("http") ? raw : `${apiHost}${raw}`;
  };
  const toggleCourseFavorite = async (courseId: string) => {
    if (role !== "student" || !courseId) return;
    const exists = favoriteCourseIds.includes(courseId);
    setFavoriteCourseIds((prev) =>
      exists ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
    try {
      await apiFetch(`/users/me/favorites/courses/${courseId}`, {
        method: exists ? "DELETE" : "POST",
      });
    } catch {
      setFavoriteCourseIds((prev) =>
        exists ? [...prev, courseId] : prev.filter((id) => id !== courseId)
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <DashboardNav role={role} />

        <div className="flex flex-1 flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Course</h1>
              <p className="text-xs text-slate-500">{filteredCourses.length} courses</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-soft">
              <span className="text-xs font-semibold">ST</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
            <span className="text-slate-400">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find Course"
              className="flex-1 bg-transparent text-sm text-slate-600 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className="rounded-full bg-slate-100 p-2 text-slate-500"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
            >
              {levels.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft md:grid-cols-3">
              <input
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Min price"
                type="number"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
              />
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max price"
                type="number"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
              />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "newest" | "priceAsc" | "priceDesc")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
              >
                <option value="newest">Newest</option>
                <option value="priceAsc">Price low to high</option>
                <option value="priceDesc">Price high to low</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {filteredCourses.map((course) => (
              <div key={course._id} className="rounded-2xl bg-white p-5 shadow-soft">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                    {resolveCourseImage(course) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveCourseImage(course)}
                        alt={course.title || "Course"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.tutor?.name || "Tutor"}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-semibold text-brand-600">Rs {course.price || 0}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">{course.level || "Beginner"}</span>
                    </div>
                  </div>
                  {role === "student" && (
                    <button
                      type="button"
                      onClick={() => toggleCourseFavorite(String(course._id))}
                      className={`rounded-full p-2 ${
                        favoriteCourseIds.includes(String(course._id))
                          ? "bg-rose-100 text-rose-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                      title="Toggle favourite"
                    >
                      <Heart className="h-4 w-4" fill={favoriteCourseIds.includes(String(course._id)) ? "currentColor" : "none"} />
                    </button>
                  )}
                  <Link
                    href={`/dashboard/${role}/course/${course._id}`}
                    className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
            {filteredCourses.length === 0 && <p className="text-xs text-slate-500">No courses found.</p>}
            {status && <p className="text-xs text-rose-500">{status}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
