import { Entry } from "../../api";
import { dateLabel, householdDateKey, money } from "../../lib/formatters";

export function UpcomingPayments({
  entries,
  onPay,
}: {
  entries: Entry[];
  onPay: (entry: Entry) => void;
}) {
  const today = householdDateKey(new Date());
  const upcoming = entries
    .filter((e) => e.type === "bill" || e.type === "salary")
    .filter(
      (e) =>
        e.status !== "paid" &&
        (["pending", "upcoming"].includes(e.status) ||
          Boolean(e.dueDate && householdDateKey(e.dueDate) >= today)),
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate || a.date).getTime() -
        new Date(b.dueDate || b.date).getTime(),
    )
    .slice(0, 4);
  return (
    <section className="panel reminders-panel">
      <div className="panel-heading">
        <div>
          <h2>Manual upcoming payments</h2>
          <p>Bills and salary entries not yet marked paid</p>
        </div>
        <span className="reminder-count">{upcoming.length} due</span>
      </div>
      {upcoming.length ? (
        <div className="upcoming-list">
          {upcoming.map((e) => (
            <div className="upcoming-item" key={e._id}>
              <span className="upcoming-symbol">₹</span>
              <div className="upcoming-copy">
                <strong>{e.name}</strong>
                <small>
                  {e.type === "salary" ? "Salary" : e.category} ·{" "}
                  {dateLabel(e.dueDate || e.date)}
                </small>
              </div>
              <div className="upcoming-total">
                <strong>{money(e.amount)}</strong>
                <button onClick={() => onPay(e)}>Mark paid</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="upcoming-empty">
          <span>✓</span>
          <strong>All clear for now</strong>
          <p>Upcoming bills and salaries will appear here.</p>
        </div>
      )}
    </section>
  );
}
