import { NextRequest, NextResponse } from "next/server";
import { importResults } from "@/lib/importResults";

export const maxDuration = 60;

// Triggered by the Vercel cron schedule in vercel.json. When CRON_SECRET is set,
// Vercel sends it as a Bearer token; we reject anything else so the public can't
// trigger imports.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const result = await importResults();
  return NextResponse.json(result);
}
