import type { NextRequest } from "next/server";
import { subscribeLocal, type BrokerMessage } from "@/lib/realtime/broker";

/**
 * Server-Sent-Events endpoint for "local" realtime mode.
 *
 * Each connected browser (host screen and every player phone) opens
 * `GET /api/game/stream?pin=XXXXXX` with EventSource and receives every event
 * published to that game via the in-memory broker.
 *
 * Only used when Pusher is not configured; see src/lib/realtime/config.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin") ?? "";
  if (!/^\d{6}$/.test(pin)) {
    return new Response("Invalid game PIN", { status: 400 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };

      const send = (message: BrokerMessage) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        } catch {
          cleanup();
        }
      };

      // Tell the client the subscription is live (it may publish from now on).
      send({ event: "connected", data: { pin } });
      unsubscribe = subscribeLocal(pin, send);

      // Keep proxies/browsers from timing the connection out.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);

      // Browser closed the tab / EventSource.close() was called.
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
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
