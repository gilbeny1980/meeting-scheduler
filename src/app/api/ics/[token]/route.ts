import { getMeetingByToken } from "@/lib/bookings";
import { buildIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await getMeetingByToken(token);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(buildIcs([m], { location: process.env.MEETING_LOCATION }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meeting.ics"',
    },
  });
}
