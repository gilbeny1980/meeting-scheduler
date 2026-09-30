import { listProjects } from "@/lib/bookings";
import { MAX_DAYS_AHEAD, MIN_LEAD_HOURS } from "@/lib/rules";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = (await listProjects(true)).map((p) => p.name);
  const title = process.env.SITE_TITLE || "קביעת פגישה";
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-muted">
        בחרו משך פגישה, תאריך ושעה, ומלאו את הפרטים. ניתן לקבוע פגישה בימים א׳–ה׳ בין 10:00 ל-17:00, לפחות {MIN_LEAD_HOURS} שעות מראש
        ועד {MAX_DAYS_AHEAD} ימים קדימה.
      </p>
      <BookingForm projects={projects} />
    </main>
  );
}
