import type { ShapeKind } from "@/lib/answers";
import { cn } from "@/lib/utils";

/**
 * Renders one of the four answer shapes as a crisp white SVG icon.
 * Used both on the host answer tiles and the player answer buttons.
 */
export function ShapeIcon({
  kind,
  className,
}: {
  kind: ShapeKind;
  className?: string;
}) {
  const common = cn("h-8 w-8 fill-white", className);

  switch (kind) {
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden="true">
          <polygon points="50,12 92,86 8,86" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden="true">
          <polygon points="50,8 92,50 50,92 8,50" />
        </svg>
      );
    case "circle":
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden="true">
          <circle cx="50" cy="50" r="42" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden="true">
          <rect x="14" y="14" width="72" height="72" rx="8" />
        </svg>
      );
  }
}
