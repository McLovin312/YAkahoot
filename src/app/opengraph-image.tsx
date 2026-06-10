import { ImageResponse } from "next/og";

/**
 * Social-share card (Open Graph / Twitter), generated at the edge.
 * Mirrors the in-app "game-show stage" look: midnight backdrop, the four
 * answer shapes, big display title.
 */

export const runtime = "edge";
export const alt = "Lakeside Trivia Night — three rounds, one champion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0E1E",
          backgroundImage:
            "radial-gradient(700px 450px at 15% -10%, rgba(79,70,229,0.35), transparent 60%), radial-gradient(700px 450px at 85% 110%, rgba(147,51,234,0.3), transparent 60%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* The four answer shapes */}
        <div style={{ display: "flex", gap: 36, marginBottom: 48 }}>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <polygon points="50,10 92,88 8,88" fill="#FF5876" />
          </svg>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <polygon points="50,6 94,50 50,94 6,50" fill="#54A2FF" />
          </svg>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="#FFC53D" />
          </svg>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <rect x="10" y="10" width="80" height="80" rx="14" fill="#3BD978" />
          </svg>
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 14,
            color: "#FFC53D",
            marginBottom: 18,
          }}
        >
          LAKESIDE YA PRESENTS
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1,
          }}
        >
          Trivia Night
        </div>
        <div style={{ fontSize: 32, color: "#94A3B8", marginTop: 26 }}>
          Three rounds. One champion. Answers on your phone.
        </div>
      </div>
    ),
    size
  );
}
