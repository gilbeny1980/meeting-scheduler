"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, checkPassword, isAdmin, sessionValue } from "@/lib/auth";
import { addProject, blockRange, cancelMeeting, setProjectActive, unblockRange } from "@/lib/bookings";
import { CLOSE_MIN, isValidDate, minToTime, OPEN_MIN, timeToMin } from "@/lib/rules";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800));
    return "סיסמה שגויה";
  }
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

export async function cancel(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await cancelMeeting(id);
  revalidatePath("/admin");
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (name) await addProject(name);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function toggleProject(formData: FormData) {
  await requireAdmin();
  await setProjectActive(Number(formData.get("id")), formData.get("active") === "1");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function block(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const endDate = String(formData.get("endDate") || date);
  const wholeDay = formData.get("wholeDay") === "on";
  const from = wholeDay ? minToTime(OPEN_MIN) : String(formData.get("from") ?? "");
  const to = wholeDay ? minToTime(CLOSE_MIN) : String(formData.get("to") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 100);
  if (!isValidDate(date) || !isValidDate(endDate) || endDate < date) return;
  if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to) || timeToMin(to) <= timeToMin(from)) return;
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if ((end.getTime() - start.getTime()) / 86_400_000 > 60) return;
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
    await blockRange(d.toISOString().slice(0, 10), from, to, note);
  }
  revalidatePath("/admin");
}

export async function unblock(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!isValidDate(date)) return;
  await unblockRange(date, String(formData.get("from")), String(formData.get("to")));
  revalidatePath("/admin");
}
