"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Heart, SlidersHorizontal } from "lucide-react";
import { apiFetch, apiHost } from "../../lib/api";

export default function SearchPage({ role }: { role: "student" | "tutor" }) {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [favoriteCourseIds, setFavoriteCourseIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (query) params.set("search", query);
        if (tagFilter !== "All") params.set("category", tagFilter);
        if (levelFilter !== "All") params.set("level", levelFilter);
        const response = await apiFetch<any>(`/courses?${params.toString()}`);
        setCourses(Array.isArray(response.data) ? response.data : []);
      } catch {
        setCourses([]);
      }
    };
    load();
  }, [query, tagFilter, levelFilter]);

  useEffect(() => {
    if (role !== "student") return;
    apiFetch<any>("/users/me/favorites")
      .then((res) => {
        const ids = Array.isArray(res?.data?.courses) ? res.data.courses.map((item: any) => String(item._id || item)) : [];
        setFavoriteCourseIds(ids);
      })
      .catch(() => {});
  }, [role]);

  const chips = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((course) => course.category).filter(Boolean)))],
    [courses]
  );
  const levels = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((course) => course.level).filter(Boolean)))],
    [courses]
  );
  const resolveCourseImage = (item: any) => {
    const raw = item?.thumbnailUrl || item?.imageUrl || "";
    if (!raw) return "";
    return String(raw).startsWith("http") ? raw : `${apiHost}${raw}`;
  };
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href={`/dashboard/${role}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Search</h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-slate-600 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="rounded-full bg-slate-100 p-2 text-slate-500"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => setTagFilter(chip)}
              className={`rounded-full px-3 py-1 text-xs ${
                tagFilter === chip ? "bg-brand-600 text-white" : "bg-white text-slate-500"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {showAdvancedFilters && (
          <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft md:grid-cols-4">
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
            >
              {levels.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
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

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-slate-700">Results</p>
          <div className="mt-4 flex flex-col gap-3">
            {filteredCourses.map((item) => (
              <Link
                href={`/dashboard/${role}/course/${item._id}`}
                key={item._id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                    {resolveCourseImage(item) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveCourseImage(item)}
                        alt={item.title || "Course"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.category || "General"}</p>
                    <p className="text-xs font-semibold text-brand-600">RS {item.price || 0}</p>
                  </div>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-500">
                  {item.level || "Beginner"}
                </span>
                {role === "student" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleCourseFavorite(String(item._id));
                    }}
                    className={`rounded-full p-2 ${
                      favoriteCourseIds.includes(String(item._id))
                        ? "bg-rose-100 text-rose-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                    title="Toggle favourite"
                  >
                    <Heart className="h-4 w-4" fill={favoriteCourseIds.includes(String(item._id)) ? "currentColor" : "none"} />
                  </button>
                )}
              </Link>
            ))}
            {filteredCourses.length === 0 && <p className="text-sm text-slate-500">No results found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
