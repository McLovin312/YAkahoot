import type { Config } from "tailwindcss";

/**
 * Tailwind configuration for Lakeside Trivia Night.
 *
 * Design language: "game-show stage" — a single dark theme built around a
 * deep midnight-navy stage, colored spotlight glows, glassy surfaces and four
 * saturated answer colors. Display type is Bricolage Grotesque; body type is
 * Instrument Sans.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
    "./src/data/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // The stage — page background layers.
        night: {
          950: "#05070F",
          900: "#0A0E1E",
          800: "#10172F",
          700: "#1A2348",
        },
        // Primary action color (electric indigo -> violet gradients).
        brand: {
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
        grape: {
          300: "#D8B4FE",
          400: "#C084FC",
          500: "#A855F7",
          600: "#9333EA",
        },
        // Champion gold.
        gold: {
          300: "#FFD976",
          400: "#FFC53D",
          500: "#F0A90A",
          600: "#C8880A",
        },
        // The four answer colors (solid bases; tiles use gradients on top).
        answer: {
          red: "#E8385D",
          blue: "#2D7FF9",
          yellow: "#F0A90A",
          green: "#1FAB54",
        },
      },
      fontFamily: {
        sans: ["var(--font-instrument)", "system-ui", "sans-serif"],
        display: ["var(--font-bricolage)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Glassy card: hairline top highlight + deep soft drop.
        card: "inset 0 1px 0 0 rgb(255 255 255 / 0.06), 0 16px 40px -16px rgb(0 0 0 / 0.6)",
        "glow-brand": "0 0 44px -10px rgb(99 102 241 / 0.55)",
        "glow-gold": "0 0 52px -12px rgb(255 197 61 / 0.5)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(var(--tw-rotate, 0))" },
          "50%": { transform: "translateY(-10px) rotate(var(--tw-rotate, 0))" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        "pop-in": "pop-in 0.25s ease-out",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
