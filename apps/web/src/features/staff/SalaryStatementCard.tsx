import { SalaryCalculation } from "../../api";
import { dateLabel, money } from "../../lib/formatters";
import { SalaryTransactions } from "./SalaryTransactions";
import { statusLabels, week } from "./staffOptions";

export function SalaryStatementCard({
  line,
  month,
  expanded,
  isFinalizing,
  actionError,
  onToggle,
  onFinalize,
  onReload,
}: {
  line: SalaryCalculation;
  month: string;
  expanded: boolean;
  isFinalizing: boolean;
  actionError: string;
  onToggle: () => void;
  onFinalize: () => void;
  onReload: () => Promise<void>;
}) {
  return (
    <article className="salary-statement">
      <div className="salary-statement-head">
        <div>
          <h3>{line.staffName}</h3>
          <p>
            {line.employedDays} employed calendar days · salary range{" "}
            {dateLabel(line.joinDate)}
            {line.endDate ? ` to ${dateLabel(line.endDate)}` : ""}
          </p>
          <p className="salary-mobile-counts">
            Present {line.counts.present} · absent {line.counts.absent} · PTO{" "}
            {line.counts.pto} · LOP {line.counts.lop}
            <br />
            Weekly off {line.counts.weeklyOff} · holidays {line.counts.holiday}
          </p>
        </div>
        <div>
          <strong>{money(line.amountDue)}</strong>
          <small>
            {line.finalized
              ? line.paymentStatus.replace("_", " ")
              : "Estimated payable"}
          </small>
        </div>
      </div>
      <div className="salary-count-grid">
        <span>
          Present<strong>{line.counts.present}</strong>
        </span>
        <span>
          Absent<strong>{line.counts.absent}</strong>
        </span>
        <span>
          PTO<strong>{line.counts.pto}</strong>
        </span>
        <span>
          LOP<strong>{line.counts.lop}</strong>
        </span>
        <span>
          Paid weekly off<strong>{line.counts.paidWeeklyOff}</strong>
        </span>
        <span>
          Unpaid weekly off
          <strong>{line.counts.unpaidWeeklyOff}</strong>
        </span>
        <span>
          Holiday<strong>{line.counts.holiday}</strong>
        </span>
        <span>
          Unmarked, counted present
          <strong>{line.counts.unmarkedPresentDays}</strong>
        </span>
        <span>
          Future, pending
          <strong>{line.counts.pendingAttendance}</strong>
        </span>
      </div>
      <p className="salary-pending-count">
        {line.counts.pendingAttendance} future attendance days pending
      </p>
      <div className="salary-money-row">
        <span>Gross {money(line.grossSalary)}</span>
        <span>Deductions −{money(line.deductions)}</span>
        <button
          className="text-link"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {expanded ? "Hide daily breakdown" : "View daily breakdown"}
        </button>
      </div>
      {line.counts.unmarkedPresentDays > 0 && (
        <p className="salary-defaults">
          {line.counts.unmarkedPresentDays} unmarked past date(s) count as
          present. Record absences or leave to apply deductions.
        </p>
      )}
      <p className="salary-policy-note">
        {line.finalized
          ? `Finalized ${new Date(line.finalizedAt!).toLocaleDateString("en-IN")}. Salary and attendance snapshot is locked.`
          : "Review attendance and deductions before finalizing. Future attendance must be complete."}
      </p>
      <details className="salary-context">
        <summary>Rates and policies used</summary>
        {line.salaryRateHistory.map((item) => (
          <div key={`${item.effectiveFrom}-${item.monthlySalary}`}>
            <span>Salary from {dateLabel(item.effectiveFrom)}</span>
            <strong>{money(item.monthlySalary)} / month</strong>
          </div>
        ))}
        {line.weeklyOffPolicyHistory.map((item) => (
          <div
            key={`${item.effectiveFrom}-${item.days.join(",")}-${item.paid}`}
          >
            <span>Weekly-off policy from {dateLabel(item.effectiveFrom)}</span>
            <strong>
              {item.days.length
                ? item.days.map((day) => week[day]?.label).join(", ")
                : "No weekly off"}{" "}
              · {item.paid ? "paid" : "unpaid"}
            </strong>
          </div>
        ))}
      </details>
      {actionError && (
        <div className="api-error" role="alert">
          {actionError}
        </div>
      )}
      {!line.finalized ? (
        <button
          className="button button-primary salary-finalize"
          disabled={isFinalizing || line.counts.pendingAttendance > 0}
          onClick={onFinalize}
        >
          {isFinalizing
            ? "Finalizing…"
            : line.counts.pendingAttendance > 0
              ? "Available after month ends"
              : "Review and finalize statement"}
        </button>
      ) : (
        <SalaryTransactions line={line} month={month} onSaved={onReload} />
      )}
      {expanded && (
        <div className="salary-daily-list">
          {line.dailyBreakdown.map((day) => (
            <div key={day.date}>
              <span>
                {dateLabel(day.date)} · {day.weekday}
              </span>
              <strong>{statusLabels[day.status] || day.status}</strong>
              <small>
                {day.source}
                {day.reason ? ` · ${day.reason}` : ""}
              </small>
              <span>
                {money(day.monthlySalary)} / month → {money(day.dailyRate)} /
                day
              </span>
              <span>
                {day.deduction ? `−${money(day.deduction)}` : "No deduction"}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
