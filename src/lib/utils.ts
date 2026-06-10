import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Question } from "@/types";

/**
 * Tailwind-aware className combiner.
 * Merges conditional classes and de-duplicates conflicting Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate a 6-digit numeric game PIN as a string (e.g. "493028").
 * Leading-zero safe (always 6 characters).
 */
export function generateGamePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Fisher-Yates shuffle returning a new array (does not mutate the input).
 * Used for the optional "randomize questions" feature.
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Returns a copy of a question with its four answer options in random order
 * (and `correctIndex` updated to match).
 *
 * Question banks are authored with the correct answer first; shuffling at
 * game-creation time means players can never learn "the first color is always
 * right", and each game places answers differently.
 */
export function shuffleQuestionOptions(question: Question): Question {
  const order = shuffle([0, 1, 2, 3] as const);
  const options = order.map((i) => question.options[i]) as Question["options"];
  const correctIndex = order.indexOf(question.correctIndex) as 0 | 1 | 2 | 3;
  return { ...question, options, correctIndex };
}

/** Basic username validation/normalisation. Returns a trimmed username. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 20);
}

/** Whether a username is structurally valid (length & characters). */
export function isValidUsername(username: string): boolean {
  return /^[\w \-.]{2,20}$/.test(username);
}
