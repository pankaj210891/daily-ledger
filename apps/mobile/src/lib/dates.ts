import {
  dateLabel,
  householdDateKey,
  householdMonthKey,
  money,
  monthBounds,
  monthTitle as sharedMonthTitle,
} from "@daily-ledger/shared";

export function monthKey(date = new Date()) {
  return householdMonthKey(date);
}
export { monthBounds, money };
export function todayKey(date = new Date()) {
  return householdDateKey(date);
}
export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + delta, 1));
}
export function monthTitle(month: string) {
  return sharedMonthTitle(month);
}
export function dateTitle(date: string) {
  return dateLabel(date);
}
