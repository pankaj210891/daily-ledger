import { useEffect, useMemo, useState } from "react";
import { Entry } from "../../api";
import { dateLabel, money } from "../../lib/formatters";
import { StatusBadge } from "../../components/ui/StatusBadge";

type EntrySort = "name" | "type" | "date" | "amount" | "status";
const entryTypeLabel: Record<string, string> = {
  delivery: "Delivery",
  product: "Product",
  expense: "Expense",
  bill: "Bill",
  staff: "Staff",
  attendance: "Attendance",
  salary: "Salary",
};
export function EntryTable({
  entries,
  edit,
  remove,
  pageSize = 10,
}: {
  entries: Entry[];
  edit: (e: Entry) => void;
  remove: (e: Entry) => void;
  pageSize?: number;
}) {
  const [sortBy, setSortBy] = useState<EntrySort>("date"),
    [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [entries]);
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        let comparison = 0;
        if (sortBy === "date")
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        else if (sortBy === "amount") comparison = a.amount - b.amount;
        else
          comparison = String(a[sortBy] || "").localeCompare(
            String(b[sortBy] || ""),
          );
        return sortDirection === "asc" ? comparison : -comparison;
      }),
    [entries, sortBy, sortDirection],
  );
  const pages = Math.ceil(sorted.length / pageSize),
    visible = sorted.slice(page * pageSize, (page + 1) * pageSize),
    start = sorted.length ? page * pageSize + 1 : 0,
    end = Math.min((page + 1) * pageSize, sorted.length),
    amountLabel =
      entries.length && entries.every((e) => e.type === "product")
        ? "CURRENT RATE"
        : entries.length && entries.every((e) => e.type === "staff")
          ? "MONTHLY SALARY"
          : "AMOUNT";
  const changeSort = (key: EntrySort) => {
    if (key === sortBy) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDirection(
        key === "name" || key === "type" || key === "status" ? "asc" : "desc",
      );
    }
  };
  const sortIndicator = (key: EntrySort) =>
    key !== sortBy ? "↕" : sortDirection === "asc" ? "↑" : "↓";
  const sortHeader = (key: EntrySort, label: string) => (
    <th
      scope="col"
      aria-sort={
        sortBy === key
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button className="sort-trigger" onClick={() => changeSort(key)}>
        {label}
        <span aria-hidden="true">{sortIndicator(key)}</span>
      </button>
    </th>
  );
  return (
    <div className="table-wrap">
      {sorted.length ? (
        <>
          <div className="table-sort-mobile">
            <label>
              Sort by
              <select
                value={sortBy}
                onChange={(e) => {
                  const next = e.target.value as EntrySort;
                  setSortBy(next);
                }}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
              </select>
            </label>
            <button
              onClick={() =>
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
              }
            >
              {sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">DESCRIPTION</th>
                {sortHeader("type", "TYPE")}
                {sortHeader("date", "DATE")}
                {sortHeader("amount", amountLabel)}
                {sortHeader("status", "STATUS")}
                <th scope="col">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e._id}>
                  <td data-label="">
                    <div className="transaction-name">
                      <span
                        className="transaction-icon mint"
                        aria-hidden="true"
                      >
                        {e.type === "delivery"
                          ? "◷"
                          : e.type === "product"
                            ? "▤"
                            : "₹"}
                      </span>
                      <span>
                        <strong>{e.name}</strong>
                        <small>
                          {e.category}
                          {e.quantity ? ` · ${e.quantity} ${e.unit}` : ""}
                          {e.type === "product" && e.unit
                            ? ` · per ${e.unit}`
                            : ""}
                          {e.dueDate ? ` · Due ${dateLabel(e.dueDate)}` : ""}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Type">{entryTypeLabel[e.type] || e.type}</td>
                  <td data-label="Date" className="date-cell">
                    {dateLabel(e.date)}
                  </td>
                  <td data-label={amountLabel}>
                    {money(e.amount)}
                    {e.type === "product" && e.unit ? ` / ${e.unit}` : ""}
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={e.status} />
                  </td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button
                        aria-label={`Edit ${e.name}`}
                        onClick={() => edit(e)}
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${e.name}`}
                        onClick={() => remove(e)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-pagination" role="status" aria-live="polite">
            <span>
              Showing {start}–{end} of {sorted.length}
            </span>
            {pages > 1 && (
              <div>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {page + 1} of {pages}
                </span>
                <button
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>No entries match this view.</strong>
          <br />
          Adjust the search or status filter, or add a record.
        </div>
      )}
    </div>
  );
}
