"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MonitorPlay, Smartphone, Timer, Trophy, Zap } from "lucide-react";
import { ShapeIcon } from "@/components/ShapeIcon";

/**
 * Landing page — the marquee.
 * Two entry points: Host (big screen) and Join (phone), under a big show title
 * flanked by the four floating answer shapes.
 */
export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Floating answer shapes (decorative) */}
      <FloatingShape kind="triangle" className="left-[8%] top-[14%] rotate-12 text-[#FF5876]" delay={0} />
      <FloatingShape kind="diamond" className="right-[10%] top-[18%] -rotate-6 text-[#54A2FF]" delay={0.8} />
      <FloatingShape kind="circle" className="bottom-[20%] left-[12%] text-[#FFC53D]" delay={1.6} />
      <FloatingShape kind="square" className="bottom-[16%] right-[9%] rotate-6 text-[#3BD978]" delay={2.4} />

      {/* Focused spotlight behind the title */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-[110px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full max-w-3xl flex-col items-center text-center"
      >
        <p className="eyebrow mb-4">Lakeside YA presents</p>

        <h1 className="font-display text-6xl font-extrabold leading-[0.92] tracking-tight text-white sm:text-8xl">
          Trivia
          <span className="block bg-gradient-to-r from-brand-300 via-grape-400 to-gold-400 bg-clip-text text-transparent">
            Night
          </span>
        </h1>

        <p className="mt-6 max-w-md text-lg text-slate-400">
          Three rounds. One champion. Questions on the big screen, answers on
          your phone.
        </p>

        {/* Primary actions */}
        <div className="mt-12 grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/host"
            className="card group flex flex-col items-center gap-3 px-6 py-9 transition duration-200 hover:-translate-y-1 hover:border-brand-400/50 hover:bg-white/[0.07] hover:shadow-glow-brand"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-glow-brand">
              <MonitorPlay className="h-7 w-7" strokeWidth={2.25} />
            </span>
            <span className="font-display text-2xl font-bold text-white">
              Host a game
            </span>
            <span className="text-sm text-slate-400">
              Pick a round, put the PIN on the big screen
            </span>
          </Link>

          <Link
            href="/player"
            className="card group flex flex-col items-center gap-3 px-6 py-9 transition duration-200 hover:-translate-y-1 hover:border-grape-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_44px_-10px_rgba(168,85,247,0.55)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-grape-500 to-grape-600 text-white shadow-[0_0_44px_-10px_rgba(168,85,247,0.55)]">
              <Smartphone className="h-7 w-7" strokeWidth={2.25} />
            </span>
            <span className="font-display text-2xl font-bold text-white">
              Join with PIN
            </span>
            <span className="text-sm text-slate-400">
              Enter the game PIN and lock in your answers
            </span>
          </Link>
        </div>

        {/* How it plays */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          <span className="chip">
            <Timer className="h-4 w-4 text-brand-300" strokeWidth={2.5} />
            20 seconds a question
          </span>
          <span className="chip">
            <Zap className="h-4 w-4 text-gold-400" strokeWidth={2.5} />
            Faster answers score more
          </span>
          <span className="chip">
            <Trophy className="h-4 w-4 text-grape-400" strokeWidth={2.5} />
            Round winners reach the Finals
          </span>
        </div>
      </motion.div>
    </main>
  );
}

/** A soft-glowing answer shape drifting in the backdrop. */
function FloatingShape({
  kind,
  className,
  delay,
}: {
  kind: "triangle" | "diamond" | "circle" | "square";
  className?: string;
  delay: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5, y: [0, -14, 0] }}
      transition={{
        opacity: { duration: 1, delay },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`pointer-events-none absolute h-14 w-14 ${className ?? ""}`}
    >
      <ShapeIcon kind={kind} className="h-full w-full fill-current opacity-90 drop-shadow-[0_0_18px_currentColor]" />
    </motion.div>
  );
}
