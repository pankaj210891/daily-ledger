import { Entry } from "../../api";
import { dateLabel, monthTitle, money } from "../../lib/formatters";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EntryTable } from "../entries/EntryTable";
import {
  CategoryBreakdown,
  SpendingTrend,
  StatCard,
} from "../dashboard/DashboardWidgets";
import { LoadingState } from "../../components/feedback/LoadingState";
import type { Section } from "../../app/sectionConfig";

export function StatusFilter({
  value,
  onChange,
  count,
}: {
  value: string;
  onChange: (value: string) => void;
  count: number;
}) {
  return (
    <div className="ledger-filters">
      <label htmlFor="ledger-status-filter">
        Status
        <select
          id="ledger-status-filter"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="all">All statuses</option>
          {["recorded", "pending", "paid", "upcoming", "present", "absent"].map(
            (status) => (
              <option key={status} value={status}>
                {status[0].toUpperCase() + status.slice(1)}
              </option>
            ),
          )}
        </select>
      </label>
      <span>
        {count} {count === 1 ? "record" : "records"}
      </span>
    </div>
  );
}

export function MonthlyReport({
  entries,
  month,
  loading,
  statusFilter,
  onStatusChange,
  onView,
  edit,
  remove,
}: {
  entries: Entry[];
  month: string;
  loading: boolean;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onView: (section: Section) => void;
  edit: (entry: Entry) => void;
  remove: (entry: Entry) => void;
}) {
  const spend = entries
    .filter(
      (e) =>
        ["expense", "bill", "salary", "delivery"].includes(e.type) &&
        !["pending", "upcoming"].includes(e.status),
    )
    .reduce((sum, e) => sum + e.amount, 0);
  return (
    <>
      <section className="stat-grid">
        <StatCard
          label="RECORDED OUTFLOW"
          value={money(spend)}
          detail={monthTitle(month)}
          icon="₹"
        />
        <StatCard
          label="RECORDS IN PERIOD"
          value={String(entries.length)}
          detail="Saved records dated in selected month"
          icon="▤"
          tone="blue"
        />
        <StatCard
          label="DELIVERY RECORDS"
          value={String(entries.filter((e) => e.type === "delivery").length)}
          detail="In selected month"
          icon="◷"
          tone="purple"
        />
      </section>
      <div className="dashboard-grid">
        <SpendingTrend entries={entries} selectedMonth={month} />
        <CategoryBreakdown
          entries={entries}
          onView={onView}
          selectedMonth={month}
        />
      </div>
      <section className="panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h2>Monthly activity</h2>
            <p>Records dated in {monthTitle(month)}.</p>
          </div>
        </div>
        <StatusFilter
          value={statusFilter}
          onChange={onStatusChange}
          count={entries.length}
        />
        {loading ? (
          <LoadingState label="Loading report records…" />
        ) : (
          <EntryTable entries={entries} edit={edit} remove={remove} />
        )}
      </section>
    </>
  );
}
