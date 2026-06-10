import { NextResponse } from "next/server";
import { serverTransport } from "@/lib/realtime/broker";
import { redisCommand } from "@/lib/realtime/redisRest";

/**
 * Deployment sanity check. The host lobby calls this to warn loudly when the
 * site is deployed (serverless) but still on the in-memory transport — which
 * only works in a single long-lived process, i.e. local play.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const transport = serverTransport();
  const deployed = Boolean(process.env.VERCEL || process.env.NETLIFY);

  let redisOk: boolean | undefined;
  if (transport === "redis") {
    try {
      redisOk = (await redisCommand<string>(["PING"])) === "PONG";
    } catch {
      redisOk = false;
    }
  }

  return NextResponse.json({
    transport,
    deployed,
    redisOk,
    // memory transport cannot sync players across serverless instances
    misconfigured: deployed && transport === "memory",
  });
}
