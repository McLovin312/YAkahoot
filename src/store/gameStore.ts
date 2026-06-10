"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GameState,
  Player,
  Question,
  TopicId,
  LeaderboardEntry,
} from "@/types";
import { EVENTS } from "@/types";
import { getQuestions } from "@/data/topics";
import { buildLeaderboard, calculateScore } from "@/lib/score";
import {
  generateGamePin,
  shuffle,
  shuffleQuestionOptions,
} from "@/lib/utils";
import { publishEvent } from "@/lib/realtime/client";

/** How long each question stays open, in milliseconds. */
export const QUESTION_DURATION_MS = 20_000;

/**
 * The authoritative HOST game store.
 *
 * The host browser is the single source of truth: it owns the questions
 * (including correct answers), the players and the scores. Players never
 * receive answer data — they only get colored buttons. The store both mutates
 * local state and broadcasts the player-safe payloads over Pusher.
 *
 * State is persisted to localStorage so the host can recover after a refresh
 * (session recovery requirement).
 */
interface GameStore {
  // --- identity / config ---
  pin: string;
  topic: TopicId | null;
  randomize: boolean;
  soundEnabled: boolean;

  // --- gameplay state ---
  questions: Question[];
  currentIndex: number;
  gameState: GameState;
  players: Record<string, Player>;

  // --- timing ---
  questionStartedAt: number | null;
  endsAt: number | null;
  /** Remaining ms captured when a live question is paused (null otherwise). */
  pausedRemainingMs: number | null;

  // --- results of the most recent question (for the host results UI) ---
  lastResults: {
    correctIndex: 0 | 1 | 2 | 3;
    correctCount: number;
    totalAnswered: number;
  } | null;

  // --- actions ---
  createGame: (topic: TopicId, options?: { randomize?: boolean }) => void;
  addPlayer: (username: string, clientId: string) => boolean;
  removePlayer: (username: string) => void;
  recordAnswer: (username: string, answerIndex: 0 | 1 | 2 | 3) => void;
  startQuestion: () => void;
  endQuestion: () => void;
  nextQuestion: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  restartGame: () => void;
  resetGame: () => void;
  toggleSound: () => void;

  // --- selectors / helpers ---
  playerList: () => Player[];
  leaderboard: () => LeaderboardEntry[];
  currentQuestion: () => Question | null;
}

/** Broadcast the current player roster (public, score-only) to everyone. */
function broadcastPlayers(pin: string, players: Record<string, Player>) {
  const list = Object.values(players).map((p) => ({
    username: p.username,
    score: p.score,
  }));
  void publishEvent(pin, EVENTS.PLAYERS_UPDATE, {
    players: list,
    count: list.length,
  });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      pin: "",
      topic: null,
      randomize: false,
      soundEnabled: true,
      questions: [],
      currentIndex: -1,
      gameState: "lobby",
      players: {},
      questionStartedAt: null,
      endsAt: null,
      pausedRemainingMs: null,
      lastResults: null,

      // ---------------------------------------------------------------
      createGame: (topic, options) => {
        const randomize = options?.randomize ?? false;
        const base = getQuestions(topic);
        // Answer positions are always shuffled (anti-cheat); question ORDER is
        // only shuffled when the host turns the option on.
        const questions = (randomize ? shuffle(base) : base).map(
          shuffleQuestionOptions
        );
        set({
          pin: generateGamePin(),
          topic,
          randomize,
          questions,
          currentIndex: -1,
          gameState: "lobby",
          players: {},
          questionStartedAt: null,
          endsAt: null,
          lastResults: null,
        });
      },

      // ---------------------------------------------------------------
      // Anti-cheat: usernames are unique. Returns false if the name is taken by
      // a DIFFERENT device. If the same device (clientId) re-joins, it is
      // treated as a reconnect (score preserved) and returns true.
      addPlayer: (username, clientId) => {
        const { players, pin } = get();
        const existing = players[username];
        if (existing) {
          // Same device reconnecting -> allow, keep their score.
          return existing.clientId === clientId;
        }

        const newPlayer: Player = {
          username,
          clientId,
          score: 0,
          hasAnswered: false,
          lastAnswerIndex: null,
          lastAnswerCorrect: false,
          lastPointsEarned: 0,
        };
        const next = { ...players, [username]: newPlayer };
        set({ players: next });
        broadcastPlayers(pin, next);
        return true;
      },

      // ---------------------------------------------------------------
      removePlayer: (username) => {
        const { players, pin } = get();
        if (!players[username]) return;
        const next = { ...players };
        delete next[username];
        set({ players: next });
        broadcastPlayers(pin, next);
      },

      // ---------------------------------------------------------------
      // Anti-cheat: one answer per question, only while a question is live.
      recordAnswer: (username, answerIndex) => {
        const state = get();
        if (state.gameState !== "question") return;
        const player = state.players[username];
        if (!player || player.hasAnswered) return;

        const question = state.questions[state.currentIndex];
        if (!question) return;

        const now = Date.now();
        const timeUsed = state.questionStartedAt
          ? now - state.questionStartedAt
          : QUESTION_DURATION_MS;
        const isCorrect = answerIndex === question.correctIndex;
        const points = calculateScore(isCorrect, timeUsed, QUESTION_DURATION_MS);

        const updated: Player = {
          ...player,
          score: player.score + points,
          hasAnswered: true,
          lastAnswerIndex: answerIndex,
          lastAnswerCorrect: isCorrect,
          lastPointsEarned: points,
        };
        set({ players: { ...state.players, [username]: updated } });
      },

      // ---------------------------------------------------------------
      startQuestion: () => {
        const state = get();
        const nextIndex = state.currentIndex + 1;
        if (nextIndex >= state.questions.length) {
          get().endGame();
          return;
        }

        // Reset per-question answer tracking for every player.
        const players: Record<string, Player> = {};
        for (const [name, p] of Object.entries(state.players)) {
          players[name] = {
            ...p,
            hasAnswered: false,
            lastAnswerIndex: null,
            lastAnswerCorrect: false,
            lastPointsEarned: 0,
          };
        }

        const now = Date.now();
        const endsAt = now + QUESTION_DURATION_MS;
        set({
          currentIndex: nextIndex,
          gameState: "question",
          players,
          questionStartedAt: now,
          endsAt,
          lastResults: null,
        });

        // Player-safe payload: NO question text, NO correct answer.
        void publishEvent(state.pin, EVENTS.QUESTION_START, {
          index: nextIndex,
          total: state.questions.length,
          endsAt,
          durationMs: QUESTION_DURATION_MS,
        });
      },

      // ---------------------------------------------------------------
      endQuestion: () => {
        const state = get();
        if (state.gameState !== "question") return;
        const question = state.questions[state.currentIndex];
        if (!question) return;

        const all = Object.values(state.players);
        const answered = all.filter((p) => p.hasAnswered);
        const correctCount = answered.filter((p) => p.lastAnswerCorrect).length;
        const leaderboard = buildLeaderboard(all);

        set({
          gameState: "results",
          endsAt: null,
          lastResults: {
            correctIndex: question.correctIndex,
            correctCount,
            totalAnswered: answered.length,
          },
        });

        void publishEvent(state.pin, EVENTS.QUESTION_RESULTS, {
          correctIndex: question.correctIndex,
          correctCount,
          totalAnswered: answered.length,
          leaderboard,
        });
      },

      // ---------------------------------------------------------------
      nextQuestion: () => {
        const state = get();
        if (state.currentIndex + 1 >= state.questions.length) {
          get().endGame();
        } else {
          get().startQuestion();
        }
      },

      // ---------------------------------------------------------------
      // Pausing a live question freezes the clock by storing the remaining ms.
      pauseGame: () => {
        const state = get();
        if (state.gameState !== "question") return;
        const remaining = state.endsAt
          ? Math.max(0, state.endsAt - Date.now())
          : QUESTION_DURATION_MS;
        set({
          gameState: "paused",
          pausedRemainingMs: remaining,
          endsAt: null,
        });
        void publishEvent(state.pin, EVENTS.GAME_STATE, { state: "paused" });
      },

      resumeGame: () => {
        const state = get();
        if (state.gameState !== "paused") return;
        const remaining = state.pausedRemainingMs ?? QUESTION_DURATION_MS;
        const endsAt = Date.now() + remaining;
        set({
          gameState: "question",
          endsAt,
          pausedRemainingMs: null,
          // Shift the start reference so scoring stays fair after the pause.
          questionStartedAt: endsAt - QUESTION_DURATION_MS,
        });
        // Resync player timers by re-broadcasting the question start.
        void publishEvent(state.pin, EVENTS.QUESTION_START, {
          index: state.currentIndex,
          total: state.questions.length,
          endsAt,
          durationMs: QUESTION_DURATION_MS,
        });
        void publishEvent(state.pin, EVENTS.GAME_STATE, { state: "question" });
      },

      // ---------------------------------------------------------------
      endGame: () => {
        const state = get();
        const leaderboard = buildLeaderboard(Object.values(state.players));
        set({ gameState: "ended", endsAt: null });
        void publishEvent(state.pin, EVENTS.GAME_END, { leaderboard });
      },

      // ---------------------------------------------------------------
      // Replays the same topic/questions with scores reset, players kept.
      restartGame: () => {
        const state = get();
        const players: Record<string, Player> = {};
        for (const [name, p] of Object.entries(state.players)) {
          players[name] = {
            ...p,
            score: 0,
            hasAnswered: false,
            lastAnswerIndex: null,
            lastAnswerCorrect: false,
            lastPointsEarned: 0,
          };
        }
        const questions = (
          state.randomize ? shuffle(state.questions) : state.questions
        ).map(shuffleQuestionOptions);
        set({
          players,
          questions,
          currentIndex: -1,
          gameState: "lobby",
          questionStartedAt: null,
          endsAt: null,
          lastResults: null,
        });
        broadcastPlayers(state.pin, players);
        void publishEvent(state.pin, EVENTS.GAME_STATE, { state: "lobby" });
      },

      // ---------------------------------------------------------------
      // Full wipe (used when leaving the host flow entirely).
      resetGame: () => {
        set({
          pin: "",
          topic: null,
          randomize: false,
          questions: [],
          currentIndex: -1,
          gameState: "lobby",
          players: {},
          questionStartedAt: null,
          endsAt: null,
          lastResults: null,
        });
      },

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      // --- selectors -------------------------------------------------
      playerList: () => Object.values(get().players),
      leaderboard: () => buildLeaderboard(Object.values(get().players)),
      currentQuestion: () => {
        const { questions, currentIndex } = get();
        return questions[currentIndex] ?? null;
      },
    }),
    {
      name: "lakeside-host-game", // localStorage key (session recovery)
      // Only persist what we need to recover a session; selectors/actions are
      // re-created on load by Zustand automatically.
      partialize: (state) => ({
        pin: state.pin,
        topic: state.topic,
        randomize: state.randomize,
        soundEnabled: state.soundEnabled,
        questions: state.questions,
        currentIndex: state.currentIndex,
        gameState: state.gameState,
        players: state.players,
        lastResults: state.lastResults,
      }),
    }
  )
);
