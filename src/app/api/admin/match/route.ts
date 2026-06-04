import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";

// Edit a fixture: fill in knockout teams once known, fix names, adjust kickoff.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { match_id } = body;
  if (!match_id) return NextResponse.json({ error: "Missing match." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.home_team === "string" && body.home_team.trim()) update.home_team = body.home_team.trim();
  if (typeof body.away_team === "string" && body.away_team.trim()) update.away_team = body.away_team.trim();
  if (typeof body.venue === "string") update.venue = body.venue.trim() || null;
  if (typeof body.kickoff === "string" && !Number.isNaN(Date.parse(body.kickoff))) {
    update.kickoff = new Date(body.kickoff).toISOString();
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await admin().from("matches").update(update).eq("id", match_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
