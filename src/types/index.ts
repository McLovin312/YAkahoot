/**
 * Shared TypeScript interfaces & types for Lakeside YA Trivia.
 *
 * These types are the single source of truth shared between the host screen,
 * the player screen, and the realtime (Pusher) event payloads.
 */

// ---------------------------------------------------------------------------
// Topics & Questions
// ---------------------------------------------------------------------------

/**
 * The available trivia rounds. The first three are regular categories;
 * `championship` is the finals round played by the winners of the other three.
 */
export type TopicId = "brainrot" | "bible" | "random-facts" | "championship";

/** Metadata describing a selectable topic card on the host screen. */
export interface Topic {
  id: TopicId;
  name: string;
  description: string;
  /** Optional small badge rendered on the topic card (e.g. "Finals"). */
  badge?: string;
}

/**
 * A single trivia question.
 * `correctIndex` maps to the position in `options` (0-3) and lines up with the
 * four colored answer shapes (0=red triangle, 1=blue diamond, 2=yellow circle,
 * 3=green square).
 */
export interface Question {
  id: string;
  topic: TopicId;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Players & Scoring
// ---------------------------------------------------------------------------

/** A connected participant. */
export interface Player {
  /** Unique username (also used as the player's id). */
  username: string;
  /** Stable per-device id used to distinguish reconnects from name clashes. */
  clientId: string;
  score: number;
  /** Whether the player answered the *current* question (anti-cheat guard). */
  hasAnswered: boolean;
  /** Index (0-3) the player chose for the current question, or null. */
  lastAnswerIndex: number | null;
  /** Whether the player's most recent answer was correct (for results UI). */
  lastAnswerCorrect: boolean;
  /** Points earned on the most recent question (for the "+pts" animation). */
  lastPointsEarned: number;
}

/** A single row in the leaderboard. */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Game state machine
// ---------------------------------------------------------------------------

/**
 * The overall game phase.
 * - `lobby`     : host created a game, players are joining
 * - `question`  : a question is live and the timer is running
 * - `results`   : showing the correct answer + leaderboard between questions
 * - `paused`    : host paused the game
 * - `ended`     : final podium / champion screen
 */
export type GameState = "lobby" | "question" | "results" | "paused" | "ended";

// ---------------------------------------------------------------------------
// Realtime (Pusher) event names & payloads
// ---------------------------------------------------------------------------

/** All Pusher event names, centralised to avoid typos across files. */
export const EVENTS = {
  // Host -> everyone
  PLAYERS_UPDATE: "players-update",
  QUESTION_START: "question-start",
  QUESTION_RESULTS: "question-results",
  GAME_STATE: "game-state",
  GAME_END: "game-end",
  JOIN_RESULT: "join-result",
  // Player -> host
  PLAYER_JOIN: "player-join",
  PLAYER_ANSWER: "player-answer",
  PLAYER_LEAVE: "player-leave",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Host -> all: the current public list of players (no answer data leaked). */
export interface PlayersUpdatePayload {
  players: Array<{ username: string; score: number }>;
  count: number;
}

/**
 * Host -> all: a new question has started.
 * NOTE: intentionally contains NO question text and NO correct answer so that
 * players (who only see colored buttons) cannot cheat by inspecting events.
 */
export interface QuestionStartPayload {
  index: number; // zero-based question index
  total: number;
  /** Epoch ms when the question's timer expires. */
  endsAt: number;
  /** Duration of the question in ms (e.g. 20000). */
  durationMs: number;
}

/** Host -> all: results for the question that just ended. */
export interface QuestionResultsPayload {
  correctIndex: 0 | 1 | 2 | 3;
  correctCount: number;
  totalAnswered: number;
  leaderboard: LeaderboardEntry[];
}

/** Host -> all: a coarse game-state change (used to drive player UI overlays). */
export interface GameStatePayload {
  state: GameState;
}

/** Host -> all: the game has ended; includes the final standings. */
export interface GameEndPayload {
  leaderboard: LeaderboardEntry[];
}

/** Host -> all: result of a player's join request (players filter by username). */
export interface JoinResultPayload {
  username: string;
  accepted: boolean;
  reason?: string;
}

/** Player -> host: a request to join the game. */
export interface PlayerJoinPayload {
  username: string;
  /** Stable device id; lets the host treat a refresh as a reconnect. */
  clientId: string;
}

/** Player -> host: the player's answer to the current question. */
export interface PlayerAnswerPayload {
  username: string;
  answerIndex: 0 | 1 | 2 | 3;
}

/** Player -> host: the player is leaving. */
export interface PlayerLeavePayload {
  username: string;
}
