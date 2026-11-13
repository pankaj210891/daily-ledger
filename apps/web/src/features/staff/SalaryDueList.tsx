import { SalaryCalculation } from "../../api";
import { dateLabel, householdDateKey, money } from "../../lib/formatters";

function paydayFor(month: string, payDay: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const paydayYear = nextMonth.getUTCFullYear();
  const paydayMonth = nextMonth.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(paydayYear, paydayMonth, 0)).getUTCDate();
  const day = String(Math.min(payDay, lastDay)).padStart(2, "0");
  return `${paydayYear}-${String(paydayMonth).padStart(2, "0")}-${day}`;
}

function statusFor(line: SalaryCalculation, dueDate: string, today: string) {
  const paid = line.advances + line.payments;
  if (!line.finalized) return "Not finalized";
  if (line.amountDue <= 0) return "Paid";
  if (dueDate < today)
    return paid > 0 ? "Partially paid · overdue" : "Overdue";
  if (dueDate === today)
    return paid > 0 ? "Partially paid · due today" : "Due today";
  return paid > 0 ? "Partially paid" : "Upcoming";
}

export function SalaryDueList({
  statements,
}: {
  statements: SalaryCalculation[];
}) {
  const today = householdDateKey(new Date());
  return (
    <section className="panel salary-due-list" aria-label="Payroll due list">
      <div className="panel-heading">
        <div>
          <h2>Payroll due list</h2>
          <p>Track each salary payday, payments, and remaining balance.</p>
        </div>
      </div>
      <div className="salary-due-rows">
        {statements.map((line) => {
          const dueDate = paydayFor(line.month, line.salaryPayDay);
          const status = statusFor(line, dueDate, today);
          const paid = line.advances + line.payments;
          const payable = Math.max(0, line.netPayable + line.adjustments);
          return (
            <article className="salary-due-row" key={line.staffId}>
              <div className="salary-due-person">
                <strong>{line.staffName}</strong>
                <small>Payday · {dateLabel(dueDate)}</small>
              </div>
              <div className="salary-due-amount">
                <small>Payable</small>
                <strong>{money(payable)}</strong>
              </div>
              <div className="salary-due-amount">
                <small>Paid</small>
                <strong>{money(paid)}</strong>
              </div>
              <div className="salary-due-amount">
                <small>Remaining</small>
                <strong>{money(line.amountDue)}</strong>
              </div>
              <span
                className={`salary-due-status ${
                  status === "Paid"
                    ? "is-paid"
                    : status.includes("overdue") || status === "Overdue"
                      ? "is-overdue"
                      : status.includes("due today")
                        ? "is-due"
                      : ""
                }`}
              >
                {status}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
