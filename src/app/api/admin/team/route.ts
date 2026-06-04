import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";
import { recomputeEntries } from "@/lib/recompute";
import { RideRound } from "@/lib/types";

const ROUNDS: RideRound[] = ["group", "r32", "r16", "qf", "sf", "final", "champion"];

// Set a team's furthest knockout round + eliminated status (drives ride scoring).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").toString();
  if (!name) return NextResponse.json({ error: "Missing team." }, { status: 400 });
  const furthest: RideRound = ROUNDS.includes(body.furthest) ? body.furthest : "group";
  const eliminated = !!body.eliminated;

  const { error } = await admin().from("teams").update({ furthest, eliminated }).eq("name", name);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recomputeEntries();
  return NextResponse.json({ ok: true });
}
