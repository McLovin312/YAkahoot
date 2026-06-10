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
  /** Called once the connection is live (safe to publish from this point). */
  onConnect?: () => void;
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

  channel.bind("pusher:subscription_succeeded", () => handlers.onConnect?.());
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
        handlers.onConnect?.();
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
 * through `/api/game/event`, which relays them via the active server-side
 * transport (keeps the Pusher secret server-side; local mode needs the server
 * anyway because the broker lives there).
 */
export async function publishEvent(
  pin: string,
  event: EventName,
  data: unknown
): Promise<void> {
  await fetch("/api/game/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, event, data }),
  });
}
