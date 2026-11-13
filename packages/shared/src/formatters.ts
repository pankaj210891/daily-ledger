import { HOUSEHOLD_TIME_ZONE } from "./dates.js";

export function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function dateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: HOUSEHOLD_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function monthTitle(month: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-15T12:00:00Z`));
}
