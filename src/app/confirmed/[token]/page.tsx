import { notFound } from "next/navigation";
import { getMeetingByToken } from "@/lib/bookings";
import { BRAND } from "@/lib/brand";
import { endTime } from "@/lib/rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "הפגישה נקבעה" };

export default async function Confirmed({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await getMeetingByToken(token);
  if (!m) notFound();
  const when = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${m.date}T00:00:00Z`));
  const location = process.env.MEETING_LOCATION;
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-lg border border-line bg-card p-7 shadow-sm">
        <div className="text-4xl text-ok" aria-hidden>
          ✓
        </div>
        <h1 className="mt-2 text-2xl font-bold">הפגישה נקבעה בהצלחה</h1>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted">מועד</dt>
          <dd className="font-semibold">
            {when}, {m.time}–{endTime(m.time, m.duration)}
          </dd>
          <dt className="text-muted">שם</dt>
          <dd>{m.fullName}</dd>
          <dt className="text-muted">פרויקט</dt>
          <dd>
            {m.project}, דירה {m.apartment}
          </dd>
          {location && (
            <>
              <dt className="text-muted">מיקום</dt>
              <dd>{location}</dd>
            </>
          )}
        </dl>
        <p className="mt-5 text-muted">אישור נשלח לכתובת {m.email}. לשינוי או ביטול יש ליצור קשר טלפוני: {BRAND.phone}.</p>
        <a className="btn mt-5 inline-block" href={`/api/ics/${m.token}`}>
          הוספה ליומן
        </a>
      </div>
    </main>
  );
}
