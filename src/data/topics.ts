import type { Question, Topic, TopicId } from "@/types";
import { brainrotQuestions } from "./questions/brainrot";
import { bibleQuestions } from "./questions/bible";
import { randomFactsQuestions } from "./questions/randomFacts";
import { championshipQuestions } from "./questions/championship";

/**
 * Topic metadata used to render the selectable round cards on the host
 * screen. The first three are regular rounds; Championship is the finals
 * round played by the winners of the other three.
 */
export const TOPICS: Topic[] = [
  {
    id: "brainrot",
    name: "Brainrot",
    description: "Gen Z slang, TikTok trends & viral internet culture.",
  },
  {
    id: "bible",
    name: "Bible",
    description: "Old & New Testament, characters and classic stories.",
  },
  {
    id: "random-facts",
    name: "Random",
    description: "Science, geography, movies, sports & strange facts.",
  },
  {
    id: "championship",
    name: "Championship",
    description:
      "Winners of the three rounds face off to crown the one true champion.",
    badge: "Finals",
  },
];

/** Lookup map from topic id -> its full question bank. */
const QUESTION_BANKS: Record<TopicId, Question[]> = {
  brainrot: brainrotQuestions,
  bible: bibleQuestions,
  "random-facts": randomFactsQuestions,
  championship: championshipQuestions,
};

/** Returns the topic metadata for a given id (or undefined if unknown). */
export function getTopic(id: TopicId): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Returns a (defensive copy of the) question bank for a topic. */
export function getQuestions(topic: TopicId): Question[] {
  return [...(QUESTION_BANKS[topic] ?? [])];
}
