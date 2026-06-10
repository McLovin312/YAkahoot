import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Display font (headings, buttons, the PIN) — expressive and confident.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
});

// Body font — clean and highly readable.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Lakeside Trivia Night",
  description:
    "A live Kahoot-style trivia game for Lakeside YA — three rounds, one champion.",
};

export const viewport: Viewport = {
  themeColor: "#0A0E1E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      <body className="font-sans">
        <div className="stage-noise" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
