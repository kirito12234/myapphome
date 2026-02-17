"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, MessageSquare, Search, User, Clock3 } from "lucide-react";

type DashboardNavProps = {
  role: "student" | "tutor";
};

type NavItem = {
  id: string;
  label: string;
  icon: any;
  path: string;
  tutorOnly?: boolean;
  studentOnly?: boolean;
};

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "" },
  { id: "course", label: "Course", icon: BookOpen, path: "course" },
  { id: "learn-today", label: "Learn Today", icon: Clock3, path: "learn-today", studentOnly: true },
  { id: "search", label: "Search", icon: Search, path: "search" },
  { id: "message", label: "Message", icon: MessageSquare, path: "message" },
  { id: "account", label: "Account", icon: User, path: "account" },
  { id: "explore", label: "Explore", icon: Search, path: "explore", tutorOnly: true }
] as const;

export default function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex w-full max-w-[220px] flex-col gap-2 rounded-3xl bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2 px-2 py-3 text-base font-semibold text-slate-900">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white">
          H
        </span>
        Home Tutor
      </div>
      {navItems
        .filter((item) => !(item.tutorOnly && role !== "tutor"))
        .filter((item) => !(item.studentOnly && role !== "student"))
        .map((item) => {
          const Icon = item.icon;
          const href = `/dashboard/${role}${item.path ? `/${item.path}` : ""}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.id}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium ${
                isActive ? "bg-brand-100 text-brand-600" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
