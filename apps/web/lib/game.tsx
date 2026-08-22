/* Game store — lives ABOVE the router in _layout, so it survives every page
   navigation. The DB is read EXACTLY ONCE per session (refreshProfile, called
   by the Load screen); everything after that reads from memory and syncs to
   the DB with writes (patchProfile + server POST/PATCH later). */
import React, { createContext, useCallback, useContext, useState } from "react";
import { api } from "./api";

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
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const refreshProfile = useCallback(async () => {
    const d = await api("/auth/profile");
    setProfile(d);
    return d as ProfileData;
  }, []);

  const patchProfile = useCallback((patch: Partial<ProfileData>) => {
    setProfile((p) => (p ? { ...p, ...patch } : p));
  }, []);

  const clearProfile = useCallback(() => setProfile(null), []);

  return <Ctx.Provider value={{ profile, refreshProfile, patchProfile, clearProfile }}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
