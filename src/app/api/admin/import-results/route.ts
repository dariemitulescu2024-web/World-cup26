import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { importResults } from "@/lib/importResults";

export const maxDuration = 60;

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const result = await importResults();
  return NextResponse.json(result);
}
