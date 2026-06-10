import { NextResponse } from "next/server";
import { getPusherServer, gameChannel } from "@/lib/pusher/server";
import {
  checkRateLimit,
  claimOrVerifyHostKey,
  publishToBroker,
  serverTransport,
} from "@/lib/realtime/broker";
import { EVENTS, HOST_EVENTS, type EventName } from "@/types";

/**
 * Generic event relay — the only write path into a game.
 *
 * Security model:
 *  - events must be on the whitelist; payloads are validated per event type
 *  - HOST events require the game's secret `hostKey` (claimed at creation),
 *    so players can't forge question-starts, results or kicks
 *  - per-IP rate limiting and a request size cap
 *
 * Body: { pin: string, event: EventName, data: unknown, hostKey?: string }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64_000;

const VALID_EVENTS = new Set<string>(Object.values(EVENTS));

const USERNAME_RE = /^[\w \-.]{2,20}$/;
const CLIENT_ID_RE = /^[\w-]{4,64}$/;

/** Strict shape checks for player-originated events. */
function validatePlayerPayload(event: EventName, data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;

  switch (event) {
    case EVENTS.PLAYER_JOIN:
      return (
        typeof d.username === "string" &&
        USERNAME_RE.test(d.username) &&
        typeof d.clientId === "string" &&
        CLIENT_ID_RE.test(d.clientId)
      );
    case EVENTS.PLAYER_ANSWER:
      return (
        typeof d.username === "string" &&
        USERNAME_RE.test(d.username) &&
        typeof d.clientId === "string" &&
        CLIENT_ID_RE.test(d.clientId) &&
        typeof d.answerIndex === "number" &&
        [0, 1, 2, 3].includes(d.answerIndex)
      );
    case EVENTS.PLAYER_LEAVE:
      return (
        typeof d.username === "string" &&
        USERNAME_RE.test(d.username) &&
        typeof d.clientId === "string" &&
        CLIENT_ID_RE.test(d.clientId)
      );
    default:
      return true; // host events: authenticated by hostKey, size-capped
  }
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export async function POST(request: Request) {
  try {
    // --- Size cap (cheap DoS guard) ---
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: {
      pin?: string;
      event?: EventName;
      data?: unknown;
      hostKey?: string;
    };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { pin, event, data, hostKey } = body;

    // --- Basic validation ---
    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid game PIN" }, { status: 400 });
    }
    if (!event || !VALID_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }
    if (!validatePlayerPayload(event, data)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // --- Rate limit ---
    if (!(await checkRateLimit(clientIp(request)))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // --- Host events require the game's host key ---
    if (HOST_EVENTS.has(event)) {
      const verdict = await claimOrVerifyHostKey(
        pin,
        typeof hostKey === "string" ? hostKey : ""
      );
      if (verdict !== "ok") {
        return NextResponse.json(
          { error: "Not the host of this game" },
          { status: 403 }
        );
      }
    }

    // --- Fan out ---
    const mode = serverTransport();
    if (mode === "pusher") {
      const pusher = getPusherServer();
      await pusher.trigger(gameChannel(pin), event, data ?? {});
    } else {
      await publishToBroker(pin, event, data ?? {});
    }

    return NextResponse.json({ ok: true, mode });
  } catch (err) {
    console.error("[/api/game/event] error:", err);
    return NextResponse.json(
      { error: "Failed to publish event" },
      { status: 500 }
    );
  }
}
