import { monthTitle } from "../lib/formatters";

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 15));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MobileMonthPicker({ month, onChange, label = "Month" }: { month: string; onChange: (month: string) => void; label?: string }) {
  return <div className="mobile-month-picker" aria-label={label}>
    <button type="button" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>‹</button>
    <strong>{monthTitle(month)}</strong>
    <button type="button" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>›</button>
  </div>;
}
