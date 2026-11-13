import {
  dateLabel,
  householdDateKey,
  householdMonthKey,
  money,
  monthTitle,
  HOUSEHOLD_TIME_ZONE,
} from "@daily-ledger/shared";

export {
  dateLabel,
  householdDateKey,
  householdMonthKey,
  money,
  monthTitle,
  HOUSEHOLD_TIME_ZONE,
};

export const monthLabel = (value: string | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: HOUSEHOLD_TIME_ZONE,
    month: "short",
  }).format(new Date(value));
