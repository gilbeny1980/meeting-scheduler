// Pure scheduling rules. All dates/times are Israel wall-clock strings:
//   date  = "YYYY-MM-DD"
//   time  = "HH:MM"
//   slot  = "YYYY-MM-DDTHH:MM" (a 30 minute block)
import { HebrewCalendar, flags } from "@hebcal/core";

export const TZ = "Asia/Jerusalem";
export const OPEN_MIN = 10 * 60;
export const CLOSE_MIN = 17 * 60;
export const STEP = 30;
export const DURATIONS = [30, 60] as const;
export type Duration = (typeof DURATIONS)[number];
export const MAX_DAYS_AHEAD = 60;
export const MIN_LEAD_HOURS = 24;

const pad = (n: number) => String(n).padStart(2, "0");

export function isDuration(v: unknown): v is Duration {
  return v === 30 || v === 60;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Current Israel wall-clock time, independent of the server time zone. */
export function israelNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// ---------- Holidays ----------

const holidayCache = new Map<number, Map<string, string>>();

/** Days off: yom tov days, the day before each of them (erev chag) and Independence Day. */
function holidaysForYear(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const map = new Map<string, string>();
  const events = HebrewCalendar.calendar({
    start: new Date(year, 0, 1),
    end: new Date(year + 1, 0, 2),
    il: true,
    noMinorFast: true,
    noModern: false,
    noRoshChodesh: true,
    noSpecialShabbat: true,
  });
  for (const ev of events) {
    const g = ev.getDate().greg();
    const date = `${g.getFullYear()}-${pad(g.getMonth() + 1)}-${pad(g.getDate())}`;
    const isChag = (ev.getFlags() & flags.CHAG) !== 0;
    const isIndependence = ev.getDesc() === "Yom HaAtzma'ut";
    if (isChag || isIndependence) {
      const name = ev.render("he");
      if (!map.has(date)) map.set(date, name);
      if (isChag) {
        const eve = addDays(date, -1);
        if (!map.has(eve)) map.set(eve, `ערב ${name}`);
      }
    }
  }
  holidayCache.set(year, map);
  return map;
}

/** Hebrew name of the holiday (or erev chag) on this date, if any. */
export function holidayName(date: string): string | null {
  const year = Number(date.slice(0, 4));
  return holidaysForYear(year).get(date) ?? holidaysForYear(year + 1).get(date) ?? holidaysForYear(year - 1).get(date) ?? null;
}

/** Sunday-Thursday and not a holiday / erev chag. */
export function isWorkingDay(date: string): boolean {
  const wd = weekday(date);
  if (wd === 5 || wd === 6) return false;
  return holidayName(date) === null;
}

// ---------- Slots ----------

export function slotOf(date: string, time: string): string {
  return `${date}T${time}`;
}

/** Start times (HH:MM) that fit a meeting of `duration` inside working hours. */
export function startTimes(duration: Duration): string[] {
  const out: string[] = [];
  for (let m = OPEN_MIN; m + duration <= CLOSE_MIN; m += STEP) out.push(minToTime(m));
  return out;
}

/** The 30 minute slots occupied by a meeting. */
export function slotsFor(date: string, time: string, duration: Duration): string[] {
  const start = timeToMin(time);
  const out: string[] = [];
  for (let m = start; m < start + duration; m += STEP) out.push(slotOf(date, minToTime(m)));
  return out;
}

export function endTime(time: string, duration: number): string {
  return minToTime(timeToMin(time) + duration);
}

/** Earliest and latest bookable dates, given "now". */
export function bookingWindow(now: Date = new Date()): { first: string; last: string } {
  const n = israelNow(now);
  return { first: n.date, last: addDays(n.date, MAX_DAYS_AHEAD) };
}

/** Whether a start time may be booked at all by rule (ignoring already taken slots). */
export function isBookable(date: string, time: string, duration: Duration, now: Date = new Date()): boolean {
  if (!isValidDate(date)) return false;
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  if (!startTimes(duration).includes(time)) return false;
  if (!isWorkingDay(date)) return false;
  const { first, last } = bookingWindow(now);
  if (date < first || date > last) return false;
  // Lead time, compared as wall-clock values.
  const n = israelNow(now);
  const nowWall = Date.parse(`${n.date}T00:00:00Z`) + n.minutes * 60_000;
  const slotWall = Date.parse(`${date}T00:00:00Z`) + timeToMin(time) * 60_000;
  return slotWall - nowWall >= MIN_LEAD_HOURS * 3_600_000;
}

/** Rule-allowed start times for a date (ignoring taken slots). */
export function candidateTimes(date: string, duration: Duration, now: Date = new Date()): string[] {
  return startTimes(duration).filter((t) => isBookable(date, t, duration, now));
}

// ---------- Israel wall-clock -> UTC (for calendar files) ----------

function offsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60_000);
}

export function israelToUtc(date: string, time: string): Date {
  const wall = Date.parse(`${date}T${time}:00Z`);
  let utc = wall - offsetMinutes(wall) * 60_000;
  utc = wall - offsetMinutes(utc) * 60_000;
  return new Date(utc);
}
