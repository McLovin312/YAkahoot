import type { EventName } from "@/types";

/**
 * In-memory pub/sub broker powering "local" realtime mode.
 *
 * Each game PIN is a channel; subscribers are SSE response streams (see
 * /api/game/stream). Publishing fans the message out to every subscriber.
 *
 * NOTE: this only works while the whole app runs in ONE Node process — true
 * for `next dev` and `next start` on a single machine, NOT for serverless
 * deploys. Deployed sites should configure Pusher (see lib/realtime/config).
 *
 * The channel map is cached on `globalThis` so it survives Next.js dev-mode
 * hot reloads (which re-evaluate modules but keep the process alive).
 */

export interface BrokerMessage {
  event: EventName | "connected";
  data: unknown;
}

type Listener = (message: BrokerMessage) => void;

const globalCache = globalThis as unknown as {
  __lakesideBroker?: Map<string, Set<Listener>>;
};

const channels: Map<string, Set<Listener>> = (globalCache.__lakesideBroker ??=
  new Map());

/** Subscribe to a game channel. Returns an unsubscribe function. */
export function subscribeLocal(pin: string, listener: Listener): () => void {
  let listeners = channels.get(pin);
  if (!listeners) {
    listeners = new Set();
    channels.set(pin, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) channels.delete(pin);
  };
}

/** Broadcast an event to every subscriber of a game channel. */
export function publishLocal(
  pin: string,
  event: EventName,
  data: unknown
): void {
  const listeners = channels.get(pin);
  if (!listeners) return;
  const message: BrokerMessage = { event, data };
  // Copy first: a listener erroring/unsubscribing must not break the fan-out.
  for (const listener of [...listeners]) {
    try {
      listener(message);
    } catch {
      // Dead stream — its cleanup handler will unsubscribe it.
    }
  }
}
