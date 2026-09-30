import * as XLSX from "xlsx";
import { isAdmin } from "@/lib/auth";
import { listMeetings } from "@/lib/bookings";
import { buildIcs } from "@/lib/ics";
import { endTime, israelNow } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "upcoming";
  const format = url.searchParams.get("format") ?? "xlsx";
  const meetings = await listMeetings(scope, israelNow().date);
  const stamp = israelNow().date;

  if (format === "ics") {
    return new Response(buildIcs(meetings, { location: process.env.MEETING_LOCATION }), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="meetings-${stamp}.ics"`,
      },
    });
  }

  const rows = meetings.map((m) => ({
    תאריך: m.date,
    "שעת התחלה": m.time,
    "שעת סיום": endTime(m.time, m.duration),
    "משך (דקות)": m.duration,
    שם: m.fullName,
    פרויקט: m.project,
    דירה: m.apartment,
    טלפון: m.phone,
    אימייל: m.email,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [12, 12, 12, 12, 22, 24, 8, 14, 28].map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  book.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(book, sheet, "פגישות");
  const buf = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="meetings-${stamp}.xlsx"`,
    },
  });
}
