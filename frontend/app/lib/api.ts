"use client";

type ApiOptions = RequestInit & {
  auth?: boolean;
  withAuth?: boolean;
  isForm?: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const apiHost =
  (API_BASE.endsWith("/api/v1") ? API_BASE.replace("/api/v1", "") : "http://localhost:5000") ||
  "http://localhost:5000";

export const authStorage = {
  getToken: () =>
    typeof window === "undefined" ? null : window.localStorage.getItem("hometutor.token"),
  setToken: (token: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("hometutor.token", token);
  },
  getUser: <T = Record<string, unknown>>() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("hometutor.user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setUser: (user: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("hometutor.user", JSON.stringify(user));
    if (user.role) window.localStorage.setItem("hometutor.role", String(user.role));
    if (user.name) window.localStorage.setItem("hometutor.name", String(user.name));
  },
  clear: () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("hometutor.token");
    window.localStorage.removeItem("hometutor.user");
    window.localStorage.removeItem("hometutor.role");
    window.localStorage.removeItem("hometutor.name");
  },
};

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const withAuth = options.withAuth ?? options.auth ?? true;
  if (withAuth) {
    const token = authStorage.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.success === false) {
    const message = json.message || "Request failed";
    throw new Error(message);
  }

  return json as T;
}

export const api = {
  login: (payload: { emailOrPhone: string; password: string; role: "student" | "tutor" }) =>
    apiFetch<{ success: boolean; token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    }),
  register: (payload: {
    name?: string;
    fullName?: string;
    email: string;
    phone?: string;
    password: string;
    role: "student" | "tutor";
  }) =>
    apiFetch<{ success: boolean; token?: string; user?: any }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    }),
  me: () => apiFetch<{ success: boolean; data: { user: any } }>("/auth/me"),
  forgotPassword: (payload: { email: string }) =>
    apiFetch<{ success: true; message: string; data?: { resetToken?: string } }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    apiFetch<{ success: true; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    }),
};

export const getUser = authStorage.getUser;
export const getToken = authStorage.getToken;
export const setToken = authStorage.setToken;
export const setUser = authStorage.setUser;
