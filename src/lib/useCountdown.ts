"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds remaining until `target` (epoch ms), ticking ~5x a second.
 * Driven by the absolute deadline (not a decrementing counter) so it stays
 * accurate across re-renders and throttled tabs. Returns 0 once passed.
 */
export function useCountdown(target: number | null | undefined): number {
  const [left, setLeft] = useState(() =>
    target ? Math.max(0, target - Date.now()) : 0
  );

  useEffect(() => {
    if (!target) return;
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [target]);

  return target ? left : 0;
}
