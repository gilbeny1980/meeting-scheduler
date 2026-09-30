"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bookMeeting } from "./actions";

const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

type Days = Record<string, string[]>;

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function endTime(time: string, duration: number) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + duration;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export default function BookingForm({ projects }: { projects: string[] }) {
  const router = useRouter();
  const [duration, setDuration] = useState<30 | 60>(30);
  const [days, setDays] = useState<Days | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [form, setForm] = useState({ fullName: "", project: "", apartment: "", phone: "", email: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(d: 30 | 60) {
    setLoadError(false);
    try {
      const res = await fetch(`/api/availability?duration=${d}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { days: Days };
      setDays(data.days);
      return data.days;
    } catch {
      setLoadError(true);
      return null;
    }
  }

  useEffect(() => {
    setDays(null);
    setDate(null);
    setTime(null);
    load(duration).then((d) => {
      if (d) {
        const first = Object.keys(d).sort()[0];
        if (first) setView((v) => v ?? { y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 });
      }
    });
  }, [duration]);

  const allDates = useMemo(() => Object.keys(days ?? {}).sort(), [days]);
  const minView = allDates[0] ? { y: Number(allDates[0].slice(0, 4)), m: Number(allDates[0].slice(5, 7)) - 1 } : null;
  const maxView = allDates.at(-1) ? { y: Number(allDates.at(-1)!.slice(0, 4)), m: Number(allDates.at(-1)!.slice(5, 7)) - 1 } : null;
  const idx = (v: { y: number; m: number }) => v.y * 12 + v.m;

  const cells = useMemo(() => {
    if (!view) return [];
    const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const out: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= count; d++) out.push(d);
    return out;
  }, [view]);

  function shift(delta: number) {
    if (!view) return;
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  }

  const times = date && days ? (days[date] ?? []) : [];
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return setError("נא לבחור תאריך ושעה");
    setBusy(true);
    setError(null);
    try {
      const res = await bookMeeting({ ...form, date, time, duration });
      if (res.ok) {
        router.push(`/confirmed/${res.token}`);
        return;
      }
      setError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (res.slotTaken) {
        setTime(null);
        await load(duration);
      }
    } catch {
      setError("אירעה שגיאה. נא לנסות שוב");
    }
    setBusy(false);
  }

  const card = "mt-4 rounded-lg border border-line bg-card p-5 shadow-sm sm:p-7";

  return (
    <form onSubmit={submit}>
      {error && (
        <p role="alert" className="mt-6 rounded-md border border-danger p-3 font-semibold text-danger">
          {error}
        </p>
      )}

      <section className={card}>
        <h2 className="text-lg font-bold">1. משך הפגישה</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([30, 60] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`rounded-md border px-4 py-3 text-lg font-semibold ${
                duration === d ? "border-brand bg-brand text-brand-ink" : "border-line hover:bg-brand-soft"
              }`}
              aria-pressed={duration === d}
            >
              {d === 30 ? "חצי שעה" : "שעה"}
            </button>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">2. תאריך</h2>
        {loadError && (
          <p className="mt-3 text-danger">
            טעינת המועדים נכשלה.{" "}
            <button type="button" className="underline" onClick={() => load(duration)}>
              נסו שוב
            </button>
          </p>
        )}
        {!days && !loadError && <p className="mt-3 text-muted">טוען מועדים פנויים...</p>}
        {days && allDates.length === 0 && <p className="mt-3 text-muted">אין כרגע מועדים פנויים.</p>}
        {days && view && allDates.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-1.5"
                onClick={() => shift(-1)}
                disabled={!minView || idx(view) <= idx(minView)}
                aria-label="חודש קודם"
              >
                →
              </button>
              <div className="font-semibold">
                {MONTHS[view.m]} {view.y}
              </div>
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-1.5"
                onClick={() => shift(1)}
                disabled={!maxView || idx(view) >= idx(maxView)}
                aria-label="חודש הבא"
              >
                ←
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm text-muted">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} />;
                const k = key(view.y, view.m, d);
                const available = Boolean(days[k]?.length);
                const selected = date === k;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setDate(k);
                      setTime(null);
                    }}
                    className={`aspect-square rounded-md text-base ${
                      selected
                        ? "bg-brand font-bold text-brand-ink"
                        : available
                          ? "border border-line font-semibold hover:bg-brand-soft"
                          : "text-muted opacity-40"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {date && (
        <section className={card}>
          <h2 className="text-lg font-bold">3. שעה · {longDate(date)}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {times.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                aria-pressed={time === t}
                className={`rounded-md border px-2 py-2.5 font-semibold ${
                  time === t ? "border-brand bg-brand text-brand-ink" : "border-line hover:bg-brand-soft"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {times.length === 0 && <p className="mt-3 text-muted">אין שעות פנויות בתאריך זה.</p>}
        </section>
      )}

      {date && time && (
        <section className={card}>
          <h2 className="text-lg font-bold">4. הפרטים שלכם</h2>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-muted">שם מלא</span>
              <input className="field" required autoComplete="name" value={form.fullName} onChange={set("fullName")} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted">פרויקט</span>
              <select className="field" required value={form.project} onChange={set("project")}>
                <option value="">בחרו פרויקט</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted">מספר דירה</span>
              <input className="field" required inputMode="numeric" value={form.apartment} onChange={set("apartment")} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted">טלפון</span>
              <input className="field" required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={set("phone")} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted">אימייל (לקבלת אישור)</span>
              <input className="field" required type="email" autoComplete="email" dir="ltr" value={form.email} onChange={set("email")} />
            </label>
            <input
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              value={form.website}
              onChange={set("website")}
            />
          </div>

          <p className="mt-5 rounded-md border-s-4 border-accent bg-brand-soft p-3">
            הפגישה: <b>{longDate(date)}</b>, {time}–{endTime(time, duration)} ({duration === 30 ? "חצי שעה" : "שעה"})
          </p>
          <button className="btn mt-4 w-full text-lg" disabled={busy}>
            {busy ? "קובע..." : "קביעת פגישה"}
          </button>
        </section>
      )}
    </form>
  );
}
