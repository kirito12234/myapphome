"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, authStorage } from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const token = authStorage.getToken();
        if (!token) {
          router.replace("/login");
          return;
        }

        const me = await api.me();
        const user = (me as any)?.data?.user || (me as any)?.user;
        if (!user) {
          authStorage.clear();
          router.replace("/login");
          return;
        }

        const role = user.role === "teacher" ? "tutor" : user.role;
        const wantsStudent = pathname.startsWith("/dashboard/student");
        const wantsTutor = pathname.startsWith("/dashboard/tutor");

        if ((wantsStudent && role !== "student") || (wantsTutor && role !== "tutor")) {
          router.replace(`/dashboard/${role}`);
          return;
        }

        authStorage.setUser(user);
        connectSocket();
        if (mounted) setReady(true);
      } catch {
        authStorage.clear();
        disconnectSocket();
        router.replace("/login");
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
