import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { lockOdds } from "@/lib/lockOdds";
import { recomputeAll } from "@/lib/recompute";

export const maxDuration = 60;

// One-time: lock current odds as the frozen scoring basis (group W/D/L values +
// team championship values), then recompute.
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const result = await lockOdds();
  await recomputeAll();
  return NextResponse.json(result);
}
