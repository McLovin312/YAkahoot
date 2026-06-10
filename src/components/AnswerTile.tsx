"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { AnswerShape } from "@/lib/answers";
import { ShapeIcon } from "./ShapeIcon";
import { cn } from "@/lib/utils";

/**
 * A single colored answer tile.
 *
 * Reused by:
 *  - the HOST screen (shows the answer `text`)
 *  - the PLAYER screen (text omitted -> players only see shape + color)
 *
 * Visual states:
 *  - default / hover
 *  - `selected`      : the player's chosen answer
 *  - `revealCorrect` : show the correct answer (results phase)
 *  - `dimmed`        : non-correct answers during the reveal
 */
export function AnswerTile({
  shape,
  text,
  onClick,
  disabled,
  selected,
  revealCorrect,
  dimmed,
  big,
}: {
  shape: AnswerShape;
  /** Answer text. Omit entirely for the player view. */
  text?: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  revealCorrect?: boolean;
  dimmed?: boolean;
  /** Larger sizing for the player full-screen buttons. */
  big?: boolean;
}) {
  const interactive = Boolean(onClick) && !disabled;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      aria-label={text ? `${shape.label}: ${text}` : shape.label}
      aria-pressed={selected}
      className={cn(
        "relative flex w-full items-center gap-4 rounded-2xl px-5 text-white",
        "font-display font-bold ring-1 ring-inset ring-white/25",
        "transition duration-200",
        // Hairline top highlight makes the gradient read as a lit surface.
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]",
        big ? "h-full min-h-[8rem] justify-center text-2xl" : "min-h-[5.5rem] text-xl",
        shape.bg,
        shape.glow,
        interactive && "cursor-pointer hover:brightness-110",
        !interactive && "cursor-default",
        selected && "ring-4 ring-white",
        dimmed && "opacity-30 saturate-50 shadow-none",
        revealCorrect && "ring-4 ring-white"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-white/15",
          big ? "h-16 w-16" : "h-12 w-12"
        )}
      >
        <ShapeIcon
          kind={shape.kind}
          className={cn("drop-shadow", big ? "h-10 w-10" : "h-7 w-7")}
        />
      </span>

      {/* Answer text is only rendered when provided (host view). */}
      {text && (
        <span className="text-left leading-tight drop-shadow-sm">{text}</span>
      )}

      {/* Result indicators */}
      {revealCorrect && (
        <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/30">
          <Check className="h-6 w-6" strokeWidth={3} />
        </span>
      )}
      {selected && !revealCorrect && dimmed && (
        <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/30">
          <X className="h-6 w-6" strokeWidth={3} />
        </span>
      )}
    </motion.button>
  );
}
