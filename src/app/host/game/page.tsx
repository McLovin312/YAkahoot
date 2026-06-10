"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  ArrowRight,
  Crown,
  Maximize,
  Pause,
  Play,
  Power,
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { QUESTION_DURATION_MS, useGameStore } from "@/store/gameStore";
import { connectToGame, publishEvent } from "@/lib/realtime/client";
import {
  EVENTS,
  type PlayerAnswerPayload,
  type PlayerJoinPayload,
  type PlayerLeavePayload,
} from "@/types";
import { getTopic } from "@/data/topics";
import { buildLeaderboard } from "@/lib/score";
import { isValidUsername } from "@/lib/utils";
import { useSound } from "@/lib/useSound";
import { ANSWER_SHAPES } from "@/lib/answers";
import dynamic from "next/dynamic";
import { AnswerTile } from "@/components/AnswerTile";
import { Timer } from "@/components/Timer";
import { Leaderboard } from "@/components/Leaderboard";

// Confetti is only needed on the podium — keep it out of the main bundle.
const Confetti = dynamic(
  () => import("@/components/Confetti").then((m) => m.Confetti),
  { ssr: false }
);

/**
 * Host game screen. Renders different views based on `gameState`:
 *  - lobby    : PIN + join QR + connected players + Start button
 *  - question : the live question, answer tiles (with text), timer & controls
 *  - paused   : frozen overlay
 *  - results  : correct answer + counts + leaderboard (host advances manually)
 *  - ended    : champion podium + confetti
 *
 * The host browser is authoritative: it subscribes to the game channel and
 * reacts to player events (join / answer / leave).
 */
export default function HostGamePage() {
  const router = useRouter();

  const pin = useGameStore((s) => s.pin);
  const topic = useGameStore((s) => s.topic);
  const gameState = useGameStore((s) => s.gameState);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  const play = useSound(soundEnabled);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<string | null>(null);

  // Render only after mount: the store hydrates from localStorage on the
  // client, so the first server-rendered frame can't match it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ---- Guard: if there's no active game, send the host back to round select.
  useEffect(() => {
    if (mounted && !pin) router.replace("/host");
  }, [mounted, pin, router]);

  // -------------------------------------------------------------------------
  // Realtime: subscribe to the game channel and handle player -> host events.
  // We read/write store via getState() inside handlers to avoid stale closures.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!mounted || !pin) return;

    const connection = connectToGame(pin, {
      onConnect: (info) => {
        setConnected(true);
        setTransport(info.transport);
      },
      onDisconnect: () => setConnected(false),
      onEvent: (event, data) => {
        const store = useGameStore.getState();
        switch (event) {
          // A player asks to join: validate uniqueness, then accept/reject.
          case EVENTS.PLAYER_JOIN: {
            const payload = data as PlayerJoinPayload;
            const username = (payload?.username ?? "").trim();
            const clientId = payload?.clientId ?? "";
            if (!isValidUsername(username) || !clientId) return;

            const accepted = store.addPlayer(username, clientId);
            if (accepted) play("join");
            void publishEvent(
              store.pin,
              EVENTS.JOIN_RESULT,
              {
                username,
                accepted,
                reason: accepted
                  ? undefined
                  : "That username is already taken.",
              },
              store.hostKey
            );
            break;
          }
          case EVENTS.PLAYER_ANSWER: {
            const payload = data as PlayerAnswerPayload;
            store.recordAnswer(
              payload.username,
              payload.clientId,
              payload.answerIndex
            );
            break;
          }
          case EVENTS.PLAYER_LEAVE: {
            const payload = data as PlayerLeavePayload;
            store.removePlayer(payload.username, payload.clientId);
            break;
          }
        }
      },
    });

    return () => {
      connection.close();
      setConnected(false);
    };
  }, [mounted, pin, play]);

  // Celebrate when the game ends.
  useEffect(() => {
    if (gameState === "ended") play("win");
  }, [gameState, play]);

  // Request fullscreen (best-effort; ignored if the browser blocks it).
  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  if (!mounted || !pin) return null;

  const topicMeta = topic ? getTopic(topic) : undefined;

  return (
    <main className="relative min-h-dvh px-4 py-6 sm:px-8">
      {/* Top bar */}
      <div className="mx-auto mb-6 flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="chip">
            {connected ? (
              <Wifi className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
            )}
            {connected
              ? transport === "memory"
                ? "Live — local Wi-Fi"
                : "Live"
              : "Connecting…"}
          </span>
          {topicMeta && (
            <span className="chip hidden sm:inline-flex">
              {topicMeta.name}
              {topicMeta.badge ? ` · ${topicMeta.badge}` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="btn-ghost !px-3 !py-2"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <VolumeX className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
          <button
            onClick={enterFullscreen}
            className="btn-ghost !px-3 !py-2"
            aria-label="Enter fullscreen"
          >
            <Maximize className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Entrance-only transition keyed by view. Avoid AnimatePresence
            mode="wait" here: if an exiting view stalls, the screen goes blank
            mid-game — unacceptable on the big screen. */}
        <motion.div
          key={gameState === "paused" ? "question" : gameState}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {gameState === "lobby" && <LobbyView />}
          {(gameState === "question" || gameState === "paused") && (
            <QuestionView />
          )}
          {gameState === "results" && <ResultsView />}
          {gameState === "ended" && <EndView />}
        </motion.div>
      </div>
    </main>
  );
}

/* ===========================================================================
   LOBBY VIEW — PIN, join QR code and the gathering players.
   =========================================================================== */
function LobbyView() {
  const pin = useGameStore((s) => s.pin);
  const players = useGameStore((s) => s.players);
  const startQuestion = useGameStore((s) => s.startQuestion);
  const resetGame = useGameStore((s) => s.resetGame);
  const router = useRouter();

  const list = Object.values(players);

  // Build the join URL players should open. When the host screen runs on
  // localhost, phones need the machine's LAN address instead — ask the server.
  const [joinBase, setJoinBase] = useState<string | null>(null);
  useEffect(() => {
    const origin = window.location.origin;
    const isLocalhost = /^(localhost|127\.|0\.0\.0\.0)/.test(
      window.location.hostname
    );
    if (!isLocalhost) {
      setJoinBase(origin);
      return;
    }
    fetch("/api/host-info")
      .then((r) => r.json())
      .then((d: { lanUrl: string | null }) => setJoinBase(d.lanUrl ?? origin))
      .catch(() => setJoinBase(origin));
  }, []);

  // Loud warning if the realtime backend is missing or unreachable — the
  // health endpoint explains exactly what to fix.
  const [healthIssue, setHealthIssue] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { misconfigured?: boolean; hint?: string }) =>
        setHealthIssue(d.misconfigured ? (d.hint ?? "Realtime backend unavailable.") : null)
      )
      .catch(() => {});
  }, []);

  const joinUrl = joinBase ? `${joinBase}/player?pin=${pin}` : null;

  function start() {
    document.documentElement.requestFullscreen?.().catch(() => {});
    startQuestion();
  }

  function quit() {
    resetGame();
    router.replace("/host");
  }

  return (
    <div className="flex flex-col items-center">
      {healthIssue && (
        <div className="card mb-6 w-full max-w-4xl border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <strong>Players can&apos;t connect:</strong> {healthIssue}
        </div>
      )}
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1fr_auto]">
        {/* PIN marquee — one glowing card per digit, game-show style */}
        <div className="card flex flex-col items-center justify-center py-10 text-center">
          <span className="eyebrow">Game PIN</span>
          <div className="mt-4 flex select-all gap-2 sm:gap-3" aria-label={`Game PIN ${pin}`}>
            {pin.split("").map((digit, i) => (
              <motion.span
                key={`${pin}-${i}`}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08 + i * 0.06, type: "spring", stiffness: 320, damping: 22 }}
                className="flex h-20 w-12 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-b from-white/[0.1] to-white/[0.03] font-display text-5xl font-extrabold tabular-nums text-white shadow-card [text-shadow:0_0_28px_rgba(129,140,248,0.7)] sm:h-32 sm:w-20 sm:text-7xl"
              >
                {digit}
              </motion.span>
            ))}
          </div>
          {joinBase && (
            <p className="mt-5 font-display text-lg font-semibold text-slate-300">
              Join at{" "}
              <span className="text-brand-300">
                {joinBase.replace(/^https?:\/\//, "")}
              </span>
            </p>
          )}
        </div>

        {/* Join QR */}
        {joinUrl && (
          <div className="card flex flex-col items-center justify-center gap-3 px-8 py-6">
            <JoinQR url={joinUrl} />
            <span className="font-display text-sm font-semibold text-slate-400">
              Scan to join instantly
            </span>
          </div>
        )}
      </div>

      <div className="mb-6 mt-8 flex items-center gap-2">
        <span className="chip">
          <Users className="h-4 w-4 text-brand-300" strokeWidth={2.5} />
          {list.length} {list.length === 1 ? "player" : "players"}
        </span>
      </div>

      {/* Connected players grid */}
      <div className="mb-8 flex min-h-[4rem] w-full max-w-3xl flex-wrap justify-center gap-3">
        <AnimatePresence>
          {list.map((p) => (
            <motion.span
              key={p.username}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-display font-bold text-white backdrop-blur"
            >
              {p.username}
            </motion.span>
          ))}
        </AnimatePresence>
        {list.length === 0 && (
          <p className="self-center text-slate-500">
            Waiting for players to join…
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={quit} className="btn-ghost">
          Cancel
        </button>
        <button
          onClick={start}
          disabled={list.length === 0}
          className="btn-primary text-lg"
        >
          <Play className="h-5 w-5" />
          Start game
        </button>
      </div>
    </div>
  );
}

/** Renders the join URL as a scannable QR code (black on white for contrast). */
function JoinQR({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: "M",
      color: { dark: "#05070F", light: "#FFFFFF" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  if (!dataUrl) {
    return <div className="h-44 w-44 animate-pulse rounded-xl bg-white/10" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, no optimization needed
    <img
      src={dataUrl}
      alt={`QR code to join the game at ${url}`}
      className="h-44 w-44 rounded-xl bg-white p-2"
    />
  );
}

/* ===========================================================================
   QUESTION VIEW (also renders the paused overlay)
   =========================================================================== */
function QuestionView() {
  const currentIndex = useGameStore((s) => s.currentIndex);
  const questions = useGameStore((s) => s.questions);
  const endsAt = useGameStore((s) => s.endsAt);
  const players = useGameStore((s) => s.players);
  const gameState = useGameStore((s) => s.gameState);

  const endQuestion = useGameStore((s) => s.endQuestion);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);

  const question = questions[currentIndex];
  const list = Object.values(players);
  const answeredCount = list.filter((p) => p.hasAnswered).length;

  // Auto-end the question early once every connected player has answered.
  useEffect(() => {
    if (
      gameState === "question" &&
      list.length > 0 &&
      answeredCount === list.length
    ) {
      const id = setTimeout(() => useGameStore.getState().endQuestion(), 600);
      return () => clearTimeout(id);
    }
  }, [answeredCount, list.length, gameState]);

  if (!question) return null;

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-grape-500 shadow-[0_0_12px_rgba(129,140,248,0.8)] transition-all duration-500"
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question meta row */}
      <div className="mb-4 flex items-center justify-between">
        <span className="chip">
          Question {currentIndex + 1} / {questions.length}
        </span>
        <span className="chip">
          <Users className="h-4 w-4 text-brand-300" strokeWidth={2.5} />
          {answeredCount} / {list.length} answered
        </span>
      </div>

      {/* Question + timer */}
      <div className="card mb-6 flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
        <h2 className="flex-1 font-display text-2xl font-bold leading-snug text-white sm:text-4xl lg:text-5xl">
          {question.question}
        </h2>
        {endsAt && (
          <Timer
            endsAt={endsAt}
            durationMs={QUESTION_DURATION_MS}
            onExpire={endQuestion}
          />
        )}
      </div>

      {/* Answer tiles (host sees the text) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ANSWER_SHAPES.map((shape) => (
          <AnswerTile
            key={shape.index}
            shape={shape}
            text={question.options[shape.index]}
          />
        ))}
      </div>

      {/* Admin controls */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {gameState === "question" ? (
          <button onClick={pauseGame} className="btn-ghost">
            <Pause className="h-4 w-4" />
            Pause
          </button>
        ) : (
          <button onClick={resumeGame} className="btn-primary">
            <Play className="h-4 w-4" />
            Resume
          </button>
        )}
        <button onClick={endQuestion} className="btn-ghost">
          Skip to results
        </button>
        <button
          onClick={() => useGameStore.getState().endGame()}
          className="btn-danger"
        >
          <Power className="h-4 w-4" strokeWidth={2.5} />
          End game
        </button>
      </div>

      {/* Paused overlay */}
      <AnimatePresence>
        {gameState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 -m-4 flex items-center justify-center rounded-3xl bg-night-950/80 backdrop-blur-sm"
          >
            <div className="card px-10 py-8 text-center">
              <Pause
                className="mx-auto mb-2 h-10 w-10 text-brand-300"
                strokeWidth={2.5}
              />
              <p className="font-display text-2xl font-bold text-white">
                Paused
              </p>
              <button onClick={resumeGame} className="btn-primary mt-4">
                <Play className="h-4 w-4" strokeWidth={2.5} />
                Resume
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===========================================================================
   RESULTS VIEW — host reads the room, then advances manually.
   =========================================================================== */
function ResultsView() {
  const lastResults = useGameStore((s) => s.lastResults);
  const questions = useGameStore((s) => s.questions);
  const currentIndex = useGameStore((s) => s.currentIndex);
  const nextQuestion = useGameStore((s) => s.nextQuestion);

  // NOTE: don't select `s.leaderboard()` directly — it returns a fresh array
  // every call, which useSyncExternalStore treats as "state changed" and
  // re-renders forever (React #185). Select raw state and derive instead.
  const players = useGameStore((s) => s.players);
  const leaderboard = useMemo(
    () => buildLeaderboard(Object.values(players)),
    [players]
  );

  const question = questions[currentIndex];
  if (!lastResults || !question) return null;

  const correctShape = ANSWER_SHAPES[lastResults.correctIndex];
  const isLast = currentIndex + 1 >= questions.length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Correct answer + stats */}
      <div className="flex flex-col gap-4">
        <div className="card p-6 text-center">
          <p className="eyebrow mb-4">Correct answer</p>
          <AnswerTile
            shape={correctShape}
            text={question.options[lastResults.correctIndex]}
            revealCorrect
          />
          <p className="mt-5 font-display text-lg font-bold text-slate-200">
            <span className="text-emerald-400">{lastResults.correctCount}</span>{" "}
            of {lastResults.totalAnswered} got it right
          </p>
        </div>
        <button onClick={nextQuestion} className="btn-gold self-center">
          {isLast ? "See final results" : "Next question"}
          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Live leaderboard */}
      <div className="card p-5">
        <h3 className="mb-4 text-xl font-bold text-white">Leaderboard</h3>
        <Leaderboard entries={leaderboard} />
      </div>
    </div>
  );
}

/* ===========================================================================
   END VIEW (champion podium)
   =========================================================================== */
function EndView() {
  const topic = useGameStore((s) => s.topic);
  const restartGame = useGameStore((s) => s.restartGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const router = useRouter();

  // See ResultsView: deriving via useMemo avoids the unstable-selector loop.
  const players = useGameStore((s) => s.players);
  const leaderboard = useMemo(
    () => buildLeaderboard(Object.values(players)),
    [players]
  );

  const [first, second, third] = leaderboard;
  const isFinals = topic === "championship";

  function newGame() {
    resetGame();
    router.replace("/host");
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Confetti active />
      <p className="eyebrow mb-2">
        {isFinals ? "The finals are over" : "Round complete"}
      </p>
      <h1 className="mb-4 flex items-center gap-3 text-4xl font-bold text-white sm:text-5xl">
        <Crown className="h-10 w-10 text-gold-400" strokeWidth={2.5} />
        {isFinals ? "Lakeside Champion" : "Round Winner"}
      </h1>

      {first && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="card my-4 border-gold-400/50 bg-gradient-to-b from-gold-400/20 to-gold-600/5 px-12 py-8 shadow-glow-gold"
        >
          <p className="font-display text-xl font-bold uppercase tracking-widest text-gold-300">
            1st place
          </p>
          <p className="font-display text-5xl font-extrabold text-white">
            {first.username}
          </p>
          <p className="font-display text-xl font-bold text-gold-300">
            {first.score.toLocaleString()} pts
          </p>
          {!isFinals && (
            <p className="mt-2 font-display text-sm font-semibold text-slate-300">
              advances to the Championship
            </p>
          )}
        </motion.div>
      )}

      {/* 2nd & 3rd — staggered reveal after the champion card */}
      <div className="mb-8 flex flex-wrap justify-center gap-4">
        {second && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card px-8 py-5"
          >
            <p className="font-display font-bold uppercase tracking-widest text-slate-300">
              2nd
            </p>
            <p className="font-display text-2xl font-bold text-white">
              {second.username}
            </p>
            <p className="font-display font-bold text-slate-300">
              {second.score.toLocaleString()} pts
            </p>
          </motion.div>
        )}
        {third && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card px-8 py-5"
          >
            <p className="font-display font-bold uppercase tracking-widest text-orange-300">
              3rd
            </p>
            <p className="font-display text-2xl font-bold text-white">
              {third.username}
            </p>
            <p className="font-display font-bold text-slate-300">
              {third.score.toLocaleString()} pts
            </p>
          </motion.div>
        )}
      </div>

      {/* Full final standings */}
      <div className="w-full max-w-md">
        <Leaderboard entries={leaderboard} />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={() => restartGame()} className="btn-primary">
          <RotateCcw className="h-4 w-4" />
          Play again (same players)
        </button>
        <button onClick={newGame} className="btn-ghost">
          New game
        </button>
      </div>
    </div>
  );
}
