import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { admin } from "./supabaseAdmin";
import { Player } from "./types";

export const PLAYER_COOKIE = "wc_token";
export const ADMIN_COOKIE = "wc_admin";

export function newToken(): string {
  return randomBytes(24).toString("hex");
}

/** Deterministic admin cookie value derived from the configured password. */
export function adminHash(): string {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "wc-default-secret";
  return createHash("sha256").update(`${secret}:${pw}`).digest("hex");
}

/** Salted hash of a player's PIN (we never store the raw PIN). */
export function pinHash(name: string, pin: string): string {
  const secret = process.env.SESSION_SECRET ?? "wc-default-secret";
  return createHash("sha256")
    .update(`${secret}:${name.trim().toLowerCase()}:${pin}`)
    .digest("hex");
}

/** The player tied to the current request's cookie, or null. */
export async function currentPlayer(): Promise<Player | null> {
  const token = (await cookies()).get(PLAYER_COOKIE)?.value;
  if (!token) return null;
  const { data } = await admin()
    .from("players")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as Player) ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!v && v === adminHash();
}
