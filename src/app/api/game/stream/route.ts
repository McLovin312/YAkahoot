import type { NextRequest } from "next/server";
import {
  eventsAfter,
  latestEventId,
  serverTransport,
  subscribeMemory,
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
 *  - redis (deployed): short polling of the Redis stream within a time budget,
 *    then a clean close so the client reconnects (lossless thanks to replay)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streaming budget per connection on Vercel (Fluid compute allows 300s on
// all plans). The client transparently reconnects when it elapses.
export const maxDuration = 300;

const HEARTBEAT_MS = 15_000;
const REDIS_POLL_MS = 900;
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

        // Redis: poll the stream until the time budget runs out, then close
        // cleanly — the client reconnects and resumes from its last id.
        const deadline = Date.now() + TIME_BUDGET_MS;
        while (!closed && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, REDIS_POLL_MS));
          if (closed) return;
          const events = await eventsAfter(pin, cursor);
          for (const event of events) {
            if (!write(frame(event))) return;
            cursor = event.id;
          }
        }
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
