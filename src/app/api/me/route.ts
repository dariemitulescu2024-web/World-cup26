import { NextResponse } from "next/server";
import { currentPlayer } from "@/lib/session";

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ player: null });
  return NextResponse.json({ player: { id: player.id, name: player.name } });
}
