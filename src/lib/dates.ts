/**
 * Calendar dates are plain "YYYY-MM-DD" strings (ISODate) — no timezones, no
 * Date-object drift. Wall-clock instants in the property's timezone are
 * converted explicitly with zonedTimeToUtc().
 */
export type ISODate = string;

const RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== "string" || !RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const toUTC = (d: ISODate) => new Date(d + "T00:00:00Z");
const fromUTC = (d: Date): ISODate => d.toISOString().slice(0, 10);

export function addDays(d: ISODate, n: number): ISODate {
  const x = toUTC(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUTC(x);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** Dates from start (inclusive) to end (exclusive). */
export function eachDate(start: ISODate, endExclusive: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = start; d < endExclusive; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's calendar date in the given IANA timezone. */
export function todayInTz(tz: string, now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Offset (ms) of `tz` from UTC at instant `at`. */
function tzOffsetMs(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUTC - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant for wall-clock `date` + `time` ("HH:mm") in `tz`. */
export function zonedTimeToUtc(date: ISODate, time: string, tz: string): Date {
  const [h, m] = time.split(":").map(Number);
  const guess = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, m);
  const offset = tzOffsetMs(tz, new Date(guess));
  const result = new Date(guess - offset);
  // Re-check once in case the offset differs at the corrected instant (DST zones).
  const offset2 = tzOffsetMs(tz, result);
  return offset2 === offset ? result : new Date(guess - offset2);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** Human date, e.g. "Tue, 10 Nov". */
export function formatDate(d: ISODate, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) fmtCache.set(key, (f = new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" })));
  return f.format(toUTC(d));
}
