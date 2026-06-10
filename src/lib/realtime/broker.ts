import type { EventName } from "@/types";
import { isPusherConfiguredServer } from "./config";
import {
  expire,
  get,
  incr,
  isRedisConfigured,
  setNx,
  xadd,
  xlastId,
  xrangeAfter,
} from "./redisRest";

/**
 * Server-side realtime broker.
 *
 * Every game is an ordered event log; SSE clients replay from their last seen
 * event id (lossless reconnects). Two interchangeable backends:
 *
 *  - "redis"  : Upstash Redis streams (XADD / XRANGE over REST). Works across
 *               serverless instances — REQUIRED for deployed sites unless
 *               Pusher is configured instead.
 *  - "memory" : in-process ring buffer. Zero-config local play; cached on
 *               `globalThis` to survive Next.js dev hot reloads.
 *
 * The broker also stores per-game host keys (so only the real host can send
 * host events) and per-IP rate-limit counters.
 */

export interface BrokerEvent {
  id: string;
  event: EventName;
  data: unknown;
}

export type TransportName = "redis" | "pusher" | "memory";

/** The transport the SERVER will use for fan-out, in priority order. */
export function serverTransport(): TransportName {
  if (isRedisConfigured()) return "redis";
  if (isPusherConfiguredServer()) return "pusher";
  return "memory";
}

const STREAM_TTL_SECONDS = 6 * 60 * 60; // games are over well within 6h
const HOST_KEY_TTL_SECONDS = 12 * 60 * 60;
const MEMORY_HISTORY_LIMIT = 2_000;

// ---------------------------------------------------------------------------
// Memory backend
// ---------------------------------------------------------------------------

type Listener = (event: BrokerEvent) => void;

interface MemoryChannel {
  history: BrokerEvent[];
  listeners: Set<Listener>;
  seq: number;
  lastTouched: number;
  hostKey?: string;
}

const globalCache = globalThis as unknown as {
  __lakesideChannels?: Map<string, MemoryChannel>;
  __lakesideRate?: Map<string, { count: number; resetAt: number }>;
};

const channels: Map<string, MemoryChannel> = (globalCache.__lakesideChannels ??=
  new Map());
const rateBuckets: Map<string, { count: number; resetAt: number }> =
  (globalCache.__lakesideRate ??= new Map());

function memoryChannel(pin: string): MemoryChannel {
  let ch = channels.get(pin);
  if (!ch) {
    ch = { history: [], listeners: new Set(), seq: 0, lastTouched: Date.now() };
    channels.set(pin, ch);
  }
  ch.lastTouched = Date.now();
  // Opportunistic cleanup of long-dead games.
  if (channels.size > 50) {
    const cutoff = Date.now() - STREAM_TTL_SECONDS * 1000;
    for (const [key, c] of channels) {
      if (c.lastTouched < cutoff && c.listeners.size === 0) channels.delete(key);
    }
  }
  return ch;
}

/**
 * Memory mode only: push-based subscription (no polling needed locally).
 * Returns an unsubscribe function.
 */
export function subscribeMemory(
  pin: string,
  listener: Listener
): () => void {
  const ch = memoryChannel(pin);
  ch.listeners.add(listener);
  return () => {
    ch.listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Unified API
// ---------------------------------------------------------------------------

function streamKey(pin: string): string {
  return `game:${pin}:events`;
}

/** Append an event to the game's log and fan it out. Returns the event id. */
export async function publishToBroker(
  pin: string,
  event: EventName,
  data: unknown
): Promise<string> {
  if (serverTransport() === "redis") {
    const id = await xadd(streamKey(pin), {
      e: event,
      d: JSON.stringify(data ?? null),
    });
    await expire(streamKey(pin), STREAM_TTL_SECONDS);
    return id;
  }

  const ch = memoryChannel(pin);
  ch.seq += 1;
  const entry: BrokerEvent = { id: `${Date.now()}-${ch.seq}`, event, data };
  ch.history.push(entry);
  if (ch.history.length > MEMORY_HISTORY_LIMIT) {
    ch.history.splice(0, ch.history.length - MEMORY_HISTORY_LIMIT);
  }
  for (const listener of [...ch.listeners]) {
    try {
      listener(entry);
    } catch {
      // Dead stream — its cleanup handler will unsubscribe it.
    }
  }
  return entry.id;
}

/**
 * Id of the newest event in a game's log ("" when empty). Fresh SSE
 * connections start from here — only RECONNECTS replay missed events.
 */
export async function latestEventId(pin: string): Promise<string> {
  if (serverTransport() === "redis") {
    return xlastId(streamKey(pin));
  }
  const ch = memoryChannel(pin);
  return ch.history.length ? ch.history[ch.history.length - 1].id : "";
}

/** All events strictly after `afterId` ("" = everything retained). */
export async function eventsAfter(
  pin: string,
  afterId: string
): Promise<BrokerEvent[]> {
  if (serverTransport() === "redis") {
    const entries = await xrangeAfter(streamKey(pin), afterId);
    return entries.map(({ id, fields }) => ({
      id,
      event: fields.e as EventName,
      data: fields.d ? JSON.parse(fields.d) : null,
    }));
  }

  const ch = memoryChannel(pin);
  if (!afterId) return [...ch.history];
  const idx = ch.history.findIndex((e) => e.id === afterId);
  // Unknown id (pruned or bogus): replay everything we still have.
  return idx === -1 ? [...ch.history] : ch.history.slice(idx + 1);
}

// ---------------------------------------------------------------------------
// Host-key claims — only the game's creator may publish host events.
// ---------------------------------------------------------------------------

/**
 * First caller with a given PIN claims it; later calls must present the same
 * key. TTL'd so PINs recycle naturally.
 */
export async function claimOrVerifyHostKey(
  pin: string,
  hostKey: string
): Promise<"ok" | "mismatch"> {
  if (!hostKey) return "mismatch";

  if (serverTransport() === "redis") {
    const key = `game:${pin}:hostkey`;
    const claimed = await setNx(key, hostKey, HOST_KEY_TTL_SECONDS);
    if (claimed) return "ok";
    const existing = await get(key);
    if (existing === hostKey) {
      await expire(key, HOST_KEY_TTL_SECONDS); // sliding renewal
      return "ok";
    }
    return "mismatch";
  }

  const ch = memoryChannel(pin);
  if (!ch.hostKey) {
    ch.hostKey = hostKey;
    return "ok";
  }
  return ch.hostKey === hostKey ? "ok" : "mismatch";
}

// ---------------------------------------------------------------------------
// Rate limiting — fixed 60s window per IP.
// ---------------------------------------------------------------------------

const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_EVENTS = 240;

/** Returns true when the caller is within limits. */
export async function checkRateLimit(ip: string): Promise<boolean> {
  if (serverTransport() === "redis") {
    const key = `rl:${ip}:${Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000))}`;
    const count = await incr(key);
    if (count === 1) await expire(key, RATE_WINDOW_SECONDS + 5);
    return count <= RATE_MAX_EVENTS;
  }

  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_SECONDS * 1000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX_EVENTS;
}
