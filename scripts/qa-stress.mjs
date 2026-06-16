/**
 * QA stress test: a real host + N players joining ONE game, end to end,
 * against the live realtime backend.
 *
 * It speaks the exact wire protocol the browser uses:
 *   - subscribe:  GET  /api/game/stream?pin=...   (Server-Sent Events)
 *   - publish:    POST /api/game/event            ({pin,event,data,hostKey})
 *
 * The "host" reimplements the authoritative host loop (accept joins, start
 * questions, score answers, send results). Each "player" subscribes, joins,
 * and answers every question. Everything is instrumented so we can report
 * connection success, join latency, per-question answer delivery, publish
 * latency, and any 429 (rate-limit) / 5xx / network failures.
 *
 * NOTE: from one machine every request shares ONE source IP — exactly the
 * "30 phones on the same Wi-Fi behind one NAT" case, which is the worst case
 * for the server's per-IP rate limiter.
 *
 * Usage: node scripts/qa-stress.mjs [baseUrl] [numPlayers] [numQuestions] [qGapMs]
 */

const BASE = (process.argv[2] || "https://lakesideyoungadults.com").replace(/\/$/, "");
const NUM_PLAYERS = Number(process.argv[3] || 30);
const NUM_QUESTIONS = Number(process.argv[4] || 6);
const Q_GAP_MS = Number(process.argv[5] || 2500); // answer-collection window
const RESULTS_GAP_MS = Number(process.argv[6] || 1500); // results hold before next Q
const QUESTION_DURATION_MS = 20_000;

const EVENTS = {
  PLAYERS_UPDATE: "players-update",
  QUESTION_START: "question-start",
  QUESTION_RESULTS: "question-results",
  GAME_STATE: "game-state",
  GAME_END: "game-end",
  JOIN_RESULT: "join-result",
  PLAYER_JOIN: "player-join",
  PLAYER_ANSWER: "player-answer",
  PLAYER_LEAVE: "player-leave",
};

const pin = String(Math.floor(100000 + Math.random() * 900000));
const hostKey = [...crypto.getRandomValues(new Uint8Array(16))]
  .map((b) => b.toString(16).padStart(2, "0")).join("");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

// --- instrumentation ----------------------------------------------------
const publishLog = []; // {who, event, status, ms, err}
let sseConnectErrors = 0;

async function publish(who, event, data, key) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/game/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, event, data, hostKey: key }),
    });
    const ms = Date.now() - t0;
    publishLog.push({ who, event, status: res.status, ms, t: t0 });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    publishLog.push({ who, event, status: 0, ms: Date.now() - t0, err: String(e), t: t0 });
    return { ok: false, status: 0, body: String(e) };
  }
}

/**
 * Subscribe to a game's SSE stream. Calls onEvent(event, data) for each game
 * event and onConnect() once the "connected" hello frame arrives.
 * Returns an abort function.
 */
function subscribe(onEvent, onConnect) {
  const controller = new AbortController();
  (async () => {
    let res;
    try {
      res = await fetch(`${BASE}/api/game/stream?pin=${pin}`, {
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });
    } catch (e) {
      if (!controller.signal.aborted) sseConnectErrors++;
      return;
    }
    if (!res.ok || !res.body) {
      sseConnectErrors++;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            let payload;
            try { payload = JSON.parse(line.slice(6)); } catch { continue; }
            if (payload.event === "connected") onConnect?.();
            else if (payload.event) onEvent(payload.event, payload.data);
          }
        }
      }
    } catch {
      // aborted or stream error
    }
  })();
  return () => controller.abort();
}

// ========================================================================
// HOST
// ========================================================================
const players = {}; // username -> {clientId, score, hasAnswered, lastAnswerIndex, lastAnswerCorrect}
const hostStats = {
  joinsReceived: 0,
  answersReceived: {}, // qIndex -> count
  connected: false,
};
let currentIndex = -1;
let questionStartedAt = 0;
const correctIndexByQ = []; // what we (host) decide is correct each question

function buildLeaderboard() {
  return Object.values(players)
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .map((p, i) => ({ rank: i + 1, username: p.username, score: p.score }));
}

function hostHandle(event, data) {
  if (event === EVENTS.PLAYER_JOIN) {
    hostStats.joinsReceived++;
    const { username, clientId } = data;
    if (!players[username]) {
      players[username] = { username, clientId, score: 0, hasAnswered: false, lastAnswerIndex: null, lastAnswerCorrect: false };
      // broadcast roster (mirrors broadcastPlayers) — fire-and-forget like the
      // real host (`void publishEvent`), so joins aren't serialized.
      void publish("host", EVENTS.PLAYERS_UPDATE, {
        players: Object.values(players).map((p) => ({ username: p.username, score: p.score })),
        count: Object.keys(players).length,
      }, hostKey);
    }
    void publish("host", EVENTS.JOIN_RESULT, { username, accepted: true }, hostKey);
  } else if (event === EVENTS.PLAYER_ANSWER) {
    const { username, clientId, answerIndex } = data;
    const p = players[username];
    if (!p || p.hasAnswered || p.clientId !== clientId) return;
    hostStats.answersReceived[currentIndex] = (hostStats.answersReceived[currentIndex] || 0) + 1;
    const isCorrect = answerIndex === correctIndexByQ[currentIndex];
    const timeUsed = Date.now() - questionStartedAt;
    const frac = Math.min(Math.max(timeUsed / QUESTION_DURATION_MS, 0), 1);
    const pts = isCorrect ? Math.round(1000 - 500 * frac) : 0;
    p.hasAnswered = true; p.lastAnswerIndex = answerIndex; p.lastAnswerCorrect = isCorrect; p.score += pts;
  }
}

// ========================================================================
// PLAYERS
// ========================================================================
const playerObjs = []; // {username, clientId, abort, stats}

function makePlayer(i) {
  const username = `Player${String(i + 1).padStart(2, "0")}`;
  const clientId = `cid-${username}-${Math.random().toString(36).slice(2, 8)}`;
  const stats = {
    sseConnected: false,
    joinAccepted: false,
    joinAckMs: null,
    questionStartsSeen: 0,
    resultsSeen: 0,
    answersSent: 0,
    answersFailed: 0,
    gameEndSeen: false,
    answeredThisQ: false,
  };
  let joinSentAt = 0;

  const abort = subscribe(
    async (event, data) => {
      if (event === EVENTS.JOIN_RESULT) {
        if (data.username !== username) return;
        if (!stats.joinAccepted && data.accepted) {
          stats.joinAccepted = true;
          stats.joinAckMs = Date.now() - joinSentAt;
        }
      } else if (event === EVENTS.QUESTION_START) {
        stats.questionStartsSeen++;
        stats.answeredThisQ = false;
        // answer after a human-like think time (200-1200ms)
        const think = 200 + Math.random() * 1000;
        setTimeout(async () => {
          if (stats.answeredThisQ) return;
          stats.answeredThisQ = true;
          const answerIndex = Math.floor(Math.random() * 4);
          stats.answersSent++;
          const r = await publish(username, EVENTS.PLAYER_ANSWER, { username, clientId, answerIndex });
          if (!r.ok) stats.answersFailed++;
        }, think);
      } else if (event === EVENTS.QUESTION_RESULTS) {
        stats.resultsSeen++;
      } else if (event === EVENTS.GAME_END) {
        stats.gameEndSeen = true;
      }
    },
    async () => {
      stats.sseConnected = true;
      joinSentAt = Date.now();
      const r = await publish(username, EVENTS.PLAYER_JOIN, { username, clientId });
      if (!r.ok) stats.answersFailed++; // count join failure too
    }
  );

  return { username, clientId, abort, stats };
}

// ========================================================================
// ORCHESTRATION
// ========================================================================
async function main() {
  console.log(`\n=== STRESS TEST ===`);
  console.log(`Target:   ${BASE}`);
  console.log(`PIN:      ${pin}   players: ${NUM_PLAYERS}   questions: ${NUM_QUESTIONS}`);
  console.log(`(all traffic from one source IP = one-Wi-Fi / one-NAT worst case)\n`);

  // 1. Host subscribes + claims the PIN.
  const hostAbort = subscribe(hostHandle, () => { hostStats.connected = true; });
  await sleep(800);
  const claim = await publish("host", EVENTS.GAME_STATE, { state: "lobby" }, hostKey);
  console.log(`Host SSE connected: ${hostStats.connected} | PIN claim: ${claim.ok ? "ok" : "FAIL " + claim.status}`);

  // 2. All players join in a burst (everyone scans the QR at once).
  console.log(`\nOpening ${NUM_PLAYERS} player connections (burst)...`);
  const t0 = Date.now();
  for (let i = 0; i < NUM_PLAYERS; i++) {
    playerObjs.push(makePlayer(i));
    await sleep(40); // ~1.2s for 30 phones to load the page — realistic-ish
  }

  // 3. Wait for joins to settle (configurable: arg 7).
  await sleep(Number(process.argv[7] || 5000));
  const connected = playerObjs.filter((p) => p.stats.sseConnected).length;
  const joined = playerObjs.filter((p) => p.stats.joinAccepted).length;
  console.log(`Lobby settled in ${Date.now() - t0}ms: SSE connected ${connected}/${NUM_PLAYERS}, join-accepted ${joined}/${NUM_PLAYERS}, host saw ${hostStats.joinsReceived} joins, roster size ${Object.keys(players).length}`);

  // 4. Run the questions.
  for (let q = 0; q < NUM_QUESTIONS; q++) {
    currentIndex = q;
    correctIndexByQ[q] = Math.floor(Math.random() * 4);
    for (const p of Object.values(players)) p.hasAnswered = false;
    questionStartedAt = Date.now();
    const qs = await publish("host", EVENTS.QUESTION_START, {
      index: q, total: NUM_QUESTIONS,
      question: `Stress question ${q + 1}?`,
      options: ["A", "B", "C", "D"],
      endsAt: questionStartedAt + QUESTION_DURATION_MS, durationMs: QUESTION_DURATION_MS,
    }, hostKey);

    await sleep(Q_GAP_MS); // collect answers

    const answers = hostStats.answersReceived[q] || 0;
    const startsSeen = playerObjs.filter((p) => p.stats.questionStartsSeen >= q + 1).length;
    await publish("host", EVENTS.QUESTION_RESULTS, {
      correctIndex: correctIndexByQ[q], correctCount: Object.values(players).filter(p => p.lastAnswerCorrect).length,
      totalAnswered: answers, leaderboard: buildLeaderboard(),
      correctText: ["A", "B", "C", "D"][correctIndexByQ[q]], nextAt: Date.now() + 1500,
    }, hostKey);
    console.log(`  Q${q + 1}: start ${qs.ok ? "ok" : "FAIL"} | players got start ${startsSeen}/${NUM_PLAYERS} | answers host received ${answers}/${NUM_PLAYERS}`);
    await sleep(RESULTS_GAP_MS);
  }

  // 5. End the game.
  currentIndex = -1;
  await publish("host", EVENTS.GAME_END, { leaderboard: buildLeaderboard() }, hostKey);
  await sleep(1500);

  // 6. Teardown.
  for (const p of playerObjs) p.abort();
  hostAbort();

  report();
}

function report() {
  console.log(`\n=== RESULTS ===`);
  const p = playerObjs.map((x) => x.stats);
  const n = NUM_PLAYERS;

  const connected = p.filter((s) => s.sseConnected).length;
  const joined = p.filter((s) => s.joinAccepted).length;
  const joinMs = p.map((s) => s.joinAckMs).filter((x) => x != null);
  console.log(`Connections : ${connected}/${n} SSE up   (${sseConnectErrors} connect errors)`);
  console.log(`Joins       : ${joined}/${n} accepted   join-ack latency p50 ${pct(joinMs,50)}ms / p95 ${pct(joinMs,95)}ms / max ${joinMs.length?Math.max(...joinMs):"-"}ms`);

  // per-question delivery
  let startMin = Infinity, resMin = Infinity, ansTotal = 0, ansExpected = 0;
  for (let q = 0; q < NUM_QUESTIONS; q++) {
    const got = p.filter((s) => s.questionStartsSeen >= q + 1).length;
    startMin = Math.min(startMin, got);
    const ans = hostStats.answersReceived[q] || 0;
    ansTotal += ans; ansExpected += joined;
  }
  const resAll = p.map((s) => s.resultsSeen);
  // Ground truth of "joined and playing": the host received this player's
  // answers. (join-ack tracking can undercount when JOIN_RESULT is delivered
  // just after the settle window — but answering proves the player is live.)
  const ansExpectedFull = NUM_PLAYERS * NUM_QUESTIONS;
  console.log(`Q-start recv: every player got every question-start? min ${startMin}/${n} across ${NUM_QUESTIONS} questions`);
  console.log(`Results recv: results seen per player p50 ${pct(resAll,50)}/${NUM_QUESTIONS}, min ${Math.min(...resAll)}/${NUM_QUESTIONS}`);
  console.log(`Roster       : host registered ${Object.keys(players).length}/${n} players`);
  console.log(`Answers      : host received ${ansTotal}/${ansExpectedFull} expected (all players x questions)`);
  console.log(`Game end     : ${p.filter((s)=>s.gameEndSeen).length}/${n} players saw GAME_END`);

  // publish health
  const byStatus = {};
  const lat = [];
  for (const e of publishLog) {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    if (e.status === 200) lat.push(e.ms);
  }
  const rate429 = byStatus[429] || 0;
  const errs = Object.entries(byStatus).filter(([s]) => s !== "200").map(([s, c]) => `${s}:${c}`);
  console.log(`\nPublishes   : ${publishLog.length} total   latency(200) p50 ${pct(lat,50)}ms / p95 ${pct(lat,95)}ms / max ${lat.length?Math.max(...lat):"-"}ms`);
  console.log(`Non-200     : ${errs.length ? errs.join("  ") : "none"}   ${rate429 ? "⚠️ RATE LIMITED (429)" : ""}`);

  // Which event types got rate-limited.
  if (rate429) {
    const by429 = {};
    for (const e of publishLog) if (e.status === 429) by429[e.event] = (by429[e.event] || 0) + 1;
    console.log(`429 breakdown: ${Object.entries(by429).map(([k,v])=>`${k}:${v}`).join("  ")}`);
  }

  // Peak load vs the server's limiter. The server uses a FIXED 60s window
  // (floor(now/60000)); we also report the worst SLIDING 60s window.
  const ts = publishLog.map((e) => e.t).sort((a, b) => a - b);
  let slidePeak = 0;
  for (let i = 0; i < ts.length; i++) {
    let j = i; while (j < ts.length && ts[j] - ts[i] < 60000) j++;
    slidePeak = Math.max(slidePeak, j - i);
  }
  const buckets = {};
  for (const t of ts) { const b = Math.floor(t / 60000); buckets[b] = (buckets[b] || 0) + 1; }
  const fixedPeak = Math.max(...Object.values(buckets));
  const BUDGET = 1200; // RATE_MAX_EVENTS in broker.ts
  console.log(`\nPer-IP rate-limit budget : ${BUDGET} events / 60s (fixed minute window).`);
  console.log(`Peak load (this run)     : worst fixed minute ${fixedPeak}/${BUDGET}, worst sliding 60s ${slidePeak}/${BUDGET}.`);

  // verdicts
  console.log(`\n=== VERDICT ===`);
  const ok = (c) => (c ? "✅" : "❌");
  const allConnected = connected === n;
  const allRostered = Object.keys(players).length === n;
  const allStarts = startMin === n;
  const allAnswers = ansTotal === NUM_PLAYERS * NUM_QUESTIONS;
  const noRate = rate429 === 0;
  const allEnd = p.filter((s)=>s.gameEndSeen).length === n;
  console.log(`${ok(allConnected)} All ${n} players connected`);
  console.log(`${ok(allRostered)} All ${n} players joined (host roster)`);
  console.log(`${ok(allStarts)} Every player received every question`);
  console.log(`${ok(allAnswers)} Every answer reached the host`);
  console.log(`${ok(allEnd)} Every player saw game end`);
  console.log(`${ok(noRate)} No rate-limit (429) errors`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
