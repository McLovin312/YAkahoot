"use client";

import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";

/**
 * Full-screen celebratory confetti.
 * Tracks the window size so the confetti fills the viewport, and respects the
 * user's reduced-motion preference (renders nothing in that case).
 */
export function Confetti({ active = true }: { active?: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);

    return () => {
      window.removeEventListener("resize", update);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  if (!active || reducedMotion || size.width === 0) return null;

  return (
    <ReactConfetti
      width={size.width}
      height={size.height}
      numberOfPieces={250}
      recycle={false}
      gravity={0.25}
      colors={[
        "#FFC53D",
        "#818CF8",
        "#A855F7",
        "#FF5876",
        "#54A2FF",
        "#3BD978",
        "#FFFFFF",
      ]}
    />
  );
}
