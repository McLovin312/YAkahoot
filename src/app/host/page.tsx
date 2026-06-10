"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  BookOpen,
  Crown,
  Globe2,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { TOPICS, getQuestions } from "@/data/topics";
import type { TopicId } from "@/types";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

/** Per-round icon + accent styling. */
const TOPIC_LOOK: Record<
  TopicId,
  { icon: LucideIcon; iconBg: string; hover: string }
> = {
  brainrot: {
    icon: Brain,
    iconBg: "from-grape-500 to-grape-600",
    hover: "hover:border-grape-400/50 hover:shadow-[0_0_44px_-10px_rgba(168,85,247,0.5)]",
  },
  bible: {
    icon: BookOpen,
    iconBg: "from-[#54A2FF] to-[#1859C9]",
    hover: "hover:border-sky-400/50 hover:shadow-[0_0_44px_-10px_rgba(45,127,249,0.5)]",
  },
  "random-facts": {
    icon: Globe2,
    iconBg: "from-[#3BD978] to-[#0E8A3E]",
    hover: "hover:border-emerald-400/50 hover:shadow-[0_0_44px_-10px_rgba(31,171,84,0.5)]",
  },
  championship: {
    icon: Crown,
    iconBg: "from-gold-400 to-gold-600",
    hover: "hover:border-gold-400/60 hover:shadow-glow-gold",
  },
};

/**
 * Host round-selection screen.
 * Three regular rounds in a row, plus the Championship finals card below.
 * Selecting a round creates a game (fresh PIN) and routes to the host lobby.
 */
export default function HostTopicPage() {
  const router = useRouter();
  const createGame = useGameStore((s) => s.createGame);
  const [randomize, setRandomize] = useState(false);

  function selectTopic(topic: TopicId) {
    createGame(topic, { randomize });
    router.push("/host/game");
  }

  const regular = TOPICS.filter((t) => t.id !== "championship");
  const finals = TOPICS.find((t) => t.id === "championship");

  return (
    <main className="relative min-h-dvh px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="btn-ghost !py-2 !text-base">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            Back
          </Link>

          {/* Shuffle question-order toggle */}
          <button
            type="button"
            onClick={() => setRandomize((v) => !v)}
            aria-pressed={randomize}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 font-display font-semibold transition duration-200",
              randomize
                ? "border-brand-400/60 bg-brand-500/20 text-brand-200 shadow-glow-brand"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            )}
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.5} />
            Shuffle questions: {randomize ? "On" : "Off"}
          </button>
        </div>

        <div className="mb-8 text-center sm:text-left">
          <p className="eyebrow mb-2">Set the stage</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Pick a round
          </h1>
        </div>

        {/* Regular rounds */}
        <div className="grid gap-5 sm:grid-cols-3">
          {regular.map((topic, i) => {
            const look = TOPIC_LOOK[topic.id];
            const Icon = look.icon;
            const count = getQuestions(topic.id).length;
            return (
              <motion.button
                key={topic.id}
                type="button"
                onClick={() => selectTopic(topic.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  "card group flex cursor-pointer flex-col items-start gap-4 p-6 text-left transition duration-200 hover:bg-white/[0.07]",
                  look.hover
                )}
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b text-white",
                    look.iconBg
                  )}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.25} />
                </span>
                <div className="flex-1">
                  <span className="font-display text-2xl font-bold text-white">
                    {topic.name}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {topic.description}
                  </p>
                </div>
                <span className="chip !text-xs">{count} questions</span>
              </motion.button>
            );
          })}
        </div>

        {/* Championship finals */}
        {finals && (
          <motion.button
            type="button"
            onClick={() => selectTopic(finals.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card group mt-6 flex w-full cursor-pointer flex-col items-center gap-4 border-gold-400/30 bg-gradient-to-r from-gold-400/10 via-gold-400/5 to-gold-400/10 p-6 text-left transition duration-200 hover:border-gold-400/60 hover:shadow-glow-gold sm:flex-row"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 shadow-glow-gold">
              <Crown className="h-8 w-8" strokeWidth={2.25} />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="font-display text-2xl font-bold text-white">
                  {finals.name}
                </span>
                <span className="rounded-full bg-gold-400 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-night-950">
                  {finals.badge}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {finals.description}
              </p>
            </div>
            <span className="chip shrink-0 !border-gold-400/40 !text-gold-300">
              {getQuestions(finals.id).length} questions
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          </motion.button>
        )}
      </div>
    </main>
  );
}
