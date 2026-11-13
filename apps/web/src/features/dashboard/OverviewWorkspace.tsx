import { Dispatch, SetStateAction } from "react";
import {
  AttendanceRecord,
  Entry,
  MonthlyBill,
  SalaryCalculation,
  ScheduledDelivery,
  StaffMember,
} from "../../api";
import { monthTitle, money } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";
import { EntryTable } from "../entries/EntryTable";
import {
  CategoryBreakdown,
  SpendingTrend,
  StatCard,
  TodayOperations,
  UpcomingPayments,
} from "./DashboardWidgets";
import type { Section } from "../../app/sectionConfig";

type OverviewWorkspaceProps = {
  selectedMonth: string;
  spend: number;
  overviewLoading: boolean;
  overviewBill: MonthlyBill | null;
  overviewSalaries: SalaryCalculation[];
  todayDeliveries: ScheduledDelivery[];
  attendanceRecords: AttendanceRecord[];
  staff: StaffMember[];
  overviewError: string;
  onRetryOverview: () => void;
  entries: Entry[];
  filtered: Entry[];
  entriesLoading: boolean;
  onNavigate: (section: Section) => void;
  onMarkPaid: (entry: Entry) => void;
  showAllActivity: boolean;
  setShowAllActivity: Dispatch<SetStateAction<boolean>>;
  onOpenEntry: (entry: Entry) => void;
  onRemoveEntry: (entry: Entry) => void;
  onReloadEntries: () => Promise<void>;
};

export function OverviewWorkspace({
  selectedMonth,
  spend,
  overviewLoading,
  overviewBill,
  overviewSalaries,
  todayDeliveries,
  attendanceRecords,
  staff,
  overviewError,
  onRetryOverview,
  entries,
  filtered,
  entriesLoading,
  onNavigate,
  onMarkPaid,
  showAllActivity,
  setShowAllActivity,
  onOpenEntry,
  onRemoveEntry,
  onReloadEntries,
}: OverviewWorkspaceProps) {
  return (
    <>
      <section className="stat-grid overview-stat-grid">
        <StatCard
          className="mobile-hide-stat"
          label="LEDGER OUTFLOW"
          value={money(spend)}
          detail={`Manual ledger records · ${monthTitle(selectedMonth)}`}
          icon="₹"
          onClick={() => onNavigate("Household Expenses")}
        />
        <StatCard
          label="DELIVERED CHARGES"
          value={
            overviewLoading
              ? "…"
              : overviewBill
                ? money(overviewBill.totals.totalAmount)
                : "—"
          }
          detail={`Scheduled-date rates · ${monthTitle(selectedMonth)}`}
          icon="₹"
          tone="green"
          onClick={() => onNavigate("Monthly Bills")}
        />
        <StatCard
          label="ESTIMATED NET SALARY"
          value={
            overviewLoading
              ? "…"
              : money(
                  overviewSalaries.reduce(
                    (sum, statement) => sum + statement.netPayable,
                    0,
                  ),
                )
          }
          detail={`${overviewSalaries.length} staff statements`}
          icon="₹"
          tone="purple"
          onClick={() => onNavigate("Salary Management")}
        />
        <StatCard
          label="SCHEDULED ITEMS"
          value={
            overviewLoading
              ? "…"
              : String(overviewBill?.totals.scheduledCount ?? 0)
          }
          detail={monthTitle(selectedMonth)}
          icon="◷"
          tone="blue"
          onClick={() => onNavigate("Deliveries")}
        />
        <StatCard
          label="OPEN DELIVERY ITEMS"
          value={
            overviewLoading
              ? "…"
              : String(
                  overviewBill?.products.reduce(
                    (count, product) =>
                      count +
                      product.lines.filter(
                        (line) =>
                          line.status === "pending" ||
                          line.status === "partially_delivered",
                      ).length,
                    0,
                  ) ?? 0,
                )
          }
          detail={`Pending or partial · ${monthTitle(selectedMonth)}`}
          icon="◷"
          tone="orange"
          onClick={() => onNavigate("Deliveries")}
        />
        <StatCard
          className="mobile-only-stat"
          label="OUTSTANDING ESTIMATE"
          value={
            overviewLoading
              ? "…"
              : overviewBill
                ? money(overviewBill.totals.totalOutstandingEstimate)
                : "—"
          }
          detail={`${overviewBill?.products.reduce((count, product) => count + product.lines.filter((line) => line.status === "pending" || line.status === "partially_delivered").length, 0) ?? 0} open delivery items`}
          icon="◷"
          tone="orange"
          onClick={() => onNavigate("Monthly Bills")}
        />
      </section>
      <section className="panel mobile-ledger-summary">
        <div className="panel-heading">
          <div>
            <h2>Ledger outflow</h2>
            <p>Manual entries · {monthTitle(selectedMonth)}</p>
          </div>
          <strong>{money(spend)}</strong>
        </div>
        <p>
          Manual ledger totals are shown separately from calculated product
          charges and salary.
        </p>
      </section>
      {overviewError && (
        <div className="api-error" role="alert">
          <strong>Some overview data could not be loaded</strong>
          <span>{overviewError}</span>
          <button onClick={() => onRetryOverview()}>Retry</button>
        </div>
      )}
      <div className="dashboard-grid overview-mobile-panels">
        <SpendingTrend entries={entries} selectedMonth={selectedMonth} />
        <CategoryBreakdown
          entries={entries}
          onView={onNavigate}
          selectedMonth={selectedMonth}
        />
        <TodayOperations
          deliveries={todayDeliveries}
          attendanceRecords={attendanceRecords}
          staff={staff}
          onView={onNavigate}
        />
        <UpcomingPayments entries={entries} onPay={onMarkPaid} />
      </div>
      <section className="panel mobile-delivery-status">
        <div className="panel-heading">
          <div>
            <h2>Delivery status</h2>
            <p>Scheduled items this month</p>
          </div>
          <span className="reminder-count">
            {overviewBill?.products.reduce(
              (count, product) =>
                count +
                product.lines.filter(
                  (line) =>
                    line.status === "pending" ||
                    line.status === "partially_delivered",
                ).length,
              0,
            ) ?? 0}{" "}
            open
          </span>
        </div>
        {overviewBill?.products.length ? (
          overviewBill.products.slice(0, 4).map((product) => (
            <div className="mobile-delivery-row" key={product.productId}>
              <div>
                <strong>{product.productName}</strong>
                <small>
                  {product.deliveredQuantity} {product.unit} delivered ·{" "}
                  {product.outstandingQuantity} {product.unit} outstanding
                </small>
              </div>
              <b>{money(product.deliveredAmount)}</b>
            </div>
          ))
        ) : (
          <p>No scheduled product deliveries in {monthTitle(selectedMonth)}.</p>
        )}
      </section>
      <section className="panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent ledger entries</h2>
            <p>Manual records for this household</p>
          </div>
          <button
            className="text-link"
            onClick={() => setShowAllActivity((v) => !v)}
          >
            {showAllActivity ? "Show recent" : "View all activity"} →
          </button>
        </div>
        {entriesLoading ? (
          <LoadingState label="Loading recent activity…" />
        ) : (
          <EntryTable
            entries={showAllActivity ? filtered : filtered.slice(0, 5)}
            edit={onOpenEntry}
            remove={onRemoveEntry}
          />
        )}
      </section>
      <button
        className="mobile-overview-refresh"
        onClick={() => {
          void onReloadEntries();
          onRetryOverview();
        }}
      >
        Refresh overview
      </button>
    </>
  );
}
