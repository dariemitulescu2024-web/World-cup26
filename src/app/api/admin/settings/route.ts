import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";
import { getSettings, recomputeEntries } from "@/lib/recompute";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = await getSettings();

  const update: Record<string, unknown> = {};
  let goldenChanged = false;
  if (typeof body.join_code === "string" && body.join_code.trim()) update.join_code = body.join_code.trim();
  if (typeof body.tournament_locked === "boolean") update.tournament_locked = body.tournament_locked;
  if (typeof body.golden_boot_result === "string") {
    update.golden_boot_result = body.golden_boot_result.trim() || null;
    goldenChanged = true;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await admin().from("settings").update(update).eq("id", current.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (goldenChanged) await recomputeEntries();
  return NextResponse.json({ ok: true });
}
