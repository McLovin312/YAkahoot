/**
 * Minimal Upstash Redis REST client (server-side only).
 *
 * Uses the plain REST protocol — POST a JSON command array to the base URL,
 * receive `{ "result": ... }` — instead of the SDK, so the exact wire shapes
 * are under our control and easy to emulate in tests.
 *
 * Docs: https://upstash.com/docs/redis/features/restapi
 */

export interface RedisRestConfig {
  url: string;
  token: string;
}

/** Reads Upstash credentials (also supports Vercel KV-style names). */
export function getRedisConfig(): RedisRestConfig | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (/^(REPLACE_WITH|your[-_])/i.test(url)) return null;
  return { url, token };
}

export function isRedisConfigured(): boolean {
  return getRedisConfig() !== null;
}

/** Executes a single Redis command, e.g. command(["GET", "foo"]). */
export async function redisCommand<T>(
  cmd: (string | number)[]
): Promise<T> {
  const config = getRedisConfig();
  if (!config) throw new Error("Redis is not configured");

  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Redis ${cmd[0]} failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) throw new Error(`Redis ${cmd[0]} error: ${data.error}`);
  return data.result as T;
}

// ---------------------------------------------------------------------------
// Typed helpers for the small command surface this app uses
// ---------------------------------------------------------------------------

/** XADD with stream trimming. Returns the new entry id (e.g. "171234-0"). */
export async function xadd(
  key: string,
  fields: Record<string, string>,
  maxLen = 10_000
): Promise<string> {
  const flat = Object.entries(fields).flat();
  return redisCommand<string>([
    "XADD",
    key,
    "MAXLEN",
    "~",
    maxLen,
    "*",
    ...flat,
  ]);
}

/**
 * XRANGE everything strictly AFTER `afterId` ("" = from the beginning).
 * Raw reply shape: [ [id, [k1, v1, k2, v2, ...]], ... ]
 */
export async function xrangeAfter(
  key: string,
  afterId: string,
  count = 500
): Promise<Array<{ id: string; fields: Record<string, string> }>> {
  const start = afterId ? `(${afterId}` : "-";
  const raw = await redisCommand<Array<[string, string[]]>>([
    "XRANGE",
    key,
    start,
    "+",
    "COUNT",
    count,
  ]);
  return (raw ?? []).map(([id, flat]) => {
    const fields: Record<string, string> = {};
    for (let i = 0; i < flat.length; i += 2) fields[flat[i]] = flat[i + 1];
    return { id, fields };
  });
}

/** Id of the newest entry in a stream, or "" when empty/missing. */
export async function xlastId(key: string): Promise<string> {
  const raw = await redisCommand<Array<[string, string[]]>>([
    "XREVRANGE",
    key,
    "+",
    "-",
    "COUNT",
    1,
  ]);
  return raw?.[0]?.[0] ?? "";
}

export async function expire(key: string, seconds: number): Promise<void> {
  await redisCommand(["EXPIRE", key, seconds]);
}

/** SET key value NX EX ttl — returns true when the key was newly set. */
export async function setNx(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  const result = await redisCommand<string | null>([
    "SET",
    key,
    value,
    "NX",
    "EX",
    ttlSeconds,
  ]);
  return result === "OK";
}

export async function get(key: string): Promise<string | null> {
  return redisCommand<string | null>(["GET", key]);
}

export async function incr(key: string): Promise<number> {
  return redisCommand<number>(["INCR", key]);
}
