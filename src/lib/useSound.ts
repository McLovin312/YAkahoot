"use client";

import { useCallback, useRef } from "react";

/**
 * Lightweight sound-effects hook built on the Web Audio API.
 *
 * Generates short tones at runtime so the project ships with NO audio asset
 * files (keeps the repo small and avoids licensing concerns). Sounds are only
 * produced when `enabled` is true.
 */
export type SoundName = "click" | "join" | "correct" | "wrong" | "tick" | "win";

export function useSound(enabled: boolean) {
  // Reuse a single AudioContext across plays.
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const beep = useCallback(
    (freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.08) => {
      const ctx = getCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      // Quick fade-out to avoid clicks.
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.stop(now + durationMs / 1000);
    },
    [getCtx]
  );

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      switch (name) {
        case "click":
          beep(440, 80, "triangle");
          break;
        case "join":
          beep(660, 120, "sine");
          setTimeout(() => beep(880, 120, "sine"), 90);
          break;
        case "correct":
          beep(660, 120, "square", 0.06);
          setTimeout(() => beep(990, 160, "square", 0.06), 110);
          break;
        case "wrong":
          beep(200, 250, "sawtooth", 0.05);
          break;
        case "tick":
          beep(880, 50, "sine", 0.04);
          break;
        case "win":
          [523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => beep(f, 180, "square", 0.06), i * 140)
          );
          break;
      }
    },
    [enabled, beep]
  );

  return play;
}
