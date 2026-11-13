import { FormEvent, useState } from "react";
import { api } from "../../api";
import { dateLabel, money } from "../../lib/formatters";

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
            onChange={(event) => setKind(event.target.value as typeof kind)}
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
          Date
          <input
            name="date"
            required
            type="date"
            defaultValue={`${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`}
          />
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
