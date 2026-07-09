import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const WEEK_STARTS_ON = 1; // Monday

/** Local-timezone day key used to group posts by calendar day. */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * All days shown for a month view — full weeks (Mon–Sun) covering the month,
 * including leading/trailing days from the adjacent months.
 */
export function buildMonthGrid(month: Date): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
  });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}
