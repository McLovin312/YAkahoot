"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Eye,
  LogIn,
  Pause,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { connectToGame, publishEvent } from "@/lib/realtime/client";
import {
  EVENTS,
  type GameStatePayload,
  type JoinResultPayload,
  type LeaderboardEntry,
  type PlayersUpdatePayload,
  type QuestionResultsPayload,
  type QuestionStartPayload,
} from "@/types";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { useCountdown } from "@/lib/useCountdown";
import { useSound } from "@/lib/useSound";
import { ANSWER_SHAPES } from "@/lib/answers";
import dynamic from "next/dynamic";
import { AnswerTile } from "@/components/AnswerTile";
import { Timer } from "@/components/Timer";
import { Leaderboard } from "@/components/Leaderboard";

// Confetti is only needed on the end screen — keep it out of the main bundle.
const Confetti = dynamic(
  () => import("@/components/Confetti").then((m) => m.Confetti),
  { ssr: false }
);

/** The player's local UI phase. */
type Phase =
  | "join"
  | "joining"
  | "waiting"
  | "question"
  | "results"
  | "paused"
  | "ended";

export default function PlayerPage() {
  const { pin, username, clientId, joined, setIdentity, setJoined, leave } =
    usePlayerStore();
  const [soundOn] = useState(true);
  const play = useSound(soundOn);

  // ---- Form state ----
  const [formName, setFormName] = useState("");
  const [formPin, setFormPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ---- Gameplay state (transient, not persisted) ----
  const [phase, setPhase] = useState<Phase>("join");
  const [question, setQuestion] = useState<QuestionStartPayload | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  // Tap-to-reveal: show the question text on the phone (big screen too far).
  const [showQuestion, setShowQuestion] = useState(false);
  const [results, setResults] = useState<QuestionResultsPayload | null>(null);
  const [finalBoard, setFinalBoard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  // Keep the phase we were in before a pause so we can restore it.
  const prePausePhase = useRef<Phase>("waiting");
  // Last seen question index: a re-broadcast of the SAME question (pause ->
  // resume) must not wipe an answer that's already locked in.
  const lastQuestionIndex = useRef<number | null>(null);

  // Render only after mount (persisted identity hydrates client-side).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prefill the PIN from a scanned QR link (/player?pin=123456), and
  // auto-rejoin after a refresh if we were already in a game.
  useEffect(() => {
    if (!mounted) return;
    const urlPin = new URLSearchParams(window.location.search).get("pin");
    if (urlPin && /^\d{6}$/.test(urlPin)) {
      setFormPin(urlPin);
      // PIN came from the QR — jump straight to the name field.
      setTimeout(() => document.getElementById("name")?.focus(), 50);
    }

    const state = usePlayerStore.getState();
    if (state.joined && state.pin && state.username) {
      setPhase("joining");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // -------------------------------------------------------------------------
  // Subscribe to the game channel and react to host -> everyone events.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!mounted || !joined || !pin) return;

    const connection = connectToGame(pin, {
      // Only ask to join AFTER the subscription is live, otherwise we could
      // miss the host's JOIN_RESULT reply (events are not replayed).
      onConnect: () => {
        void publishEvent(pin, EVENTS.PLAYER_JOIN, { username, clientId });
      },
      onEvent: (event, data) => {
        switch (event) {
          case EVENTS.JOIN_RESULT: {
            const payload = data as JoinResultPayload;
            if (payload.username !== username) return; // not for us
            if (payload.accepted) {
              setJoined(true);
              setPhase((p) => (p === "joining" || p === "join" ? "waiting" : p));
              setError(null);
            } else {
              setJoined(false);
              setPhase("join");
              setError(payload.reason ?? "Unable to join.");
            }
            break;
          }
          case EVENTS.PLAYERS_UPDATE: {
            setPlayerCount((data as PlayersUpdatePayload).count);
            break;
          }
          case EVENTS.QUESTION_START: {
            const payload = data as QuestionStartPayload;
            const isReplay = lastQuestionIndex.current === payload.index;
            lastQuestionIndex.current = payload.index;
            setQuestion(payload);
            if (!isReplay) {
              setSelected(null);
              setResults(null);
              setShowQuestion(false);
            }
            setPhase("question");
            break;
          }
          case EVENTS.QUESTION_RESULTS: {
            setResults(data as QuestionResultsPayload);
            setPhase("results");
            break;
          }
          case EVENTS.GAME_STATE: {
            const payload = data as GameStatePayload;
            if (payload.state === "paused") {
              setPhase((p) => {
                prePausePhase.current = p;
                return "paused";
              });
            } else if (payload.state === "question") {
              setPhase((p) => (p === "paused" ? prePausePhase.current : p));
            } else if (payload.state === "lobby") {
              // Game was restarted by the host.
              lastQuestionIndex.current = null;
              setPhase("waiting");
              setQuestion(null);
              setResults(null);
              setSelected(null);
            }
            break;
          }
          case EVENTS.GAME_END: {
            lastQuestionIndex.current = null;
            setFinalBoard((data as { leaderboard: LeaderboardEntry[] }).leaderboard);
            setPhase("ended");
            break;
          }
        }
      },
    });

    return () => connection.close();
  }, [mounted, joined, pin, username, clientId, setJoined]);

  // Celebrate (sound) when results / end arrive.
  useEffect(() => {
    if (phase === "results" && results && selected !== null) {
      play(selected === results.correctIndex ? "correct" : "wrong");
    }
    if (phase === "ended") play("win");
  }, [phase, results, selected, play]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const submitJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = normalizeUsername(formName);
      const cleanPin = formPin.trim();

      if (!/^\d{6}$/.test(cleanPin)) {
        setError("Enter the 6-digit game PIN.");
        return;
      }
      if (!isValidUsername(name)) {
        setError("Username must be 2-20 letters, numbers, spaces or - . _");
        return;
      }

      setError(null);
      setIdentity(cleanPin, name);
      setJoined(true); // optimistic; host confirms via JOIN_RESULT
      setPhase("joining");
    },
    [formName, formPin, setIdentity, setJoined]
  );

  // Safety net: if the host never replies within 8s, surface a clear error.
  // The Wi-Fi hint only applies to local-network play, not the public site.
  useEffect(() => {
    if (phase !== "joining" || !pin || !username) return;
    const id = setTimeout(() => {
      setPhase((p) => {
        if (p === "joining") {
          const isLocal = /^(localhost|127\.|10\.|192\.168\.|172\.)/.test(
            window.location.hostname
          );
          setError(
            isLocal
              ? "No response from the host. Check the PIN and make sure you're on the same Wi-Fi as the host screen."
              : "No response from the host. Double-check the PIN and ask the host if the game is still open."
          );
          setJoined(false);
          return "join";
        }
        return p;
      });
    }, 8000);
    return () => clearTimeout(id);
  }, [phase, pin, username, setJoined]);

  function answer(index: number) {
    if (selected !== null || !question) return; // one answer per question
    setSelected(index);
    play("click");
    void publishEvent(pin, EVENTS.PLAYER_ANSWER, {
      username,
      clientId,
      answerIndex: index,
    });
  }

  function quit() {
    if (pin && username) {
      void publishEvent(pin, EVENTS.PLAYER_LEAVE, { username, clientId });
    }
    leave();
    lastQuestionIndex.current = null;
    setPhase("join");
    setQuestion(null);
    setResults(null);
    setSelected(null);
  }

  // Own standing helpers
  const myEntry =
    results?.leaderboard.find((e) => e.username === username) ??
    finalBoard.find((e) => e.username === username);

  // One shared font size for all four tiles, fitted to the longest option, so
  // the grid doesn't look lopsided when answer lengths vary wildly.
  const optionTextClass = useMemo(() => {
    const longest = Math.max(
      0,
      ...(question?.options ?? []).map((o) => o.length)
    );
    if (longest <= 12) return "text-2xl";
    if (longest <= 22) return "text-xl";
    if (longest <= 34) return "text-lg";
    return "text-base";
  }, [question?.options]);

  if (!mounted) return null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="relative flex min-h-dvh flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between">
        <Link href="/" className="btn-ghost !px-3 !py-2 !text-base" onClick={quit}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Leave
        </Link>
        {phase !== "join" && phase !== "joining" && (
          <span className="chip">{username}</span>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        {/* Entrance-only transition keyed by phase. No exit animations: if an
            exiting view ever stalls, the player stares at a blank phone. */}
        <motion.div
          key={phase === "joining" ? "join" : phase}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* ---------------- JOIN FORM ---------------- */}
          {(phase === "join" || phase === "joining") && (
            <div className="card">
              <p className="eyebrow mb-2 text-center">Lakeside Trivia Night</p>
              <h1 className="mb-7 text-center text-4xl font-bold text-white">
                Join the game
              </h1>

              <form onSubmit={submitJoin} className="space-y-5">
                <div>
                  <label
                    htmlFor="pin"
                    className="mb-1.5 block font-display text-sm font-bold uppercase tracking-wide text-slate-300"
                  >
                    Game PIN
                  </label>
                  <input
                    id="pin"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={formPin}
                    onChange={(e) =>
                      setFormPin(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="input text-center !text-3xl font-bold tracking-[0.3em]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block font-display text-sm font-bold uppercase tracking-wide text-slate-300"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    autoComplete="off"
                    maxLength={20}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Your name"
                    className="input"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 font-display text-sm font-semibold text-rose-200"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={phase === "joining"}
                  className="btn-primary w-full"
                >
                  {phase === "joining" ? (
                    "Joining…"
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" strokeWidth={2.5} />
                      Join game
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ---------------- WAITING ROOM ---------------- */}
          {phase === "waiting" && (
            <div className="card text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_0_44px_-10px_rgba(52,211,153,0.6)]">
                <Check className="h-9 w-9" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-bold text-white">You&apos;re in!</h2>
              <p className="mt-2 inline-block rounded-lg border border-white/15 bg-white/10 px-4 py-1 font-display text-lg font-bold text-white">
                {username}
              </p>
              <p className="mt-4 font-display text-sm font-bold text-slate-400">
                {playerCount} {playerCount === 1 ? "player" : "players"} in the
                lobby — watch the big screen
              </p>
              <div className="mt-6 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 animate-bounce rounded-full bg-brand-400"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---------------- QUESTION (answer buttons only) ---------------- */}
          {phase === "question" && question && (
            <div className="flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <span className="chip">
                  Question {question.index + 1} / {question.total}
                </span>
                <Timer
                  endsAt={question.endsAt}
                  durationMs={question.durationMs}
                  className="h-12 w-12"
                />
              </div>

              {/* Tap-to-reveal: re-read the question without the big screen.
                  Only the question text is ever sent — answers stay host-only. */}
              {question.question && (
                <button
                  type="button"
                  onClick={() => setShowQuestion((v) => !v)}
                  aria-expanded={showQuestion}
                  className="mb-3 w-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/10 active:bg-white/10"
                >
                  {showQuestion ? (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="block font-display text-base font-bold leading-snug text-white"
                    >
                      {question.question}
                    </motion.span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 font-display text-sm font-bold text-slate-300">
                      <Eye className="h-4 w-4" strokeWidth={2.5} />
                      Tap to read the question
                      <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              )}

              {/* Full answers on the buttons; which one is CORRECT stays on
                  the host until results. The grid gives back a little height
                  while the question text is open above. */}
              <div
                className={`grid grid-cols-2 grid-rows-2 gap-3 ${
                  showQuestion ? "h-[52dvh]" : "h-[60dvh]"
                }`}
              >
                {ANSWER_SHAPES.map((shape) => (
                  <AnswerTile
                    key={`${question.index}-${shape.index}`}
                    shape={shape}
                    big
                    text={question.options?.[shape.index]}
                    textClass={optionTextClass}
                    appearDelay={0.04 * shape.index}
                    onClick={() => answer(shape.index)}
                    disabled={selected !== null}
                    selected={selected === shape.index}
                    dimmed={selected !== null && selected !== shape.index}
                  />
                ))}
              </div>

              <AnimatePresence>
                {selected !== null && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center font-display text-lg font-bold text-brand-300"
                  >
                    <Check className="mr-1 inline h-5 w-5" />
                    Locked in — waiting for the others…
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ---------------- RESULTS ---------------- */}
          {phase === "results" && results && (
            <div className="card text-center">
              {selected === null ? (
                <ResultBanner tone="muted" title="No answer" icon={Clock} />
              ) : selected === results.correctIndex ? (
                <ResultBanner tone="good" title="Correct!" icon={Check} />
              ) : (
                <ResultBanner tone="bad" title="Not quite" icon={X} />
              )}

              {(results.earned?.[username] ?? 0) > 0 && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 20,
                    delay: 0.15,
                  }}
                  className="mx-auto mt-4 inline-block rounded-full border border-gold-400/40 bg-gold-400/15 px-5 py-1.5 font-display text-xl font-extrabold text-gold-300"
                >
                  +{(results.earned?.[username] ?? 0).toLocaleString()} pts
                </motion.p>
              )}

              {/* The right answer, spelled out with its shape + color */}
              {(results.correctText ??
                question?.options?.[results.correctIndex]) && (
                <div className="mt-5 text-left">
                  <p className="mb-2 text-center font-display text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                    Correct answer
                  </p>
                  <AnswerTile
                    shape={ANSWER_SHAPES[results.correctIndex]}
                    text={
                      results.correctText ??
                      question?.options?.[results.correctIndex]
                    }
                    revealCorrect
                  />
                </div>
              )}

              {myEntry && (
                <p className="mt-4 font-display text-lg font-bold text-slate-200">
                  You&apos;re{" "}
                  <span className="text-gold-400">#{myEntry.rank}</span> with{" "}
                  <span className="text-gold-400">
                    {myEntry.score.toLocaleString()}
                  </span>{" "}
                  pts
                </p>
              )}

              <div className="mt-6 text-left">
                <Leaderboard
                  entries={results.leaderboard.slice(0, 5)}
                  highlightUsername={username}
                />
              </div>

              {/* Host auto-advances — mirror its countdown down here */}
              {results.nextAt && (
                <NextUpBar
                  nextAt={results.nextAt}
                  final={
                    question ? question.index + 1 >= question.total : false
                  }
                />
              )}
            </div>
          )}

          {/* ---------------- PAUSED ---------------- */}
          {phase === "paused" && (
            <div className="card text-center">
              <Pause
                className="mx-auto h-12 w-12 text-brand-300"
                strokeWidth={2.5}
              />
              <h2 className="mt-2 text-2xl font-bold text-white">
                Game paused
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                The host will resume in a moment.
              </p>
            </div>
          )}

          {/* ---------------- ENDED ---------------- */}
          {phase === "ended" && (
            <div className="card text-center">
              <Confetti active={Boolean(myEntry && myEntry.rank <= 3)} />
              <Trophy
                className="mx-auto mb-2 h-12 w-12 text-gold-400"
                strokeWidth={2.25}
              />
              <h1 className="text-3xl font-bold text-white">Game over!</h1>

              {myEntry && (
                <div className="card my-5 inline-flex flex-col border-gold-400/40 bg-gradient-to-b from-gold-400/20 to-gold-600/5 px-8 py-4">
                  <span className="font-display text-xl font-bold text-gold-300">
                    {myEntry.rank === 1
                      ? "Champion!"
                      : `You finished #${myEntry.rank}`}
                  </span>
                  <span className="font-display text-3xl font-extrabold text-white">
                    {myEntry.score.toLocaleString()} pts
                  </span>
                </div>
              )}

              <div className="mt-2 text-left">
                <Leaderboard entries={finalBoard} highlightUsername={username} />
              </div>

              <button onClick={quit} className="btn-ghost mt-6">
                Leave game
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

/** Small colored banner used on the player results screen. */
function ResultBanner({
  tone,
  title,
  icon: Icon,
}: {
  tone: "good" | "bad" | "muted";
  title: string;
  icon: LucideIcon;
}) {
  const styles =
    tone === "good"
      ? "from-[#3BD978] to-[#0E8A3E] shadow-[0_14px_36px_-12px_rgba(31,171,84,0.65)]"
      : tone === "bad"
        ? "from-[#FF5876] to-[#C40E45] shadow-[0_14px_36px_-12px_rgba(232,56,93,0.65)]"
        : "from-slate-500 to-slate-700";
  return (
    <div
      className={`mx-auto flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b ${styles} px-6 py-5 font-display text-2xl font-bold text-white ring-1 ring-inset ring-white/25`}
    >
      <Icon className="h-8 w-8" strokeWidth={3} />
      {title}
    </div>
  );
}

/** Thin draining bar mirroring the host's auto-advance countdown. */
function NextUpBar({ nextAt, final }: { nextAt: number; final: boolean }) {
  const msLeft = useCountdown(nextAt);
  // Denominator = however much runway existed when this bar mounted, so the
  // bar always starts full even if the event arrived a beat late.
  const totalRef = useRef(Math.max(1000, nextAt - Date.now()));
  const frac = Math.min(1, msLeft / totalRef.current);

  return (
    <div className="mt-6">
      <div className="mb-1.5 flex items-center justify-between font-display text-xs font-bold uppercase tracking-wide text-slate-400">
        <span>{final ? "Final results" : "Next question"}</span>
        <span className="tabular-nums">{Math.ceil(msLeft / 1000)}s</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-grape-500 transition-[width] duration-200 ease-linear"
          style={{ width: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}
