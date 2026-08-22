/* Game store — lives ABOVE the router in _layout, so it survives every page
   navigation. The DB is read EXACTLY ONCE per session (refreshProfile, called
   by the Load screen); everything after that reads from memory and syncs to
   the DB with writes (patchProfile + server POST/PATCH later). */
import React, { createContext, useCallback, useContext, useState } from "react";
import { Platform } from "react-native";
import { api } from "./api";

/* Session cache — survives page reloads within the tab, so the UI NEVER
   bounces through Load again mid-session. Cleared on logout. */
const SKEY = "pacify_profile_v1";
const web = Platform.OS === "web";

function hydrate(): ProfileData | null {
  if (!web || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SKEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(d: ProfileData | null) {
  if (!web || typeof window === "undefined") return;
  try {
    if (d) window.sessionStorage.setItem(SKEY, JSON.stringify(d));
    else window.sessionStorage.removeItem(SKEY);
  } catch {}
}

export type ProfileData = {
  username: string | null;
  email: string | null;
  nameSource: string | null;
  memberSince: string;
  lastSeenAt: string;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  played: number;
  winRate: number;
  pacified: number;
  clearedStudents: number[];
};

type GameCtx = {
  profile: ProfileData | null;
  /** THE one-time read. Called by /load only. */
  refreshProfile: () => Promise<ProfileData>;
  /** optimistic local update; pair with a write request when gameplay exists */
  patchProfile: (patch: Partial<ProfileData>) => void;
  clearProfile: () => void;
};

const Ctx = createContext<GameCtx>(null as any);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(() => hydrate());

  const refreshProfile = useCallback(async () => {
    const d = await api("/auth/profile");
    setProfile(d);
    persist(d as ProfileData);
    return d as ProfileData;
  }, []);

  const patchProfile = useCallback((patch: Partial<ProfileData>) => {
    setProfile((p) => {
      if (!p) return p;
      const next = { ...p, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    persist(null);
  }, []);

  return <Ctx.Provider value={{ profile, refreshProfile, patchProfile, clearProfile }}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
