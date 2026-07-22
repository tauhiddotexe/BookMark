import { useState, useId } from "react";

const STARS = 5;

export function StarPicker({ value, onChange }: { value: string | number | null; onChange: (value: string) => void }) {
  const current = value ? Number(value) : 0;
  const [hover, setHover] = useState(0);
  const uid = useId();

  const display = hover || current;

  return (
    <div
      className="inline-flex gap-0.5 select-none"
      onPointerLeave={() => setHover(0)}
      role="radiogroup"
      aria-label="Rating"
    >
      {Array.from({ length: STARS }, (_, i) => {
        const starNum = i + 1;
        const fill = Math.min(1, Math.max(0, display - i));
        const gradId = `star-grad-${uid}-${i}`;

        return (
          <div
            key={i}
            className="relative w-7 h-7 cursor-pointer touch-manipulation"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              setHover(x < rect.width / 2 ? starNum - 0.5 : starNum);
            }}
            onClick={() => {
              if (hover > 0) onChange(String(Math.max(0.5, hover)));
            }}
            role="radio"
            aria-checked={current === starNum || current === starNum - 0.5}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(String(starNum)); }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
              <defs>
                <linearGradient id={gradId}>
                  <stop offset={`${fill * 100}%`} stopColor="var(--color-accent)" />
                  <stop offset={`${fill * 100}%`} stopColor="rgba(255,255,255,0.08)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={`url(#${gradId})`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.5"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
