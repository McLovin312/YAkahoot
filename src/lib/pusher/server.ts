import Pusher from "pusher";

/**
 * Server-side Pusher instance.
 *
 * Used inside API routes to securely trigger events. Reads secret credentials
 * from environment variables that are NEVER exposed to the browser.
 *
 * See `.env.example` for the required variables.
 */

let pusherServer: Pusher | null = null;

/**
 * Lazily construct the server Pusher client so that a missing env var only
 * throws when an API route is actually hit (not at import time, which would
 * break `next build`).
 */
export function getPusherServer(): Pusher {
  if (pusherServer) return pusherServer;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      "Missing Pusher environment variables. Copy .env.example to .env.local and fill in your Pusher credentials."
    );
  }

  pusherServer = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherServer;
}

/** Build the Pusher channel name for a given game PIN. */
export function gameChannel(pin: string): string {
  return `game-${pin}`;
}
