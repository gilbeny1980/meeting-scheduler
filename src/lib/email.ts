import type { Meeting } from "./bookings";
import { buildIcs } from "./ics";
import { BRAND } from "./brand";
import { endTime } from "./rules";

const dateHe = (date: string) =>
  new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sends the confirmation through Resend. Silently skipped when not configured; never throws. */
export async function sendConfirmation(m: Meeting): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return;
  const title = process.env.SITE_TITLE || BRAND.name;
  const location = process.env.MEETING_LOCATION || "";
  const when = `${dateHe(m.date)}, ${m.time}-${endTime(m.time, m.duration)}`;
  const body = `
    <div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6">
      <h2>הפגישה נקבעה בהצלחה</h2>
      <p>שלום ${html(m.fullName)},</p>
      <p><b>מועד:</b> ${html(when)} (${m.duration} דקות)<br>
      <b>פרויקט:</b> ${html(m.project)}, דירה ${html(m.apartment)}
      ${location ? `<br><b>מיקום:</b> ${html(location)}` : ""}</p>
      <p>מצורף קובץ להוספת הפגישה ליומן. לשינוי או ביטול יש ליצור קשר טלפוני: ${BRAND.phone}.</p>
      <p style="color:#5d5d61">${BRAND.name} · ${BRAND.tagline}</p>
    </div>`;
  const payload = (to: string[], subject: string) => ({
    from,
    to,
    subject,
    html: body,
    attachments: [
      { filename: "meeting.ics", content: Buffer.from(buildIcs([m], { location })).toString("base64") },
    ],
  });
  const send = async (p: object) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) console.error("Resend failed", res.status, await res.text());
  };
  try {
    await send(payload([m.email], `${title}: אישור פגישה ${m.date} ${m.time}`));
    const notify = process.env.ADMIN_NOTIFY_EMAIL;
    if (notify) await send(payload([notify], `פגישה חדשה: ${m.fullName} (${m.project}, דירה ${m.apartment}) ${m.date} ${m.time}`));
  } catch (e) {
    console.error("Confirmation email failed", e);
  }
}
