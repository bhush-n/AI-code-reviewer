import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";

export type Grouped<T> = {
  Today: T[];
  Yesterday: T[];
  "This week": T[];
  Older: T[];
};

export function groupByDate<T extends { created_at: string }>(
  items: T[],
  now: Date = new Date()
): Grouped<T> {
  const groups: Grouped<T> = { Today: [], Yesterday: [], "This week": [], Older: [] };
  for (const item of items) {
    const d = new Date(item.created_at);
    if (isToday(d) || differenceInCalendarDays(now, d) === 0) groups.Today.push(item);
    else if (isYesterday(d) || differenceInCalendarDays(now, d) === 1)
      groups.Yesterday.push(item);
    else if (differenceInCalendarDays(now, d) <= 7) groups["This week"].push(item);
    else groups.Older.push(item);
  }
  return groups;
}
