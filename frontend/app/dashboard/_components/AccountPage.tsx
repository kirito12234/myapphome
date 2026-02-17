"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Heart,
  HelpCircle,
  LogOut,
  Pencil,
  Settings,
  Wallet,
} from "lucide-react";
import { apiFetch, apiHost } from "../../lib/api";

const menuItems = [
  { id: "payouts", label: "Payouts", subtitle: "Manage payout methods.", icon: Wallet },
  { id: "reports", label: "Reports", subtitle: "Download learning reports.", icon: Wallet },
  { id: "edit", label: "Edit Profile", subtitle: "Update your profile details.", icon: Pencil },
  { id: "favourite", label: "Favourite", subtitle: "Save your favorite courses and lessons.", icon: Heart },
  { id: "settings", label: "Settings and Privacy", subtitle: "Manage privacy and security.", icon: Settings },
  { id: "help", label: "Help", subtitle: "Get support and guidance.", icon: HelpCircle },
  { id: "logout", label: "Logout", subtitle: "Sign out from this account.", icon: LogOut },
] as const;

export default function AccountPage({ role }: { role: "student" | "tutor" }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState("edit");
  const [profile, setProfile] = useState({
    name: "Shreeya Rai",
    email: "shreeya@mail.com",
    phone: "+977 9800000000",
  });
  const [savedMessage, setSavedMessage] = useState("");
  const [favorites, setFavorites] = useState<{ courses: any[]; lessons: any[] }>({
    courses: [],
    lessons: [],
  });
  const [receivedFavorites, setReceivedFavorites] = useState<{
    items: Array<{ student: { _id: string; name: string; email: string }; course: { _id: string; title: string; category: string } }>;
    summary: { totalFavorites: number; uniqueStudents: number; uniqueCourses: number };
  }>({
    items: [],
    summary: { totalFavorites: 0, uniqueStudents: 0, uniqueCourses: 0 },
  });
  const displayName = profile.name;

  const loadFavorites = async () => {
    if (role === "student") {
      try {
        const res = await apiFetch<any>("/users/me/favorites");
        setFavorites({
          courses: Array.isArray(res?.data?.courses) ? res.data.courses : [],
          lessons: Array.isArray(res?.data?.lessons) ? res.data.lessons : [],
        });
      } catch {
        setFavorites({ courses: [], lessons: [] });
      }
      return;
    }

    try {
      const res = await apiFetch<any>("/users/me/favorites/received");
      setReceivedFavorites({
        items: Array.isArray(res?.data?.items) ? res.data.items : [],
        summary: {
          totalFavorites: Number(res?.data?.summary?.totalFavorites || 0),
          uniqueStudents: Number(res?.data?.summary?.uniqueStudents || 0),
          uniqueCourses: Number(res?.data?.summary?.uniqueCourses || 0),
        },
      });
    } catch {
      setReceivedFavorites({
        items: [],
        summary: { totalFavorites: 0, uniqueStudents: 0, uniqueCourses: 0 },
      });
    }
  };

  useEffect(() => {
    apiFetch<any>("/users/me")
      .then((res) => {
        const user = res.data;
        if (user) {
          setProfile((prev) => ({
            name: user.name || prev.name,
            email: user.email || prev.email,
            phone: user.phone || prev.phone,
          }));
        }
      })
      .catch(() => {});
    loadFavorites().catch(() => {});
  }, [role]);

  const removeFavoriteCourse = async (courseId: string) => {
    if (!courseId) return;
    try {
      await apiFetch(`/users/me/favorites/courses/${courseId}`, { method: "DELETE" });
      await loadFavorites();
    } catch {}
  };

  const removeFavoriteLesson = async (lessonId: string) => {
    if (!lessonId) return;
    try {
      await apiFetch(`/users/me/favorites/lessons/${lessonId}`, { method: "DELETE" });
      await loadFavorites();
    } catch {}
  };

  const resolveCourseImage = (item: any) => {
    const raw = item?.thumbnailUrl || item?.imageUrl || "";
    if (!raw) return "";
    return String(raw).startsWith("http") ? raw : `${apiHost}${raw}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center justify-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/${role}`)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Account</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="rounded-3xl bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const href =
                  item.id === "settings"
                    ? `/dashboard/${role}/account/settings`
                    : item.id === "help"
                      ? `/dashboard/${role}/account/help`
                      : item.id === "payouts"
                        ? `/dashboard/${role}/account/payouts?from=account`
                        : item.id === "reports"
                          ? `/dashboard/${role}/account/reports`
                          : "";
                if (href) {
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm ${
                        activeId === item.id ? "bg-brand-100 text-brand-600" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      <Icon className="h-4 w-4" />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      if (item.id === "logout") {
                        window.localStorage.clear();
                        router.push("/login");
                      }
                    }}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm ${
                      activeId === item.id ? "bg-brand-100 text-brand-600" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.label}</span>
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                SR
              </div>
              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
                <p className="mt-2 text-sm text-slate-700">{profile.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
                <p className="mt-2 text-sm text-slate-700">{role === "student" ? "Student" : "Tutor"}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {menuItems.find((item) => item.id === activeId)?.subtitle ?? "Select an option to view details."}
              {activeId === "edit" && (
                <div className="mt-4 flex flex-col gap-3">
                  <input
                    value={profile.name}
                    onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs"
                    placeholder="Full name"
                  />
                  <input
                    value={profile.email}
                    onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs"
                    placeholder="Email address"
                  />
                  <input
                    value={profile.phone}
                    onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs"
                    placeholder="Phone number"
                  />
                  <button
                    onClick={() => {
                      apiFetch("/users/me", {
                        method: "PUT",
                        body: JSON.stringify({
                          name: profile.name,
                          email: profile.email,
                          phone: profile.phone,
                        }),
                      })
                        .then(() => setSavedMessage("Profile updated successfully."))
                        .catch((error) => setSavedMessage(error instanceof Error ? error.message : "Update failed."));
                    }}
                    className="rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Save changes
                  </button>
                </div>
              )}
              {activeId === "payouts" && (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-xs text-slate-500">Primary payout method</p>
                  <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-600">Bank transfer - **** 4321</div>
                  <button className="rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
                    Add payout method
                  </button>
                </div>
              )}
              {activeId === "reports" && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-600">January learning report</div>
                  <button className="rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
                    Download report
                  </button>
                </div>
              )}
              {activeId === "favourite" && (
                <div className="mt-4 flex flex-col gap-3">
                  {role !== "student" && (
                    <>
                      <div className="grid gap-2 text-xs sm:grid-cols-3">
                        <div className="rounded-2xl bg-white px-3 py-2 text-slate-600">
                          Total favourites: {receivedFavorites.summary.totalFavorites}
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-slate-600">
                          Students: {receivedFavorites.summary.uniqueStudents}
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-slate-600">
                          Courses: {receivedFavorites.summary.uniqueCourses}
                        </div>
                      </div>
                      {receivedFavorites.items.map((item, index) => (
                        <div
                          key={`${item.student._id}-${item.course._id}-${index}`}
                          className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-600"
                        >
                          <p className="font-semibold text-slate-800">{item.course.title || "Course"}</p>
                          <p className="mt-1 text-slate-500">
                            Student: {item.student.name || "Student"} - {item.course.category || "General"}
                          </p>
                        </div>
                      ))}
                      {receivedFavorites.items.length === 0 && (
                        <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
                          No student has favorited your courses yet.
                        </div>
                      )}
                    </>
                  )}
                  {role === "student" && (
                    <>
                      <p className="text-xs font-semibold uppercase text-slate-500">Favourite courses</p>
                      {favorites.courses.map((item: any) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs text-slate-600"
                        >
                          <Link href={`/dashboard/student/course/${item._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="h-8 w-8 overflow-hidden rounded-xl bg-slate-100">
                              {resolveCourseImage(item) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={resolveCourseImage(item)} alt={item.title || "Course"} className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                            <span className="truncate">
                              {item.title || "Course"} - {item.category || "General"}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFavoriteCourse(String(item._id))}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {favorites.courses.length === 0 && (
                        <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">No favourite courses yet.</div>
                      )}

                      <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Favourite lessons</p>
                      {favorites.lessons.map((item: any) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs text-slate-600"
                        >
                          <Link href={`/dashboard/student/course/${item?.course?._id || ""}`} className="truncate">
                            {item.title || "Lesson"} - {item?.course?.title || "Course"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFavoriteLesson(String(item._id))}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {favorites.lessons.length === 0 && (
                        <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">No favourite lessons yet.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {savedMessage && <p className="mt-3 text-xs text-emerald-600">{savedMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
