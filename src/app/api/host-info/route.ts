import os from "os";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Returns the host machine's LAN address so the host screen can show players
 * a joinable URL (and QR code) when running locally. When the host screen is
 * open on http://localhost:3000, "localhost" is useless to phones — they need
 * the machine's Wi-Fi IP, e.g. http://192.168.1.23:3000.
 *
 * Only answers for requests that are themselves local/private — on a deployed
 * site this returns nothing (the public origin is already the join URL, and
 * server network details shouldn't be disclosed).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Interface names that are almost never the real Wi-Fi/Ethernet adapter. */
const VIRTUAL_ADAPTER = /(vethernet|virtualbox|vmware|wsl|loopback|docker|hyper-v|tailscale|zerotier)/i;

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i;

function findLanIPv4(): string | null {
  const interfaces = os.networkInterfaces();
  let fallback: string | null = null;

  for (const [name, nets] of Object.entries(interfaces)) {
    for (const net of nets ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      if (net.address.startsWith("169.254.")) continue; // link-local
      if (VIRTUAL_ADAPTER.test(name)) {
        fallback ??= net.address;
        continue;
      }
      return net.address;
    }
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  const requestHost = request.headers.get("host") ?? "";
  if (process.env.VERCEL || !PRIVATE_HOST.test(requestHost)) {
    return NextResponse.json({ lanUrl: null });
  }

  const ip = findLanIPv4();
  const port = request.nextUrl.port || "3000";
  return NextResponse.json({
    lanUrl: ip ? `http://${ip}:${port}` : null,
  });
}
