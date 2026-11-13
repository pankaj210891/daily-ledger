import { useEffect, useState } from "react";
import { api, Entry, StaffMember } from "../../api";
import { SalaryStatementCard } from "./SalaryStatementCard";
import { money, monthTitle } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";
import { LegacyEntryPanel } from "../../components/LegacyEntryPanel";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";
import { SalaryDueList } from "./SalaryDueList";

export function SalaryWorkspace({
  staff,
  month,
  legacyEntries,
  onMonthChange,
  onOpenAttendance,
}: {
  staff: StaffMember[];
  month: string;
  legacyEntries: Entry[];
  onMonthChange: (month: string) => void;
  onOpenAttendance: () => void;
}) {
  const [statements, setStatements] = useState<
      Awaited<ReturnType<typeof api.salaries>>["statements"]
    >([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState<string[]>([]),
    [finalizing, setFinalizing] = useState(""),
    [actionError, setActionError] = useState("");
  async function reload() {
    setLoading(true);
    setError("");
    try {
      setStatements((await api.salaries(month)).statements);
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not calculate salary",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, [month, staff]);
  const totals = statements.reduce(
    (sum, line) => ({
      gross: sum.gross + line.grossSalary,
      deductions: sum.deductions + line.deductions,
      net: sum.net + line.netPayable,
      due: sum.due + line.amountDue,
    }),
    { gross: 0, deductions: 0, net: 0, due: 0 },
  );
  async function finalize(line: (typeof statements)[number]) {
    if (
      !window.confirm(
        `Finalize ${line.staffName}'s ${monthTitle(month)} salary statement? The calculation will be locked; corrections must be added as adjustments.`,
      )
    )
      return;
    setFinalizing(line.staffId);
    setActionError("");
    try {
      await api.finalizeSalary(line.staffId, month);
      await reload();
    } catch (issue) {
      setActionError(
        issue instanceof Error
          ? issue.message
          : "Could not finalize salary statement",
      );
    } finally {
      setFinalizing("");
    }
  }
  return (
    <>
      <MobileMonthPicker
        month={month}
        onChange={onMonthChange}
        label="Salary month"
      />
      <section className="panel mobile-salary-total">
        <span>AMOUNT REMAINING · {monthTitle(month)}</span>
        <strong>{loading ? "—" : money(totals.due)}</strong>
        <div>
          <span>Gross {money(totals.gross)}</span>
          <span>Deductions −{money(totals.deductions)}</span>
        </div>
        <p>
          Unmarked past dates count as present. Future dates remain pending and
          are not deducted.
        </p>
      </section>
      <section className="stat-grid bill-summary desktop-salary-summary">
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">GROSS SALARY</span>
            <span className="stat-icon blue">₹</span>
          </div>
          <div className="stat-value">
            {loading ? "—" : money(totals.gross)}
          </div>
          <div className="stat-foot">Prorated by employment dates</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">DEDUCTIONS</span>
            <span className="stat-icon orange">−</span>
          </div>
          <div className="stat-value">
            {loading ? "—" : money(totals.deductions)}
          </div>
          <div className="stat-foot">Absence, LOP and unpaid weekly offs</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">AMOUNT REMAINING</span>
            <span className="stat-icon green">₹</span>
          </div>
          <div className="stat-value">{loading ? "—" : money(totals.due)}</div>
          <div className="stat-foot">
            After recorded advances and payments · {month}
          </div>
        </article>
      </section>
      {!loading && statements.length > 0 && (
        <SalaryDueList statements={statements} />
      )}
      <section className="panel domain-workspace salary-workspace">
        <div className="panel-heading salary-workspace-heading">
          <div>
            <h2>Attendance-based salary</h2>
            <p>
              Daily rate = effective monthly salary ÷ calendar days in the
              month.
            </p>
          </div>
          <label className="domain-month">
            Salary month
            <input
              type="month"
              value={month}
              onChange={(event) =>
                event.target.value && onMonthChange(event.target.value)
              }
            />
          </label>
        </div>
        <div className="feature-limit desktop-only-note" role="note">
          Unmarked past dates count as present. Future dates remain pending and
          are included in the salary estimate without being counted as present
          or deducted. Explicit absences and LOP deduct one daily rate.
        </div>
        {error && (
          <div className="api-error" role="alert">
            <strong>Salary could not be calculated</strong>
            <span>{error}</span>
            <button onClick={() => void reload()}>Retry</button>
          </div>
        )}
        {loading ? (
          <LoadingState label="Calculating attendance-based salary…" />
        ) : statements.length ? (
          <div className="salary-statement-list">
            {statements.map((line) => (
              <SalaryStatementCard
                key={line.staffId}
                line={line}
                month={month}
                expanded={expanded.includes(line.staffId)}
                isFinalizing={finalizing === line.staffId}
                actionError={actionError}
                onToggle={() =>
                  setExpanded((current) =>
                    current.includes(line.staffId)
                      ? current.filter((id) => id !== line.staffId)
                      : [...current, line.staffId],
                  )
                }
                onFinalize={() => void finalize(line)}
                onReload={reload}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No staff employed in {month}. Add a staff profile or choose another
            month.
          </div>
        )}
      </section>
      <section className="panel salary-link-panel">
        <div>
          <h2>Need to correct attendance?</h2>
          <p>
            Attendance changes flow into this salary calculation automatically.
          </p>
        </div>
        <button className="button button-secondary" onClick={onOpenAttendance}>
          Open attendance to make corrections →
        </button>
      </section>
      <LegacyEntryPanel
        entries={legacyEntries}
        title="Earlier manual salary entries"
        description="These generic salary amounts are preserved separately and are not included in this attendance-based calculation."
      />
    </>
  );
}
