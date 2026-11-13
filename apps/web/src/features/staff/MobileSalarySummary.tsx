import { api } from "../../api";
import { money } from "../../lib/formatters";

export function MobileSalarySummary({
  statements,
  month,
  onOpenSalary,
}: {
  statements: Awaited<ReturnType<typeof api.salaries>>["statements"];
  month: string;
  onOpenSalary: () => void;
}) {
  return (
    <section className="panel mobile-staff-section">
      <h2>Salary estimate · {month}</h2>
      {statements.map((line) => (
        <div className="mobile-salary-estimate" key={line.staffId}>
          <div>
            <strong>{line.staffName}</strong>
            <small>
              Gross {money(line.grossSalary)} · deductions{" "}
              {money(line.deductions)}
            </small>
          </div>
          <b>{money(line.netPayable)}</b>
        </div>
      ))}
      <p className="mobile-staff-help">
        Open Salary management from More for the daily breakdown.
      </p>
      <button className="mobile-open-salary" onClick={onOpenSalary}>
        Open salary management →
      </button>
    </section>
  );
}
