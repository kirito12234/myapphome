import Link from "next/link";
import HomeLandingPage from "./_components/HomeLandingPage";

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-[#F3F5F7]">
      <nav className="border-b border-[#E6EAF0] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#0B173A]">
            HOME<span className="text-[#FF7A12]">TUTOR</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="rounded-2xl bg-[#0B173A] px-5 py-2.5 text-sm font-semibold text-white"
            >
              9843784246
            </Link>
            <Link
              href="/onboarding"
              className="rounded-2xl bg-[#FF7A12] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Start Learning
            </Link>
          </div>
        </div>
      </nav>
      <HomeLandingPage />
    </div>
  );
}
