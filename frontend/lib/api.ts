import { authStore } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

type ApiOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = authStore.getToken();
  const headers: Record<string, string> = {
    ...(options.headers || {})
  };

  if (!options.isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.isFormData
          ? (options.body as BodyInit)
          : JSON.stringify(options.body)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const message = payload.message || payload.error || "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; phone?: string; password: string; role: string }) =>
      apiRequest<{ token: string; user: any }>("/auth/register", { method: "POST", body }),
    login: (body: { emailOrPhone: string; password: string }) =>
      apiRequest<{ token: string; user: any }>("/auth/login", { method: "POST", body }),
    me: () => apiRequest<{ data: { user: any } }>("/auth/me")
  },
  users: {
    me: () => apiRequest<{ data: any }>("/users/me"),
    updateMe: (body: { name?: string; email?: string; phone?: string }) =>
      apiRequest<{ data: any }>("/users/me", { method: "PUT", body }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      apiRequest<{ data: { message: string } }>("/users/me/password", { method: "PUT", body }),
    updateSettings: (body: Record<string, boolean>) =>
      apiRequest<{ data: any }>("/users/me/settings", { method: "PUT", body })
  },
  courses: {
    list: (query = "") => apiRequest<{ data: any[] }>(`/courses${query}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ data: any }>("/courses", { method: "POST", body }),
    one: (id: string) => apiRequest<{ data: any }>(`/courses/${id}`),
    uploadImage: (id: string, file: File) => {
      const form = new FormData();
      form.append("image", file);
      return apiRequest<{ data: any }>(`/courses/${id}/image`, {
        method: "POST",
        body: form,
        isFormData: true
      });
    }
  },
  notifications: {
    list: () => apiRequest<{ data: any[] }>("/notifications")
  },
  threads: {
    list: () => apiRequest<{ data: any[] }>("/threads"),
    create: (body: { participants: string[]; title?: string }) =>
      apiRequest<{ data: any }>("/threads", { method: "POST", body })
  },
  messages: {
    list: (threadId: string) => apiRequest<{ data: any[] }>(`/threads/${threadId}/messages`),
    send: (threadId: string, text: string) =>
      apiRequest<{ data: any }>(`/threads/${threadId}/messages`, {
        method: "POST",
        body: { text }
      })
  },
  requests: {
    list: () => apiRequest<{ data: any[] }>("/teacher-requests"),
    create: (body: { tutor: string; course: string; message?: string }) =>
      apiRequest<{ data: any }>("/teacher-requests", { method: "POST", body }),
    update: (id: string, body: { status: "accepted" | "rejected" | "pending" }) =>
      apiRequest<{ data: any }>(`/teacher-requests/${id}`, { method: "PUT", body })
  },
  payments: {
    submit: (form: FormData) =>
      apiRequest<{ data: any }>("/payments/submit", { method: "POST", body: form, isFormData: true }),
    status: (courseId: string) => apiRequest<{ data: { status: string | null; hasAccess: boolean } }>(`/payments/status/${courseId}`),
    pending: () => apiRequest<{ data: any[] }>("/payments/pending"),
    approve: (id: string) =>
      apiRequest<{ data: any }>(`/payments/${id}/status`, { method: "PUT", body: { status: "approved" } }),
    reject: (id: string, reason?: string) =>
      apiRequest<{ data: any }>(`/payments/${id}/status`, {
        method: "PUT",
        body: { status: "rejected", rejectionReason: reason || "Rejected by tutor" }
      }),
    summary: () => apiRequest<{ data: { thisMonth: number; pending: number; lastMonth: number; currency: string } }>(
      "/payments/summary"
    )
  },
  payoutSettings: {
    listMine: () => apiRequest<{ data: any[] }>("/payout-settings"),
    listByTutor: (tutorId: string) => apiRequest<{ data: any[] }>(`/payout-settings/tutor/${tutorId}`),
    uploadQr: (file: File) => {
      const form = new FormData();
      form.append("qrCode", file);
      return apiRequest<{ data: { url: string } }>("/payout-settings/upload-qr", {
        method: "POST",
        body: form,
        isFormData: true
      });
    },
    create: (body: Record<string, unknown>) =>
      apiRequest<{ data: any }>("/payout-settings", { method: "POST", body }),
    update: (id: string, body: Record<string, unknown>) =>
      apiRequest<{ data: any }>(`/payout-settings/${id}`, { method: "PUT", body })
  },
  tutors: {
    list: (query = "") => apiRequest<{ data: any[] }>(`/tutors${query}`)
  },
  sessions: {
    list: () => apiRequest<{ data: any[] }>("/sessions"),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ data: any }>("/sessions", { method: "POST", body })
  },
  enrollments: {
    list: (query = "") => apiRequest<{ data: any[] }>(`/enrollments${query}`)
  }
};

export const publicUploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "http://localhost:5000";
const API_BASE2 = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1";

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
  user?: T;
};

export const getToken = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("auth.token") ?? "";
};

export const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("auth.token", token);
};

export const setUser = (user: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("auth.user", JSON.stringify(user));
};

export const getUser = <T,>() => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("auth.user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { withAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});
  const withAuth = options.withAuth !== false;
  if (withAuth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE2}${path}`, {
    ...options,
    headers
  });

  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

