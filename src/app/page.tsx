import { listProjects } from "@/lib/bookings";
import { BRAND } from "@/lib/brand";
import { MAX_DAYS_AHEAD, MIN_LEAD_HOURS } from "@/lib/rules";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = (await listProjects(true)).map((p) => p.name);
  return (
    <>
      <section className="bg-brand text-brand-ink">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pb-20 sm:pt-14">
          <p className="text-xs uppercase tracking-[0.3em] opacity-60" dir="ltr">
            {BRAND.tagline}
          </p>
          <h1 className="mt-3 text-3xl font-light leading-tight sm:text-5xl">
            קביעת פגישה
            <br />
            <span className="font-bold">עם {BRAND.name}</span>
          </h1>
          <p className="mt-4 max-w-xl text-base opacity-80 sm:text-lg">
            בחרו משך פגישה, תאריך ושעה ומלאו את הפרטים. הפגישות מתקיימות בימים א׳–ה׳ בין 10:00 ל-17:00, לפחות {MIN_LEAD_HOURS} שעות
            מראש ועד {MAX_DAYS_AHEAD} ימים קדימה.
          </p>
        </div>
      </section>
      <main className="mx-auto -mt-8 max-w-3xl px-4">
        <BookingForm projects={projects} />
      </main>
    </>
  );
}
