"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Circular countdown timer driven by an absolute `endsAt` epoch timestamp.
 * Using an absolute end time (rather than a decrementing counter) keeps the
 * display accurate even if the tab is throttled, and is robust to re-renders.
 *
 * Calls `onExpire` exactly once when the deadline passes.
 */
export function Timer({
  endsAt,
  durationMs,
  onExpire,
  className,
}: {
  endsAt: number;
  durationMs: number;
  onExpire?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, endsAt - Date.now())
  );

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const seconds = Math.ceil(remaining / 1000);
  const fraction = Math.max(0, Math.min(1, remaining / durationMs));

  // SVG ring geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fraction);

  const urgent = seconds <= 5;

  return (
    <div className={cn("relative h-24 w-24", className)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="fill-none stroke-white/10"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={urgent ? "#FB7185" : "url(#timer-grad)"}
          className={cn(
            "fill-none transition-[stroke-dashoffset] duration-100 ease-linear",
            urgent && "animate-pulse-glow"
          )}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center font-display text-3xl font-bold tabular-nums",
          urgent ? "text-rose-300" : "text-white"
        )}
        aria-live="polite"
      >
        {seconds}
      </div>
    </div>
  );
}
