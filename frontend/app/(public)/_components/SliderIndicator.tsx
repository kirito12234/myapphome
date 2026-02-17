"use client";

type SliderIndicatorProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
};

export default function SliderIndicator({
  count,
  activeIndex,
  onSelect
}: SliderIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={`h-2.5 w-2.5 rounded-full ${
            activeIndex === index ? "bg-brand-600" : "bg-slate-200"
          }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
}








