import { NextResponse } from "next/server";
import { availability } from "@/lib/bookings";
import { isDuration } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const duration = Number(new URL(req.url).searchParams.get("duration"));
  if (!isDuration(duration)) return NextResponse.json({ error: "bad duration" }, { status: 400 });
  return NextResponse.json({ days: await availability(duration) }, { headers: { "Cache-Control": "no-store" } });
}
