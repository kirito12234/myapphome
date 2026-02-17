"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import SliderIndicator from "./SliderIndicator";

const slides = [
  {
    title: "Numerous free trial courses",
    subtitle: "Choose tutors quickly and enjoy your first trial class at no cost."
  },
  {
    title: "Quick and easy learning",
    subtitle: "Flexible schedules and personalized lessons to improve every skill."
  },
  {
    title: "Trusted teachers nearby",
    subtitle: "Browse verified tutors based on subject and location."
  }
];

export default function OnboardingCard() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slideCount = slides.length;

  const handleSelect = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth;
    track.scrollTo({ left: index * slideWidth, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth;
    const nextIndex = Math.round(track.scrollLeft / slideWidth);
    setActiveIndex(Math.min(slideCount - 1, Math.max(0, nextIndex)));
  }, [slideCount]);

  const trackItems = useMemo(
    () =>
      slides.map((slide) => (
        <div
          key={slide.title}
          className="flex min-w-full snap-center flex-col items-center gap-6 px-2"
        >
          <div className="w-full rounded-3xl bg-brand-50 p-8 shadow-soft">
            <div className="flex min-h-[180px] items-center justify-center rounded-3xl bg-brand-100/60">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-soft">
                <GraduationCap className="h-10 w-10 text-brand-600" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900">{slide.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{slide.subtitle}</p>
          </div>
        </div>
      )),
    []
  );

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {trackItems}
      </div>

      <SliderIndicator count={slideCount} activeIndex={activeIndex} onSelect={handleSelect} />

      <div className="mt-2 flex w-full items-center gap-3">
        <Link
          href="/login?role=student"
          className="flex-1 rounded-2xl border border-brand-500 px-6 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50"
        >
          Student
        </Link>
        <Link
          href="/login?role=tutor"
          className="flex-1 rounded-2xl bg-brand-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-soft hover:bg-brand-500"
        >
          Teacher
        </Link>
      </div>
    </div>
  );
}

