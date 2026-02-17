"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const faqs = [
  {
    question: "How do I book a tutor?",
    answer: "Go to Search, choose a tutor, and tap Request tutor."
  },
  {
    question: "How to reset my password?",
    answer: "Open Settings & Privacy and use Change password."
  },
  {
    question: "How do I contact support?",
    answer: "Use the contact form below and we will respond within 24 hours."
  }
];

export default function HelpPage({ role }: { role: "student" | "tutor" }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href={`/dashboard/${role}/account`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Help</h1>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">FAQs</h2>
          <div className="mt-4 flex flex-col gap-3">
            {faqs.map((item) => (
              <div key={item.question} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.question}</p>
                <p className="mt-2 text-xs text-slate-500">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">Contact support</h2>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe your issue..."
            className="mt-4 h-24 w-full rounded-2xl border border-slate-200 px-4 py-2 text-xs"
          />
          <button
            onClick={() => {
              setStatus("Support request sent.");
              setMessage("");
            }}
            className="mt-3 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Send message
          </button>
        </div>

        {status && <p className="text-xs text-emerald-600">{status}</p>}
      </div>
    </div>
  );
}

