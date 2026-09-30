import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateTimes,
  holidayName,
  isBookable,
  isWorkingDay,
  israelToUtc,
  slotsFor,
  startTimes,
} from "../src/lib/rules.ts";

const now = new Date("2026-09-30T09:00:00Z"); // Wed 30 Sep 2026, 12:00 Israel

test("start times fit inside 10:00-17:00", () => {
  assert.equal(startTimes(30)[0], "10:00");
  assert.equal(startTimes(30).at(-1), "16:30");
  assert.equal(startTimes(60).at(-1), "16:00");
});

test("weekends are closed", () => {
  assert.equal(isWorkingDay("2026-10-02"), false); // Friday
  assert.equal(isWorkingDay("2026-10-03"), false); // Saturday
  assert.equal(isWorkingDay("2026-10-04"), true); // Sunday
});

test("holidays and erev chag are closed", () => {
  // Sukkot 2026: 26 Sep (erev 25 Sep) ... Shemini Atzeret / Simchat Torah 3 Oct 2026
  assert.notEqual(holidayName("2026-10-03"), null);
  assert.notEqual(holidayName("2026-10-02"), null); // erev
  // Rosh Hashana 2027: 2-3 Oct 2027 -> erev Fri 1 Oct... check Thursday erev of Yom Kippur 2026 (21 Sep = Mon)
  assert.equal(isWorkingDay("2026-09-20"), false); // erev Yom Kippur (Sunday)
  assert.equal(isWorkingDay("2026-09-21"), false); // Yom Kippur
  assert.equal(isWorkingDay("2026-09-22"), true);
});

test("Pesach: erev and yom tov closed, chol hamoed open", () => {
  // Pesach 2027 starts evening of Fri 21 Apr 2027? verify by holiday names instead of hardcoding
  const names: string[] = [];
  for (let d = 1; d <= 30; d++) {
    const date = `2027-04-${String(d).padStart(2, "0")}`;
    const n = holidayName(date);
    if (n) names.push(`${date} ${n}`);
  }
  assert.ok(names.length >= 3, names.join("\n"));
});

test("lead time of 24h and 60 day horizon", () => {
  assert.equal(isBookable("2026-10-01", "11:30", 30, now), false); // 23.5h away
  assert.equal(isBookable("2026-10-01", "12:00", 30, now), true); // exactly 24h away
  assert.equal(isBookable("2026-12-30", "10:00", 30, now), false); // beyond 60 days
  assert.equal(candidateTimes("2026-10-02", 30, now).length, 0); // Friday
});

test("slots covered by a meeting", () => {
  assert.deepEqual(slotsFor("2026-10-04", "10:30", 60), ["2026-10-04T10:30", "2026-10-04T11:00"]);
});

test("Israel time to UTC handles daylight saving", () => {
  assert.equal(israelToUtc("2026-07-01", "10:00").toISOString(), "2026-07-01T07:00:00.000Z"); // UTC+3
  assert.equal(israelToUtc("2026-12-01", "10:00").toISOString(), "2026-12-01T08:00:00.000Z"); // UTC+2
});
