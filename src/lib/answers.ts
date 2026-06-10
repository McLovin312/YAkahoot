/**
 * The four Kahoot-style answer shapes.
 *
 * The array index (0-3) is the canonical answer index used everywhere:
 *   0 = Red Triangle    (top-left)
 *   1 = Blue Diamond    (top-right)
 *   2 = Gold Circle     (bottom-left)
 *   3 = Green Square    (bottom-right)
 *
 * Rendered in a 2-column grid, this order naturally produces the required
 * top-left / top-right / bottom-left / bottom-right layout.
 */
export type ShapeKind = "triangle" | "diamond" | "circle" | "square";

export interface AnswerShape {
  index: 0 | 1 | 2 | 3;
  kind: ShapeKind;
  label: string;
  /** Gradient background classes for the tile. */
  bg: string;
  /** Colored glow shadow class matching the tile color. */
  glow: string;
  /** Ring color for the selected/correct states. */
  ring: string;
}

export const ANSWER_SHAPES: AnswerShape[] = [
  {
    index: 0,
    kind: "triangle",
    label: "Red triangle",
    bg: "bg-gradient-to-br from-[#FF5876] to-[#C40E45]",
    glow: "shadow-[0_14px_36px_-12px_rgba(232,56,93,0.65)]",
    ring: "ring-rose-200",
  },
  {
    index: 1,
    kind: "diamond",
    label: "Blue diamond",
    bg: "bg-gradient-to-br from-[#54A2FF] to-[#1859C9]",
    glow: "shadow-[0_14px_36px_-12px_rgba(45,127,249,0.65)]",
    ring: "ring-sky-200",
  },
  {
    index: 2,
    kind: "circle",
    label: "Gold circle",
    bg: "bg-gradient-to-br from-[#FFC53D] to-[#D08200]",
    glow: "shadow-[0_14px_36px_-12px_rgba(240,169,10,0.6)]",
    ring: "ring-amber-200",
  },
  {
    index: 3,
    kind: "square",
    label: "Green square",
    bg: "bg-gradient-to-br from-[#3BD978] to-[#0E8A3E]",
    glow: "shadow-[0_14px_36px_-12px_rgba(31,171,84,0.65)]",
    ring: "ring-emerald-200",
  },
];
