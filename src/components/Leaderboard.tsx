"use client";

import { motion } from "framer-motion";
import { Crown, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Live leaderboard.
 * - Highlights the Top 3 prominently (podium row).
 * - Lists the full ranking underneath.
 * - Optionally highlights one username (the local player's own row).
 */
export function Leaderboard({
  entries,
  highlightUsername,
  className,
}: {
  entries: LeaderboardEntry[];
  highlightUsername?: string;
  className?: string;
}) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className={cn("w-full", className)}>
      {/* ---- Top 3 podium ---- */}
      {top3.length > 0 && (
        <div className="mb-6 grid grid-cols-3 items-end gap-3">
          {/* Reorder visually to 2nd, 1st, 3rd for a classic podium feel */}
          {orderForPodium(top3).map((entry) => (
            <PodiumCard
              key={entry.username}
              entry={entry}
              highlight={entry.username === highlightUsername}
            />
          ))}
        </div>
      )}

      {/* ---- Full leaderboard ---- */}
      <ul className="space-y-2">
        {entries.length === 0 && (
          <li className="card p-4 text-center text-slate-400">
            No players yet.
          </li>
        )}
        {rest.map((entry) => (
          <motion.li
            key={entry.username}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 backdrop-blur",
              entry.username === highlightUsername
                ? "border-brand-400/50 bg-brand-500/15"
                : "border-white/10 bg-white/[0.04]"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 font-display text-sm font-bold tabular-nums text-slate-300">
                {entry.rank}
              </span>
              <span className="font-display font-semibold text-slate-100">
                {entry.username}
              </span>
            </div>
            <span className="font-display font-bold tabular-nums text-brand-300">
              {entry.score.toLocaleString()}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** Reorders [1st, 2nd, 3rd] -> [2nd, 1st, 3rd] for the podium layout. */
function orderForPodium(top3: LeaderboardEntry[]): LeaderboardEntry[] {
  if (top3.length === 3) return [top3[1], top3[0], top3[2]];
  return top3;
}

function PodiumCard({
  entry,
  highlight,
}: {
  entry: LeaderboardEntry;
  highlight?: boolean;
}) {
  const styles: Record<
    number,
    { surface: string; icon: React.ReactNode; h: string }
  > = {
    1: {
      surface:
        "border-gold-400/60 bg-gradient-to-b from-gold-400/25 to-gold-600/10 shadow-glow-gold",
      icon: <Crown className="h-6 w-6 text-gold-400" strokeWidth={2.5} />,
      h: "h-36",
    },
    2: {
      surface: "border-slate-300/40 bg-gradient-to-b from-slate-300/20 to-slate-400/5",
      icon: <Medal className="h-6 w-6 text-slate-300" strokeWidth={2.5} />,
      h: "h-28",
    },
    3: {
      surface: "border-orange-400/40 bg-gradient-to-b from-orange-400/20 to-orange-500/5",
      icon: <Medal className="h-6 w-6 text-orange-300" strokeWidth={2.5} />,
      h: "h-24",
    },
  };
  const s = styles[entry.rank] ?? styles[3];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "flex flex-col items-center justify-end rounded-2xl border p-3 text-center backdrop-blur",
        s.surface,
        s.h,
        highlight && "ring-2 ring-brand-400/70"
      )}
    >
      {s.icon}
      <span className="mt-1 w-full truncate font-display text-sm font-bold text-white">
        {entry.username}
      </span>
      <span className="font-display text-lg font-extrabold tabular-nums text-white">
        {entry.score.toLocaleString()}
      </span>
      <span className="font-display text-xs font-semibold text-slate-300">
        #{entry.rank}
      </span>
    </motion.div>
  );
}
