import type { Question } from "@/types";

/**
 * Championship round (5 questions) — the finals.
 *
 * Played by the winners of the three regular rounds to crown the one true
 * Lakeside champion. All questions are Lakeside-specific.
 *
 * AUTHORING CONVENTION: the correct answer is always written FIRST
 * (correctIndex 0). Answer positions are shuffled per-game by
 * `shuffleQuestionOptions` in src/lib/utils.ts.
 */
export const championshipQuestions: Question[] = [
  {
    id: "ch-01",
    topic: "championship",
    question: "What is the Lakeside logo?",
    options: [
      "Topography of Beals Point",
      "A pebble",
      "A map of Folsom",
      "A drawing from the founding pastor's kid",
    ],
    correctIndex: 0,
  },
  {
    id: "ch-02",
    topic: "championship",
    question: "Brian Becker's favorite hobby is?",
    options: ["Running", "Biking", "Watching football", "Reading"],
    correctIndex: 0,
  },
  {
    id: "ch-03",
    topic: "championship",
    question: "Lakeside was founded in?",
    options: ["1987", "1985", "1990", "2000"],
    correctIndex: 0,
  },
  {
    id: "ch-04",
    topic: "championship",
    question: "A common phrase Pastor Brian says:",
    options: [
      '"Track with me"',
      '"Am I right"',
      '"I\'m preaching today"',
      '"Listen closely"',
    ],
    correctIndex: 0,
  },
  {
    id: "ch-05",
    topic: "championship",
    question: "What date is YA Lake Day on?",
    options: ["July 25th", "July 20th", "July 27th", "July 14th"],
    correctIndex: 0,
  },
];
