import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { refreshOdds } from "@/lib/odds";

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const result = await refreshOdds();
  return NextResponse.json(result);
}
