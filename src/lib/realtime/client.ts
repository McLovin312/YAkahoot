"use client";

import PusherClient from "pusher-js";
import type { EventName } from "@/types";
import { EVENTS } from "@/types";
import { isPusherConfiguredClient } from "./config";

/**
 * Unified browser-side realtime client.
 *
 * Hides the transport from the rest of the app: pages call `connectToGame`
 * to receive events and `publishEvent` to send them, and the right transport
 * (Pusher Channels or the built-in local SSE relay) is picked automatically.
 */

export type RealtimeMode = "pusher" | "local";

/** Which transport this build will use. */
export function realtimeMode(): RealtimeMode {
  return isPusherConfiguredClient() ? "pusher" : "local";
}

export interface GameConnectionHandlers {
  /** Called for every game event received on the channel. */
  onEvent: (event: EventName, data: unknown) => void;
  /**
   * Called once the connection is live (safe to publish from this point).
   * `transport` is the SERVER-side fan-out in use: "redis" | "pusher" |
   * "memory" (memory = single-machine local play).
   */
  onConnect?: (info: { transport: string }) => void;
  /** Called when the connection drops (transports auto-reconnect). */
  onDisconnect?: () => void;
}

export interface GameConnection {
  mode: RealtimeMode;
  close: () => void;
}

const ALL_EVENTS = Object.values(EVENTS) as EventName[];

// ---------------------------------------------------------------------------
// Pusher transport
// ---------------------------------------------------------------------------

let pusherClient: PusherClient | null = null;

function getPusherClient(): PusherClient {
  if (pusherClient) return pusherClient;
  pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });
  return pusherClient;
}

function connectPusher(
  pin: string,
  handlers: GameConnectionHandlers
): GameConnection {
  const client = getPusherClient();
  const channelName = `game-${pin}`;
  const channel = client.subscribe(channelName);

  channel.bind("pusher:subscription_succeeded", () =>
    handlers.onConnect?.({ transport: "pusher" })
  );
  channel.bind("pusher:subscription_error", () => handlers.onDisconnect?.());
  for (const event of ALL_EVENTS) {
    channel.bind(event, (data: unknown) => handlers.onEvent(event, data));
  }

  return {
    mode: "pusher",
    close: () => {
      channel.unbind_all();
      client.unsubscribe(channelName);
    },
  };
}

// ---------------------------------------------------------------------------
// Local transport (Server-Sent Events against the built-in broker)
// ---------------------------------------------------------------------------

function connectLocal(
  pin: string,
  handlers: GameConnectionHandlers
): GameConnection {
  const source = new EventSource(
    `/api/game/stream?pin=${encodeURIComponent(pin)}`
  );

  source.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data) as {
        event: EventName | "connected";
        data: unknown;
      };
      if (event === "connected") {
        const mode = (data as { mode?: string } | null)?.mode ?? "memory";
        handlers.onConnect?.({ transport: mode });
      } else {
        handlers.onEvent(event, data);
      }
    } catch {
      // Ignore malformed frames (e.g. heartbeats are comment-only anyway).
    }
  };

  // EventSource reconnects automatically; just surface the state change.
  source.onerror = () => handlers.onDisconnect?.();

  return {
    mode: "local",
    close: () => source.close(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Open a realtime connection to a game channel. Returns a closeable handle. */
export function connectToGame(
  pin: string,
  handlers: GameConnectionHandlers
): GameConnection {
  return realtimeMode() === "pusher"
    ? connectPusher(pin, handlers)
    : connectLocal(pin, handlers);
}

/**
 * Publish an event to everyone in the game. All client-originated events flow
 * through `/api/game/event`, which validates them and relays them via the
 * active server-side transport.
 *
 * Host events MUST include the game's secret `hostKey` (created with the
 * game) — the server rejects host events without it.
 */
export async function publishEvent(
  pin: string,
  event: EventName,
  data: unknown,
  hostKey?: string
): Promise<void> {
  await fetch("/api/game/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, event, data, hostKey }),
  });
}
