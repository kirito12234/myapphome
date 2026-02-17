import Link from "next/link";

export default function Header() {
  return (
    <header className="flex w-full items-center justify-end">
      <Link
        href="/login"
        className="text-sm font-semibold text-slate-400 hover:text-slate-600"
      >
        Skip
      </Link>
    </header>
  );
}

