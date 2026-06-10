import { NextResponse } from "next/server";
import { getPusherServer, gameChannel } from "@/lib/pusher/server";
import { isPusherConfiguredServer } from "@/lib/realtime/config";
import { publishLocal } from "@/lib/realtime/broker";
import { EVENTS, type EventName } from "@/types";

/**
 * Generic event relay.
 *
 * The client never publishes directly. It POSTs here and the server fans the
 * event out over the active transport:
 *  - Pusher Channels when credentials are configured (deployed sites)
 *  - the in-memory SSE broker otherwise (zero-config local play)
 *
 * Body: { pin: string, event: EventName, data: unknown }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EVENTS = new Set<string>(Object.values(EVENTS));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, event, data } = body as {
      pin?: string;
      event?: EventName;
      data?: unknown;
    };

    // --- Basic validation ---
    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid game PIN" }, { status: 400 });
    }
    if (!event || !VALID_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }

    if (isPusherConfiguredServer()) {
      const pusher = getPusherServer();
      await pusher.trigger(gameChannel(pin), event, data ?? {});
      return NextResponse.json({ ok: true, mode: "pusher" });
    }

    publishLocal(pin, event, data ?? {});
    return NextResponse.json({ ok: true, mode: "local" });
  } catch (err) {
    console.error("[/api/game/event] error:", err);
    return NextResponse.json(
      { error: "Failed to publish event" },
      { status: 500 }
    );
  }
}
