import { randomBytes } from "crypto";
import { getDb } from "./db";
import {
  addDays,
  bookingWindow,
  candidateTimes,
  endTime,
  isBookable,
  isDuration,
  isValidDate,
  isWorkingDay,
  minToTime,
  OPEN_MIN,
  CLOSE_MIN,
  STEP,
  slotOf,
  slotsFor,
  timeToMin,
  type Duration,
} from "./rules";

export type Meeting = {
  id: number;
  token: string;
  date: string;
  time: string;
  duration: number;
  fullName: string;
  project: string;
  apartment: string;
  phone: string;
  email: string;
  createdAt: string;
};

function toMeeting(r: Record<string, unknown>): Meeting {
  return {
    id: Number(r.id),
    token: String(r.token),
    date: String(r.date),
    time: String(r.time),
    duration: Number(r.duration),
    fullName: String(r.full_name),
    project: String(r.project),
    apartment: String(r.apartment),
    phone: String(r.phone),
    email: String(r.email),
    createdAt: String(r.created_at),
  };
}

// ---------- Projects ----------

export async function listProjects(activeOnly = true): Promise<{ id: number; name: string; active: boolean }[]> {
  const db = await getDb();
  const rs = await db.execute(
    `SELECT id, name, active FROM projects ${activeOnly ? "WHERE active = 1" : ""} ORDER BY sort, id`,
  );
  return rs.rows.map((r) => ({ id: Number(r.id), name: String(r.name), active: Number(r.active) === 1 }));
}

export async function addProject(name: string) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO projects (name, sort) VALUES (?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM projects))
          ON CONFLICT(name) DO UPDATE SET active = 1`,
    args: [name],
  });
}

export async function setProjectActive(id: number, active: boolean) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE projects SET active = ? WHERE id = ?", args: [active ? 1 : 0, id] });
}

// ---------- Availability ----------

/** Free start times per date for the whole booking window. Only dates with at least one free time are returned. */
export async function availability(duration: Duration): Promise<Record<string, string[]>> {
  const db = await getDb();
  const { first, last } = bookingWindow();
  const taken = await db.execute({
    sql: "SELECT slot FROM slots WHERE slot >= ? AND slot <= ?",
    args: [`${first}T00:00`, `${last}T23:59`],
  });
  const takenSet = new Set(taken.rows.map((r) => String(r.slot)));
  const out: Record<string, string[]> = {};
  for (let date = first; date <= last; date = addDays(date, 1)) {
    if (!isWorkingDay(date)) continue;
    const free = candidateTimes(date, duration).filter((t) =>
      slotsFor(date, t, duration).every((s) => !takenSet.has(s)),
    );
    if (free.length) out[date] = free;
  }
  return out;
}

// ---------- Booking ----------

export type BookingInput = {
  date: string;
  time: string;
  duration: number;
  fullName: string;
  project: string;
  apartment: string;
  phone: string;
  email: string;
};

export type BookingResult = { ok: true; token: string } | { ok: false; error: string; slotTaken?: boolean };

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function createMeeting(input: BookingInput): Promise<BookingResult> {
  const fullName = clean(input.fullName, 80);
  const apartment = clean(input.apartment, 20);
  const phone = clean(input.phone, 20);
  const email = clean(input.email, 120);
  const project = clean(input.project, 120);

  if (fullName.length < 2) return { ok: false, error: "נא להזין שם מלא" };
  if (!apartment) return { ok: false, error: "נא להזין מספר דירה" };
  if (!/^\+?[\d\-\s]{9,15}$/.test(phone) || phone.replace(/\D/g, "").length < 9)
    return { ok: false, error: "מספר הטלפון אינו תקין" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "כתובת האימייל אינה תקינה" };
  if (!isDuration(input.duration)) return { ok: false, error: "משך הפגישה אינו תקין" };
  const duration = input.duration;

  const projects = await listProjects(true);
  if (!projects.some((p) => p.name === project)) return { ok: false, error: "נא לבחור פרויקט מהרשימה" };

  if (!isValidDate(input.date) || !isBookable(input.date, input.time, duration)) {
    return { ok: false, error: "המועד שנבחר אינו זמין. נא לבחור מועד אחר", slotTaken: true };
  }

  const db = await getDb();
  const token = randomBytes(16).toString("hex");
  const slots = slotsFor(input.date, input.time, duration);
  try {
    await db.batch(
      [
        {
          sql: `INSERT INTO meetings (token, date, time, duration, full_name, project, apartment, phone, email, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [token, input.date, input.time, duration, fullName, project, apartment, phone, email, new Date().toISOString()],
        },
        ...slots.map((slot) => ({
          sql: "INSERT INTO slots (slot, meeting_id) VALUES (?, (SELECT id FROM meetings WHERE token = ?))",
          args: [slot, token],
        })),
      ],
      "write",
    );
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/UNIQUE|PRIMARY KEY|constraint/i.test(msg)) {
      return { ok: false, error: "המועד כבר נתפס על ידי מישהו אחר. נא לבחור מועד אחר", slotTaken: true };
    }
    throw e;
  }
  return { ok: true, token };
}

// ---------- Meetings (admin / confirmation) ----------

export async function getMeetingByToken(token: string): Promise<Meeting | null> {
  const db = await getDb();
  const rs = await db.execute({ sql: "SELECT * FROM meetings WHERE token = ?", args: [token] });
  return rs.rows[0] ? toMeeting(rs.rows[0]) : null;
}

export async function listMeetings(scope: "upcoming" | "all", fromDate: string): Promise<Meeting[]> {
  const db = await getDb();
  const rs =
    scope === "upcoming"
      ? await db.execute({ sql: "SELECT * FROM meetings WHERE date >= ? ORDER BY date, time", args: [fromDate] })
      : await db.execute("SELECT * FROM meetings ORDER BY date, time");
  return rs.rows.map(toMeeting);
}

/** Cancelling deletes the meeting and frees its slots. */
export async function cancelMeeting(id: number) {
  const db = await getDb();
  await db.batch(
    [
      { sql: "DELETE FROM slots WHERE meeting_id = ?", args: [id] },
      { sql: "DELETE FROM meetings WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

// ---------- Admin blocks ----------

export type BlockRange = { date: string; from: string; to: string; note: string };

export async function blockRange(date: string, from: string, to: string, note: string) {
  const start = Math.max(timeToMin(from), OPEN_MIN);
  const end = Math.min(timeToMin(to), CLOSE_MIN);
  const stmts = [];
  for (let m = start; m < end; m += STEP) {
    stmts.push({
      sql: "INSERT OR IGNORE INTO slots (slot, meeting_id, note) VALUES (?, NULL, ?)",
      args: [slotOf(date, minToTime(m)), note],
    });
  }
  if (!stmts.length) return;
  const db = await getDb();
  await db.batch(stmts, "write");
}

export async function unblockRange(date: string, from: string, to: string) {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM slots WHERE meeting_id IS NULL AND slot >= ? AND slot < ?",
    args: [slotOf(date, from), slotOf(date, to)],
  });
}

/** Admin blocks grouped into contiguous ranges per day. */
export async function listBlocks(fromDate: string): Promise<BlockRange[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT slot, COALESCE(note, '') AS note FROM slots WHERE meeting_id IS NULL AND slot >= ? ORDER BY slot",
    args: [`${fromDate}T00:00`],
  });
  const out: BlockRange[] = [];
  for (const r of rs.rows) {
    const slot = String(r.slot);
    const date = slot.slice(0, 10);
    const time = slot.slice(11);
    const note = String(r.note);
    const last = out[out.length - 1];
    if (last && last.date === date && last.to === time && last.note === note) {
      last.to = endTime(time, STEP);
    } else {
      out.push({ date, from: time, to: endTime(time, STEP), note });
    }
  }
  return out;
}
