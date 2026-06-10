/**
 * Realtime transport selection.
 *
 * The game supports two interchangeable transports:
 *  - "pusher" : Pusher Channels (cloud). Required for a deployed site
 *               (e.g. Vercel) where serverless instances don't share memory.
 *  - "local"  : a built-in Server-Sent-Events relay with an in-memory broker.
 *               Zero configuration — perfect for local testing and for game
 *               nights where everyone is on the same Wi-Fi as the host machine.
 *
 * Pusher is used automatically when real credentials are present; otherwise
 * the app falls back to local mode. Placeholder values from .env.example
 * (e.g. "REPLACE_WITH_key") are treated as NOT configured.
 */

/** True when an env value is present and not an obvious placeholder. */
function isRealValue(value: string | undefined): boolean {
  if (!value) return false;
  return !/^(REPLACE_WITH|your[-_])/i.test(value.trim());
}

/**
 * Client-side check (NEXT_PUBLIC vars are inlined at build time, so this is
 * safe to call in the browser).
 */
export function isPusherConfiguredClient(): boolean {
  return (
    isRealValue(process.env.NEXT_PUBLIC_PUSHER_KEY) &&
    isRealValue(process.env.NEXT_PUBLIC_PUSHER_CLUSTER)
  );
}

/** Server-side check — requires the secret credentials too. */
export function isPusherConfiguredServer(): boolean {
  return (
    isRealValue(process.env.PUSHER_APP_ID) &&
    isRealValue(process.env.PUSHER_SECRET) &&
    isRealValue(process.env.NEXT_PUBLIC_PUSHER_KEY) &&
    isRealValue(process.env.NEXT_PUBLIC_PUSHER_CLUSTER)
  );
}
