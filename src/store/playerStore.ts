"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Player-side identity store (persisted for session recovery).
 *
 * Only the *identity* (PIN, username, device id, joined flag) is persisted so
 * that a page refresh can transparently re-join the same game. Transient
 * gameplay UI state (current question, selected answer, leaderboard) lives in
 * React component state and is intentionally NOT persisted.
 */
interface PlayerStore {
  pin: string;
  username: string;
  /** Stable per-device id; generated once and reused across refreshes. */
  clientId: string;
  joined: boolean;

  setIdentity: (pin: string, username: string) => void;
  setJoined: (joined: boolean) => void;
  leave: () => void;
}

/** Generate a reasonably unique device id. */
function makeClientId(): string {
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).slice(0, 16);
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      pin: "",
      username: "",
      clientId: "",
      joined: false,

      setIdentity: (pin, username) => {
        // Reuse an existing clientId if we already have one.
        const clientId = get().clientId || makeClientId();
        set({ pin, username, clientId });
      },

      setJoined: (joined) => set({ joined }),

      leave: () => set({ pin: "", username: "", joined: false }),
    }),
    {
      name: "lakeside-player",
      // Keep clientId stable even after leaving (so the same device is known).
      partialize: (s) => ({
        pin: s.pin,
        username: s.username,
        clientId: s.clientId,
        joined: s.joined,
      }),
    }
  )
);
