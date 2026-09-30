import { adminConfigured, isAdmin } from "@/lib/auth";
import { listBlocks, listMeetings, listProjects } from "@/lib/bookings";
import { endTime, holidayName, israelNow } from "@/lib/rules";
import { cancel, block, createProject, logout, toggleProject, unblock } from "./actions";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "ניהול פגישות" };

const fmt = (date: string) =>
  new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

export default async function Admin({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold">דף הניהול לא מוגדר</h1>
        <p className="mt-2 text-muted">יש להגדיר משתנה סביבה ADMIN_PASSWORD בהגדרות האתר.</p>
      </main>
    );
  }
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">ניהול פגישות</h1>
        <LoginForm />
      </main>
    );
  }

  const { scope: scopeParam } = await searchParams;
  const scope = scopeParam === "all" ? "all" : "upcoming";
  const today = israelNow().date;
  const [meetings, projects, blocks] = await Promise.all([listMeetings(scope, today), listProjects(false), listBlocks(today)]);
  const card = "mt-6 rounded-2xl border border-line bg-card p-4 sm:p-6";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניהול פגישות</h1>
        <form action={logout}>
          <button className="btn btn-ghost">יציאה</button>
        </form>
      </div>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            פגישות ({meetings.length}) · {scope === "all" ? "כל הפגישות" : "פגישות עתידיות"}
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <a className="btn btn-ghost !py-1.5" href={scope === "all" ? "/admin" : "/admin?scope=all"}>
              {scope === "all" ? "הצג עתידיות בלבד" : "הצג את כולן"}
            </a>
            <a className="btn !py-1.5" href={`/api/admin/export?format=xlsx&scope=${scope}`}>
              ייצוא לאקסל
            </a>
            <a className="btn btn-ghost !py-1.5" href={`/api/admin/export?format=ics&scope=${scope}`}>
              קובץ יומן (Outlook)
            </a>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">
          קובץ היומן (.ics) נפתח באאוטלוק ומוסיף את כל הפגישות ליומן בלחיצה אחת.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-start">
            <thead className="text-sm text-muted">
              <tr className="text-start">
                <th className="py-2 text-start">מועד</th>
                <th className="text-start">שם</th>
                <th className="text-start">פרויקט</th>
                <th className="text-start">דירה</th>
                <th className="text-start">טלפון</th>
                <th className="text-start">אימייל</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="py-2 whitespace-nowrap">
                    {fmt(m.date)}
                    <br />
                    <span className="text-muted">
                      {m.time}–{endTime(m.time, m.duration)}
                    </span>
                  </td>
                  <td>{m.fullName}</td>
                  <td>{m.project}</td>
                  <td>{m.apartment}</td>
                  <td dir="ltr" className="text-end">
                    <a href={`tel:${m.phone}`}>{m.phone}</a>
                  </td>
                  <td dir="ltr" className="text-end">
                    {m.email}
                  </td>
                  <td>
                    <form action={cancel}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-danger underline">ביטול</button>
                    </form>
                  </td>
                </tr>
              ))}
              {meetings.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted">
                    אין פגישות
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-semibold">חסימת מועדים</h2>
        <p className="mt-1 text-sm text-muted">חסימה מונעת מלקוחות לקבוע פגישה בטווח שנבחר. ימי שישי, שבת וחגים חסומים אוטומטית.</p>
        <form action={block} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-muted">מתאריך</span>
            <input className="field" type="date" name="date" min={today} required />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted">עד תאריך (אופציונלי)</span>
            <input className="field" type="date" name="endDate" min={today} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted">משעה</span>
            <input className="field" type="time" name="from" defaultValue="10:00" min="10:00" max="17:00" step={1800} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted">עד שעה</span>
            <input className="field" type="time" name="to" defaultValue="17:00" min="10:00" max="17:00" step={1800} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="wholeDay" /> יום שלם
          </label>
          <input className="field" name="note" placeholder="הערה (אופציונלי)" />
          <button className="btn sm:col-span-2">חסימה</button>
        </form>
        <ul className="mt-4 grid gap-2">
          {blocks.map((b) => (
            <li key={`${b.date}${b.from}`} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
              <span>
                {fmt(b.date)} · {b.from}–{b.to}
                {b.note && <span className="text-muted"> · {b.note}</span>}
                {holidayName(b.date) && <span className="text-muted"> · {holidayName(b.date)}</span>}
              </span>
              <form action={unblock}>
                <input type="hidden" name="date" value={b.date} />
                <input type="hidden" name="from" value={b.from} />
                <input type="hidden" name="to" value={b.to} />
                <button className="text-danger underline">הסרה</button>
              </form>
            </li>
          ))}
          {blocks.length === 0 && <li className="text-muted">אין חסימות</li>}
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-semibold">פרויקטים (רשימה נפתחת ללקוח)</h2>
        <form action={createProject} className="mt-3 flex gap-2">
          <input className="field" name="name" placeholder="שם פרויקט חדש" required />
          <button className="btn shrink-0">הוספה</button>
        </form>
        <ul className="mt-4 grid gap-2">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
              <span className={p.active ? "" : "text-muted line-through"}>{p.name}</span>
              <form action={toggleProject}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                <button className="underline">{p.active ? "הסתרה" : "החזרה"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
