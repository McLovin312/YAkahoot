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
 *  - the HOST screen (row layout: shape chip + answer text)
 *  - the PLAYER screen (`big`: full-bleed tap target, shape badge in the
 *    corner, answer text filling the tile)
 *
 * Visual states:
 *  - default / hover / pressed
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
  textClass,
  appearDelay,
}: {
  shape: AnswerShape;
  /** Answer text shown on the tile. */
  text?: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  revealCorrect?: boolean;
  dimmed?: boolean;
  /** Larger sizing for the player full-screen buttons. */
  big?: boolean;
  /** Font-size class for the big-tile text (player auto-sizes by length). */
  textClass?: string;
  /** Seconds to wait before the entrance animation (staggered grids). */
  appearDelay?: number;
}) {
  const interactive = Boolean(onClick) && !disabled;
  // Player tile with text: badge in the corner, text takes the stage.
  const bigText = Boolean(big && text);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      initial={
        appearDelay !== undefined
          ? { opacity: 0, y: 18, scale: 0.96 }
          : undefined
      }
      animate={
        appearDelay !== undefined ? { opacity: 1, y: 0, scale: 1 } : undefined
      }
      transition={
        appearDelay !== undefined
          ? {
              type: "spring",
              stiffness: 360,
              damping: 26,
              delay: appearDelay,
            }
          : undefined
      }
      aria-label={text ? `${shape.label}: ${text}` : shape.label}
      aria-pressed={selected}
      className={cn(
        "relative flex w-full items-center rounded-2xl text-white",
        "font-display font-bold ring-1 ring-inset ring-white/25",
        "transition duration-200",
        // Hairline top highlight makes the gradient read as a lit surface.
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]",
        bigText
          ? "h-full min-h-[8rem] justify-center px-3 pb-3 pt-10 text-center"
          : big
            ? "h-full min-h-[8rem] justify-center px-5 text-2xl"
            : "min-h-[5.5rem] gap-4 px-5 text-xl",
        shape.bg,
        shape.glow,
        interactive && "cursor-pointer hover:brightness-110",
        !interactive && "cursor-default",
        selected && "ring-4 ring-white",
        dimmed && "opacity-30 saturate-50 shadow-none",
        revealCorrect && "ring-4 ring-white"
      )}
    >
      {/* Shape — corner badge when text fills the tile, centerpiece otherwise */}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-white/15",
          bigText
            ? "absolute left-2.5 top-2.5 h-8 w-8 rounded-lg"
            : cn("rounded-xl", big ? "h-16 w-16" : "h-12 w-12")
        )}
      >
        <ShapeIcon
          kind={shape.kind}
          className={cn(
            "drop-shadow",
            bigText ? "h-5 w-5" : big ? "h-10 w-10" : "h-7 w-7"
          )}
        />
      </span>

      {text && (
        <span
          className={cn(
            "leading-tight drop-shadow-sm",
            bigText
              ? cn("max-w-full text-balance", textClass ?? "text-xl")
              : "text-left"
          )}
        >
          {text}
        </span>
      )}

      {/* Result indicators */}
      {revealCorrect && (
        <span className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/30">
          <Check className="h-6 w-6" strokeWidth={3} />
        </span>
      )}
      {selected && big && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/30"
        >
          <Check className="h-5 w-5" strokeWidth={3.5} />
        </motion.span>
      )}
      {selected && !big && !revealCorrect && dimmed && (
        <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/30">
          <X className="h-6 w-6" strokeWidth={3} />
        </span>
      )}
    </motion.button>
  );
}
