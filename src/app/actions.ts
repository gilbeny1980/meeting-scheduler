"use server";

import { after } from "next/server";
import { createMeeting, getMeetingByToken, type BookingInput, type BookingResult } from "@/lib/bookings";
import { sendConfirmation } from "@/lib/email";

export async function bookMeeting(input: BookingInput & { website?: string }): Promise<BookingResult> {
  // Honeypot: real users never fill this hidden field.
  if (input.website) return { ok: false, error: "שגיאה. נא לנסות שוב" };
  const result = await createMeeting(input);
  if (result.ok) {
    after(async () => {
      const meeting = await getMeetingByToken(result.token);
      if (meeting) await sendConfirmation(meeting);
    });
  }
  return result;
}
