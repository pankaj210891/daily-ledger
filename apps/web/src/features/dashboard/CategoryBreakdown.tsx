import { Entry } from "../../api";
import { householdMonthKey, monthTitle, money } from "../../lib/formatters";
import type { Section } from "../../app/sectionConfig";

export function CategoryBreakdown({
  entries,
  onView,
  selectedMonth,
}: {
  entries: Entry[];
  onView: (section: Section) => void;
  selectedMonth: string;
}) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (
      !["expense", "bill", "salary", "delivery"].includes(e.type) ||
      ["pending", "upcoming"].includes(e.status) ||
      householdMonthKey(e.date) !== selectedMonth
    )
      continue;
    const key = e.category || "General";
    totals.set(key, (totals.get(key) || 0) + e.amount);
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    max = Math.max(1, ...rows.map(([, total]) => total));
  return (
    <section className="panel category-panel">
      <div className="panel-heading">
        <div>
          <h2>Outflow by category</h2>
          <p>{monthTitle(selectedMonth)}</p>
        </div>
        <button
          className="text-link"
          onClick={() => onView("Household Expenses")}
        >
          Expenses →
        </button>
      </div>
      {rows.length ? (
        <div className="category-list">
          {rows.map(([category, total]) => (
            <div className="category-row" key={category}>
              <div className="category-row-head">
                <strong>{category}</strong>
                <span>{money(total)}</span>
              </div>
              <div className="category-track">
                <span
                  style={{ width: `${Math.max(4, (total / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="compact-empty">
          <strong>No recorded outflow.</strong>
          <p>Add an expense to see category totals.</p>
          <button
            className="text-link"
            onClick={() => onView("Household Expenses")}
          >
            Add an expense →
          </button>
        </div>
      )}
    </section>
  );
}
