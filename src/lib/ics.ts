import { endTime, israelToUtc } from "./rules";
import type { Meeting } from "./bookings";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function fold(line: string): string {
  // RFC 5545: fold lines longer than 75 octets (never inside a multi-byte character).
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (parts.length ? 72 : 74)) {
      parts.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

export function meetingSubject(m: Meeting): string {
  return `פגישה: ${m.fullName} - ${m.project} דירה ${m.apartment}`;
}

export function buildIcs(meetings: Meeting[], opts: { location?: string; host?: string } = {}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//meeting-scheduler//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-TIMEZONE:Asia/Jerusalem",
  ];
  for (const m of meetings) {
    const start = israelToUtc(m.date, m.time);
    const end = israelToUtc(m.date, endTime(m.time, m.duration));
    const description = [
      `שם: ${m.fullName}`,
      `פרויקט: ${m.project}`,
      `דירה: ${m.apartment}`,
      `טלפון: ${m.phone}`,
      `אימייל: ${m.email}`,
    ].join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.token}@${opts.host ?? "meeting-scheduler"}`,
      `DTSTAMP:${stamp(new Date(m.createdAt))}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(meetingSubject(m))}`,
      `DESCRIPTION:${esc(description)}`,
    );
    if (opts.location) lines.push(`LOCATION:${esc(opts.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
