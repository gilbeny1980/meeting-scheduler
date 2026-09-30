import { createClient, type Client } from "@libsql/client";

const globalForDb = globalThis as unknown as { db?: Client; dbReady?: Promise<void> };

function client(): Client {
  if (!globalForDb.db) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url || url.startsWith("file:")) {
      throw new Error("TURSO_DATABASE_URL must be a remote libsql:// address. Set it (and TURSO_AUTH_TOKEN) in the environment variables, then redeploy.");
    }
    globalForDb.db = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return globalForDb.db;
}

const DEFAULT_PROJECTS = ["פרויקט לדוגמה א'", "פרויקט לדוגמה ב'"];

async function init(db: Client) {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        project TEXT NOT NULL,
        apartment TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      // One row per occupied 30 minute slot. The primary key makes double booking impossible.
      // meeting_id NULL = blocked by the admin.
      `CREATE TABLE IF NOT EXISTS slots (
        slot TEXT PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id),
        note TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS meetings_date ON meetings(date, time)`,
    ],
    "write",
  );
  const count = await db.execute("SELECT COUNT(*) AS c FROM projects");
  if (Number(count.rows[0].c) === 0) {
    await db.batch(
      DEFAULT_PROJECTS.map((name, i) => ({
        sql: "INSERT OR IGNORE INTO projects (name, sort) VALUES (?, ?)",
        args: [name, i],
      })),
      "write",
    );
  }
}

/** Returns a ready database client (creates the tables on first use). */
export async function getDb(): Promise<Client> {
  const db = client();
  if (!globalForDb.dbReady) {
    globalForDb.dbReady = init(db).catch((e) => {
      globalForDb.dbReady = undefined;
      throw e;
    });
  }
  await globalForDb.dbReady;
  return db;
}
