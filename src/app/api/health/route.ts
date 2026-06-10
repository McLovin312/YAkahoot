import { NextResponse } from "next/server";
import { serverTransport } from "@/lib/realtime/broker";
import { redisCommand } from "@/lib/realtime/redisRest";

/**
 * Deployment sanity check. The host lobby calls this to warn loudly when the
 * realtime backend is missing or unreachable — without it, a deployed
 * (serverless) site can't sync players across instances.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const transport = serverTransport();
  const deployed = Boolean(process.env.VERCEL || process.env.NETLIFY);

  let redisOk: boolean | undefined;
  let redisWriteOk: boolean | undefined;
  let redisError: string | undefined;

  if (transport === "redis") {
    try {
      redisOk = (await redisCommand<string>(["PING"])) === "PONG";
      // A real write probe — catches read-only tokens, which PING does not.
      redisWriteOk =
        (await redisCommand<string>([
          "SET",
          "health:probe",
          String(Date.now()),
          "EX",
          60,
        ])) === "OK";
    } catch (err) {
      redisOk = redisOk ?? false;
      redisWriteOk = redisWriteOk ?? false;
      redisError = err instanceof Error ? err.message.slice(0, 200) : "unknown";
    }
  }

  const healthy =
    transport === "pusher" ||
    (transport === "redis" && redisOk === true && redisWriteOk === true) ||
    (transport === "memory" && !deployed);

  return NextResponse.json({
    transport,
    deployed,
    redisOk,
    redisWriteOk,
    redisError,
    misconfigured: !healthy,
    hint: healthy
      ? undefined
      : transport === "memory"
        ? "No realtime backend configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel and redeploy."
        : redisOk === false
          ? "Redis is configured but unreachable. Check that the URL/token values have no quotes or extra spaces, then redeploy."
          : "Redis reachable but writes fail — the token may be the READ-ONLY one. Use the read-write REST token.",
  });
}
