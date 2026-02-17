"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, GraduationCap, PhoneCall, Search } from "lucide-react";

export default function HomeLandingPage() {
  const router = useRouter();
  const [aiMessage, setAiMessage] = useState("");
  const [aiReply, setAiReply] = useState("");

  const handleAskAi = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!aiMessage.trim()) return;
    setAiReply("Please login/signup.");
    setAiMessage("");
    setTimeout(() => router.push("/onboarding"), 900);
  };

  return (
    <main className="relative overflow-hidden bg-[#F3F5F7]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <section className="space-y-6">
          <p className="inline-flex items-center rounded-full bg-[#FCE8D2] px-5 py-1.5 text-sm font-semibold text-[#C94D00]">
            Online Tuition Platform
          </p>
          <h1 className="max-w-xl text-5xl font-black leading-[1.05] text-[#0B173A] md:text-7xl">
            <span className="block">Find your</span>
            <span className="block text-[#FF7A12]">Personal Tutor</span>
          </h1>
          <p className="max-w-xl text-lg leading-[1.45] text-[#334E73] md:text-xl">
            Learning should be simple and personal. Connect with expert tutors and start today.
          </p>

          <div className="flex flex-col gap-3 rounded-[28px] border border-[#ECF0F4] bg-white p-3 shadow-soft sm:flex-row">
            <div className="flex flex-1 items-center gap-2 px-2 text-[#8EA2BC]">
              <Search className="h-5 w-5" />
              <span>What do you want to learn today?</span>
            </div>
            <Link
              href="/onboarding"
              className="rounded-3xl bg-[#FF7A12] px-8 py-3 text-center text-base font-semibold text-white"
            >
              Find Tutor
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {["Academic", "Languages", "Competitive Exams", "Skills"].map((item) => (
              <Link
                key={item}
                href="/onboarding"
                className="rounded-2xl border border-[#D6DEE8] bg-white px-5 py-2.5 text-lg font-semibold text-[#243B5D] shadow-soft"
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="rounded-2xl border border-[#FF7A12] px-7 py-3 text-base font-semibold text-[#FF7A12]"
            >
              Tutor Web App
            </Link>
            <Link
              href="/onboarding"
              className="rounded-2xl bg-[#0B173A] px-7 py-3 text-base font-semibold text-white"
            >
              Learner Web App
            </Link>
          </div>
        </section>

        <section className="relative">
          <div className="relative rounded-[44px] bg-[#FF7A12] p-8 text-white shadow-soft md:min-h-[450px]">
            <div className="absolute -left-5 top-8 rounded-3xl bg-white px-5 py-4 text-[#0B173A] shadow-soft">
              <p className="text-sm text-[#55708E]">Expert Tutors</p>
              <p className="text-3xl font-bold">2,00,000+</p>
            </div>
            <div className="absolute -right-4 bottom-10 rounded-3xl bg-white px-5 py-4 text-[#0B173A] shadow-soft">
              <p className="text-sm text-[#55708E]">Subjects</p>
              <p className="text-3xl font-bold">100+</p>
            </div>
            <div className="flex min-h-[320px] items-center justify-center md:min-h-[450px]">
              <div className="flex h-52 w-52 items-center justify-center rounded-full bg-white text-[#FF7A12]">
                <GraduationCap className="h-24 w-24" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-4 right-4 z-20 w-[min(92vw,560px)] rounded-3xl border border-[#F4B780] bg-white p-3 shadow-soft">
        <form onSubmit={handleAskAi} className="flex items-center gap-2">
          <div className="rounded-xl bg-[#FCE8D2] p-2 text-[#FF7A12]">
            <Bot className="h-5 w-5" />
          </div>
          <input
            value={aiMessage}
            onChange={(event) => setAiMessage(event.target.value)}
            placeholder="Ask AI"
            className="flex-1 rounded-xl border border-[#D6DEE8] px-4 py-2.5 text-base text-[#0B173A] outline-none focus:border-[#FF7A12]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#0B173A] px-5 py-2.5 text-base font-semibold text-white"
          >
            Send
          </button>
        </form>
        {aiReply ? (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{aiReply}</p>
        ) : null}
        <Link
          href="/onboarding"
          className="mt-2 inline-flex items-center gap-2 rounded-lg text-lg font-semibold text-[#FF7A12]"
        >
          <PhoneCall className="h-4 w-4" />
          Continue to app
        </Link>
      </div>
    </main>
  );
}
