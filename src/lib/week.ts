import { addDays, startOfWeek } from "date-fns";
import { localDateString, parseLocalDate, toYmd } from "./utils";

/** Monday-or-whatever start of the week containing `ymd`, as YYYY-MM-DD. */
export function weekStartFor(ymd: string, weekStartsOn: number): string {
  return toYmd(startOfWeek(parseLocalDate(ymd), { weekStartsOn: (weekStartsOn % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6 }));
}

export function weekDays(start: string): string[] {
  const s = parseLocalDate(start);
  return Array.from({ length: 7 }, (_, i) => toYmd(addDays(s, i)));
}

export function shiftWeek(start: string, weeks: number): string {
  return toYmd(addDays(parseLocalDate(start), weeks * 7));
}

export const todaySG = () => localDateString(new Date(), "Asia/Singapore");
