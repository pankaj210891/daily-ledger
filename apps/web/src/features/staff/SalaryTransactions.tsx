import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api";
import { dateLabel, householdDateKey, money } from "../../lib/formatters";

function paydayDate(month: string, payDay: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = date.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(Math.min(payDay, lastDay)).padStart(2, "0")}`;
}

export function SalaryTransactions({
  line,
  month,
  onSaved,
}: {
  line: Awaited<ReturnType<typeof api.salaries>>["statements"][number];
  month: string;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [kind, setKind] = useState<"advance" | "payment" | "adjustment">("payment");
  const suggestedPayDate = paydayDate(month, line.salaryPayDay);
  const [date, setDate] = useState(suggestedPayDate);
  useEffect(() => setDate(suggestedPayDate), [suggestedPayDate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formElement = event.currentTarget,
      form = new FormData(formElement),
      kind = String(form.get("kind")) as "advance" | "payment" | "adjustment";
    try {
      await api.addSalaryTransaction(line.staffId, {
        month,
        kind,
        amount:
          Number(form.get("amount")) *
          (kind === "adjustment" && form.get("direction") === "deduct"
            ? -1
            : 1),
        date: String(form.get("date")),
        note: String(form.get("note") || ""),
        reason: String(form.get("reason") || ""),
      });
      formElement.reset();
      setKind("payment");
      setDate(suggestedPayDate);
      await onSaved();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Could not save salary transaction",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="salary-transactions">
      <div
        className="salary-settlement"
        aria-label="Finalized salary and settlement summary"
      >
        <div>
          <span>Finalized salary snapshot</span>
          <strong>{money(line.netPayable)}</strong>
        </div>
        <div>
          <span>Adjustments after finalization</span>
          <strong>
            {line.adjustments < 0 ? "−" : line.adjustments > 0 ? "+" : ""}
            {money(Math.abs(line.adjustments))}
          </strong>
        </div>
        <div>
          <span>Advances recorded</span>
          <strong>−{money(line.advances)}</strong>
        </div>
        <div>
          <span>Payments recorded</span>
          <strong>−{money(line.payments)}</strong>
        </div>
        <div className="salary-settlement-balance">
          <span>Balance remaining</span>
          <strong>{money(line.amountDue)}</strong>
        </div>
      </div>
      {line.transactions.length > 0 && (
        <div
          className="salary-transaction-list"
          aria-label="Salary transaction history"
        >
          {line.transactions.map((item) => {
            const description =
              item.kind === "adjustment"
                ? `Adjustment ${item.amount > 0 ? "added to" : "deducted from"} amount due`
                : item.kind === "advance"
                  ? "Advance already paid"
                  : "Payment";
            return (
              <div className="salary-transaction-row" key={item._id}>
                <span>
                  {dateLabel(item.date)} · {description}
                </span>
                <strong>
                  {item.kind === "adjustment" && item.amount > 0
                    ? "+"
                    : item.amount < 0
                      ? "−"
                      : ""}
                  {money(Math.abs(item.amount))}
                </strong>
                <small>{item.reason || item.note || "—"}</small>
              </div>
            );
          })}
        </div>
      )}
      <form className="salary-transaction-form" onSubmit={submit}>
        <label>
          Record
          <select
            name="kind"
            value={kind}
            onChange={(event) => {
              const nextKind = event.target.value as typeof kind;
              setKind(nextKind);
              setDate(nextKind === "payment" ? suggestedPayDate : householdDateKey(new Date()));
            }}
          >
            <option value="payment">Payment</option>
            <option value="advance">Advance already paid</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </label>
        <label>
          Amount (₹)
          <input name="amount" required type="number" min="0.01" step="0.01" />
        </label>
        <label>
          {kind === "payment" ? "Payment date" : "Transaction date"}
          <input
            name="date"
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          {kind === "payment" && <small>Suggested payday for the selected salary month; change it to the actual payment date.</small>}
        </label>
        {kind === "adjustment" && (
          <label className="salary-adjustment-direction">
            Adjustment
            <select name="direction">
              <option value="add">Add to amount due</option>
              <option value="deduct">Deduct from amount due</option>
            </select>
          </label>
        )}
        <label>
          {kind === "adjustment" ? "Reason (required)" : "Note (optional)"}
          <input
            name="reason"
            required={kind === "adjustment"}
            maxLength={500}
            placeholder={
              kind === "adjustment"
                ? "Why is this adjustment needed?"
                : "Add a note"
            }
          />
        </label>
        <button className="button button-secondary" disabled={busy}>
          {busy ? "Saving…" : "Add record"}
        </button>
        {error && (
          <span className="api-error" role="alert">
            {error}
          </span>
        )}
      </form>
    </div>
  );
}
