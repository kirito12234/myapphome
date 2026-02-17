"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api, authStorage } from "../../lib/api";
import { Role, validateLogin } from "../schema";

const ROLE_STORAGE_KEY = "hometutor.role";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>("student");
  const [formValues, setFormValues] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
    if (storedRole) setRole(storedRole);
    const queryRole = searchParams.get("role") as Role | null;
    if (queryRole) setRole(queryRole);
  }, [searchParams]);

  const handleChange = (field: "identifier" | "password") => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateLogin(formValues);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    try {
      setStatus("");
      const response = await api.login({
        emailOrPhone: formValues.identifier,
        password: formValues.password,
        role,
      });

      authStorage.setToken(response.token);
      const me = await api.me();
      const responseUser = ((me as any)?.data?.user || response.user || {}) as Record<string, any>;
      const serverRole = String(responseUser.role || "student");
      const normalizedRole: Role =
        serverRole === "tutor" || serverRole === "teacher" ? "tutor" : "student";

      if (normalizedRole !== role) {
        authStorage.clear();
        setStatus(
          `This account is registered as ${normalizedRole === "student" ? "Student" : "Tutor"}. Switch role to continue.`
        );
        return;
      }

      const normalizedUser = { ...responseUser, role: normalizedRole };

      authStorage.setUser(normalizedUser);
      window.localStorage.setItem(ROLE_STORAGE_KEY, normalizedRole);
      window.localStorage.setItem("hometutor.name", String(responseUser.name || ""));
      router.push(`/dashboard/${normalizedRole}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">
            {role === "student" ? "Student" : "Tutor"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Log In</h1>
        </div>
        <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          {(["student", "tutor"] as Role[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setRole(item)}
              className={`rounded-full px-4 py-2 ${
                role === item ? "bg-white text-brand-600 shadow-soft" : "text-slate-500"
              }`}
            >
              {item === "student" ? "Student" : "Tutor"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-slate-700">
          Email or phone
          <input
            value={formValues.identifier}
            onChange={handleChange("identifier")}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Enter email or phone"
          />
          {errors.identifier && <span className="mt-1 block text-xs text-rose-500">{errors.identifier}</span>}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Password
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              value={formValues.password}
              onChange={handleChange("password")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <span className="mt-1 block text-xs text-rose-500">{errors.password}</span>}
        </label>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Use your registered credentials to continue.</span>
          <Link href="/forgot-password" className="font-semibold text-brand-600">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-500"
        >
          Log In
        </button>
        {status && <p className="text-xs text-rose-500">{status}</p>}
      </form>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href={`/register?role=${role}`} className="font-semibold text-brand-600">
          Sign up
        </Link>
      </p>
    </div>
  );
}
