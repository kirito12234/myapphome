"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../lib/api";
import { Role, validateRegister } from "../schema";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as Role | null) ?? "student";

  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: initialRole,
    acceptedTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setFormValues((prev) => ({ ...prev, role: initialRole }));
  }, [initialRole]);

  const handleChange = (field: keyof typeof formValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateRegister(formValues);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    try {
      setStatus("");
      setSuccess("");
      await api.register({
        name: formValues.fullName,
        fullName: formValues.fullName,
        email: formValues.email,
        phone: formValues.phone || undefined,
        password: formValues.password,
        role: formValues.role
      });
      // Don't auto-login; redirect to login page.
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Registration failed.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">
          {formValues.role === "student" ? "Student" : "Tutor"}
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="text-sm text-slate-500">Enter your details below to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-slate-700">
          Full name
          <input
            value={formValues.fullName}
            onChange={handleChange("fullName")}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Enter full name"
          />
          {errors.fullName && <span className="mt-1 block text-xs text-rose-500">{errors.fullName}</span>}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            value={formValues.email}
            onChange={handleChange("email")}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Enter email"
          />
          {errors.email && <span className="mt-1 block text-xs text-rose-500">{errors.email}</span>}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Phone (optional)
          <input
            value={formValues.phone}
            onChange={handleChange("phone")}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Enter phone number"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Password
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              value={formValues.password}
              onChange={handleChange("password")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Create password"
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

        <label className="text-sm font-medium text-slate-700">
          Role
          <select
            value={formValues.role}
            onChange={handleChange("role")}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="student">Student</option>
            <option value="tutor">Tutor</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={formValues.acceptedTerms}
            onChange={handleChange("acceptedTerms")}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
          />
          I agree to the Terms &amp; Conditions
        </label>
        {errors.acceptedTerms && <span className="text-xs text-rose-500">{errors.acceptedTerms}</span>}

        <button
          type="submit"
          className="mt-2 w-full rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-500"
        >
          Create account
        </button>
        {status && <p className="text-xs text-rose-500">{status}</p>}
        {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}
      </form>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Log in
        </Link>
      </p>
    </div>
  );
}






