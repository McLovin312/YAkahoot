# Lakeside Trivia Night

A live, **Kahoot-style trivia game** built for Lakeside YA game nights.
Questions show on the big screen; everyone answers on their phones.

**Four rounds:** Brainrot (25) · Bible (25 + bonus) · Random (20) · and a
**Championship** finals round (5 Lakeside-insider questions) where the winners
of the three regular rounds face off to crown the one true champion.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**,
**Zustand**, **Framer Motion**, and a realtime layer that needs
**zero configuration** for local play.

---

## 🚀 Play locally (no setup, no accounts)

```bash
npm install
npm run dev
```

Open <http://localhost:3000> on the host machine (the big screen):

1. Click **Host a game** → pick a round → the lobby shows a **PIN**, a
   **join URL** (your machine's Wi-Fi address, e.g. `192.168.1.23:3000`) and a
   **QR code**.
2. Players on the **same Wi-Fi** scan the QR (PIN pre-filled) or open the URL,
   enter the PIN + a name, and join.
3. Hit **Start game**. Answers, scores and the leaderboard sync live.

> 💡 First run on Windows: if a firewall prompt appears for Node.js, allow it
> on **Private networks** — that's what lets phones reach the host machine.
>
> 💡 To test alone, open the player page in a second browser window.

**How that works with no configuration:** when no Pusher credentials are set,
the app uses its **built-in realtime relay** — an in-memory broker on the dev
server that pushes events to every connected browser over Server-Sent Events.
Perfect for one machine + one Wi-Fi network. (`npm run build && npm start`
works the same way for a production-speed local server.)

---

## 🏆 Game-night format

1. Play the three regular rounds (**Brainrot**, **Bible**, **Random**) —
   anyone can join each round.
2. The **winner of each round** advances.
3. Run the **Championship** round with just those three winners — 5
   Lakeside-specific questions decide the true champion.

---

## ✨ Features

- 📱 **Host + Player split** — the question text lives only on the host
  screen; phones get **only the four colored shape buttons** (anti-cheat)
- 🔀 **Answer positions shuffle every game** — banks are authored
  "correct answer first" and shuffled at game creation, so there's no
  pattern to learn
- ⚡ **Realtime multiplayer** — zero-config local relay, or Pusher when deployed
- 📷 **QR-code join** with the PIN pre-filled
- 🏁 **Speed scoring** — correct answers earn 1000 → 500 pts, faster = more
- ⏱️ **20-second timer**, auto-advance when everyone has answered
- 🎛️ **Host controls** — pause, resume, skip, end, restart with same players
- 🥇 **Live leaderboard** with podium, champion screen with confetti
- 🛡️ **Anti-cheat** — one answer per question, unique usernames, refresh-safe
  reconnects (per-device id)
- 💾 **Session recovery** — host and players survive a page refresh
- 🔊 Sound effects generated at runtime (no audio files)
- ♿ Accessible, responsive, reduced-motion aware

---

## 🗂️ Project structure

```
src/
├── app/
│   ├── page.tsx                 # Landing (Host / Join)
│   ├── host/
│   │   ├── page.tsx             # Round selection (+ Championship finals)
│   │   └── game/page.tsx        # Host screen (lobby→question→results→podium)
│   ├── player/page.tsx          # Phone screen (join→answer→results)
│   └── api/
│       ├── game/event/route.ts  # Event relay (Pusher OR local broker)
│       ├── game/stream/route.ts # SSE stream for local realtime mode
│       └── host-info/route.ts   # LAN address for the join URL / QR
├── components/                  # AnswerTile, Timer, Leaderboard, Confetti…
├── data/
│   ├── topics.ts                # Round metadata + question lookup
│   └── questions/               # brainrot / bible / randomFacts / championship
├── lib/
│   ├── realtime/
│   │   ├── config.ts            # Transport selection (placeholder-aware)
│   │   ├── broker.ts            # In-memory pub/sub (local mode, server-side)
│   │   └── client.ts            # connectToGame() + publishEvent()
│   ├── pusher/server.ts         # Server Pusher instance (deployed mode)
│   ├── answers.ts               # The 4 shapes/colors
│   ├── score.ts                 # Speed scoring + leaderboard
│   └── utils.ts                 # PIN, shuffles, validation
└── store/
    ├── gameStore.ts             # Host authoritative state (Zustand, persisted)
    └── playerStore.ts           # Player identity (persisted)
```

### How it works

The **host browser is the single source of truth** — it owns the questions
(including correct answers), players and scores. Players never receive answer
data; question-start events carry **no question text and no correct answer**.

```
 Player phone                  Relay                       Host (big screen)
 ────────────                  ─────                       ─────────────────
 join / answer ──POST──▶ /api/game/event ──fan-out──▶ host computes scores
                          (Pusher or local SSE)            │
 question-start / results / game-end ◀── broadcast ────────┘
```

---

## ▲ Deploy (Vercel) — needs Pusher

The local relay lives in one server process, which serverless platforms don't
guarantee — so a deployed site uses [Pusher Channels](https://pusher.com/channels)
(free tier is plenty).

1. Create a free Pusher Channels app → copy the 4 values from **App Keys**.
2. Push this repo to GitHub, import it at <https://vercel.com/new>.
3. Add the env vars in **Project → Settings → Environment Variables**:

   | Key                          | Value                        |
   | ---------------------------- | ---------------------------- |
   | `PUSHER_APP_ID`              | _app id_                     |
   | `PUSHER_SECRET`              | _secret_                     |
   | `NEXT_PUBLIC_PUSHER_KEY`     | _key_                        |
   | `NEXT_PUBLIC_PUSHER_CLUSTER` | _cluster_ (e.g. `us2`)       |

4. Deploy. The app detects real credentials and switches to Pusher
   automatically (placeholders like `REPLACE_WITH_…` are ignored).

To test the Pusher path locally before deploying, put the same 4 values in
`.env.local` and restart — the status chip on the host screen will read
**Live** instead of **Live — local Wi-Fi**.

---

## 🎮 Editing questions

Question banks live in `src/data/questions/`. **Author the correct answer
first** — positions are shuffled automatically at game time:

```ts
{
  id: "bi-27",
  topic: "bible",
  question: "Your new question?",
  options: ["Correct answer", "Wrong", "Wrong", "Wrong"],
  correctIndex: 0, // always 0 in the data files
}
```

Add the object to the round's array — counts and game flow update on their own.

---

## 📜 Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Dev server (hot reload)                  |
| `npm run build` | Production build                         |
| `npm run start` | Run the production build                 |
| `npm run lint`  | ESLint                                   |
