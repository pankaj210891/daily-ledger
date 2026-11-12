export const HOUSEHOLD_TIME_ZONE = "Asia/Kolkata";

function dateParts(value: string | Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSEHOLD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
}

export function householdDateKey(value: string | Date) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function householdMonthKey(value: string | Date) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}`;
}

export const money = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(amount || 0);

export const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", {
  timeZone: HOUSEHOLD_TIME_ZONE, day: "numeric", month: "short", year: "numeric"
}).format(new Date(value));

export const monthLabel = (value: string | Date) => new Intl.DateTimeFormat("en-IN", {
  timeZone: HOUSEHOLD_TIME_ZONE, month: "short"
}).format(new Date(value));

export const monthTitle = (key: string) => new Intl.DateTimeFormat("en-IN", {
  timeZone: HOUSEHOLD_TIME_ZONE, month: "long", year: "numeric"
}).format(new Date(`${key}-15T12:00:00Z`));
