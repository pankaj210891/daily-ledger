import { useMemo } from "react";
import { Entry } from "../../api";
import {
  householdMonthKey,
  monthLabel,
  monthTitle,
  money,
} from "../../lib/formatters";

export function SpendingTrend({
  entries,
  selectedMonth,
}: {
  entries: Entry[];
  selectedMonth: string;
}) {
  const months = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1 - 5 + i, 15, 12));
      return { key: householdMonthKey(d), label: monthLabel(d), total: 0 };
    });
  }, [selectedMonth]);
  for (const e of entries) {
    if (
      !["expense", "bill", "salary", "delivery"].includes(e.type) ||
      ["pending", "upcoming"].includes(e.status)
    )
      continue;
    const slot = months.find((m) => m.key === householdMonthKey(e.date));
    if (slot) slot.total += e.amount;
  }
  const max = Math.max(1, ...months.map((m) => m.total));
  return (
    <section className="panel spending-panel">
      <div className="panel-heading">
        <div>
          <h2>Six-month outflow</h2>
          <p>Through {monthTitle(selectedMonth)}</p>
        </div>
        <span className="chart-legend">
          <span>
            <i className="legend-dot dot-green" /> Ledger entries
          </span>
        </span>
      </div>
      <div className="spending-summary">
        <div>
          <strong>{money(months.at(-1)?.total || 0)}</strong>
          <span className="stat-foot">{monthTitle(selectedMonth)}</span>
        </div>
      </div>
      <div
        className="trend-chart"
        role="img"
        aria-label={`Monthly household spending for the six months ending ${monthTitle(selectedMonth)}`}
      >
        {months.map((m) => (
          <div className="trend-column" key={m.key}>
            <span className="trend-bar-value">
              {m.total ? money(m.total) : "—"}
            </span>
            <div className="trend-track">
              <span
                style={{
                  height: `${m.total ? Math.max(8, (m.total / max) * 100) : 0}%`,
                }}
              />
            </div>
            <span className="trend-month">{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
