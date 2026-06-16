import type { NextRequest } from "next/server";
import {
  eventsAfter,
  isNewerEventId,
  latestEventId,
  serverTransport,
  subscribeMemory,
  subscribeRedisLive,
  type BrokerEvent,
} from "@/lib/realtime/broker";

/**
 * Server-Sent-Events endpoint — how every browser receives game events when
 * Pusher is not in use.
 *
 * Reliability model: every event has an id (its position in the game's event
 * log). We set the SSE `id:` field, so when a connection drops — tab sleep,
 * Wi-Fi blip, or the serverless function hitting its time limit — the browser
 * auto-reconnects with a `Last-Event-ID` header and we REPLAY everything it
 * missed. No event is ever lost.
 *
 * Backends:
 *  - memory (local) : instant push via in-process subscription
 *  - redis (deployed): INSTANT push via Upstash pub/sub, with the stream as
 *    the durable log — replay on reconnect, plus a slow safety-net poll in
 *    case pub/sub ever hiccups (degrades to fast polling if it drops)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streaming budget per connection on Vercel (Fluid compute allows 300s on
// all plans). The client transparently reconnects when it elapses.
export const maxDuration = 300;

const HEARTBEAT_MS = 15_000;
// Safety-net poll cadence while pub/sub is healthy / after it failed.
const SAFETY_POLL_MS = 15_000;
const FALLBACK_POLL_MS = 1_000;
// Close a bit before maxDuration so we end cleanly, not by termination.
const TIME_BUDGET_MS = (maxDuration - 15) * 1000;

const encoder = new TextEncoder();

function frame(event: BrokerEvent): Uint8Array {
  return encoder.encode(
    `id: ${event.id}\ndata: ${JSON.stringify({ event: event.event, data: event.data })}\n\n`
  );
}

export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin") ?? "";
  if (!/^\d{6}$/.test(pin)) {
    return new Response("Invalid game PIN", { status: 400 });
  }

  // Resume point: standard SSE reconnect header (with a query fallback).
  const lastEventId =
    request.headers.get("last-event-id") ??
    request.nextUrl.searchParams.get("lastEventId") ??
    "";

  const mode = serverTransport();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        cleanup?.();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };

      const write = (chunk: Uint8Array): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          close();
          return false;
        }
      };

      const heartbeat = setInterval(() => {
        write(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", close);

      // Hello frame: reconnect delay hint + "subscription live" signal.
      write(
        encoder.encode(
          `retry: 2000\ndata: ${JSON.stringify({ event: "connected", data: { pin, mode } })}\n\n`
        )
      );

      try {
        let cursor: string;
        if (lastEventId) {
          // Reconnect: replay everything the client missed while offline.
          cursor = lastEventId;
          const missed = await eventsAfter(pin, cursor);
          for (const event of missed) {
            if (!write(frame(event))) return;
            cursor = event.id;
          }
        } else {
          // Fresh connection: live events only — never replay old history
          // (a player joining mid-game must not fast-forward the whole game).
          cursor = await latestEventId(pin);
        }

        if (mode !== "redis") {
          // Local: instant push. The subscription stays until disconnect.
          const unsubscribe = subscribeMemory(pin, (event) => {
            write(frame(event));
          });
          cleanup = unsubscribe;
          if (closed) unsubscribe(); // disconnected during replay
          return;
        }

        // Redis: the durable stream is the single source of truth. Pub/sub is
        // ONLY a low-latency "new events — drain now" signal; it never delivers
        // payloads directly. A serialized drain reads strictly-newer events from
        // the stream and advances the cursor only as it actually writes them, in
        // order. This is what makes a burst of 30 simultaneous joins lossless:
        //
        //   The old design delivered the pub/sub payload directly and advanced
        //   the cursor to it. Pub/sub is at-most-once, so under a burst some
        //   messages are dropped; and because a later message could advance the
        //   cursor past an earlier (dropped) one, the safety poll's
        //   `eventsAfter(cursor)` would never look back — the dropped event was
        //   lost forever. Draining from the stream with a forward-only cursor
        //   that moves only on real delivery removes that race entirely.
        let draining = false;
        let drainAgain = false;
        const drain = async () => {
          if (draining) {
            // A drain is in flight; make it loop once more so this signal isn't
            // missed (coalesces bursts into the minimum number of reads).
            drainAgain = true;
            return;
          }
          draining = true;
          try {
            do {
              drainAgain = false;
              const events = await eventsAfter(pin, cursor);
              for (const event of events) {
                if (!isNewerEventId(event.id, cursor)) continue;
                cursor = event.id;
                if (!write(frame(event))) return;
              }
            } while (drainAgain && !closed);
          } catch {
            // Transient Redis error — the periodic safety poll retries.
          } finally {
            draining = false;
          }
        };

        const subController = new AbortController();
        cleanup = () => subController.abort();

        let pollMs = SAFETY_POLL_MS;
        subscribeRedisLive(pin, {
          // Both "subscription live" and every live message just trigger a drain
          // from the durable stream — no payload is ever trusted directly.
          onSubscribed: () => void drain(),
          onEvent: () => void drain(),
        }, subController.signal).catch(() => {
          // Pub/sub unavailable — lean on faster polling (still lossless).
          pollMs = FALLBACK_POLL_MS;
        });

        // Safety-net poll: drains on a cadence in case pub/sub hiccups, drops a
        // wake-up, or the subscription never establishes.
        const deadline = Date.now() + TIME_BUDGET_MS;
        let lastPoll = Date.now();
        while (!closed && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 250));
          if (closed) break;
          if (Date.now() - lastPoll < pollMs) continue;
          lastPoll = Date.now();
          await drain();
        }
        subController.abort();
        close();
      } catch (err) {
        console.error("[/api/game/stream] error:", err);
        close();
      }
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
