import type { Entry } from "../api";
import { dateLabel, money } from "../lib/formatters";

export function LegacyEntryPanel({ entries, title, description }: { entries: Entry[]; title: string; description: string }) {
  if (!entries.length) return null;
  return <details className="legacy-records">
    <summary>{title} <span>{entries.length}</span></summary>
    <p>{description}</p>
    <div className="legacy-record-list">{entries.map(entry => <article className="legacy-record" key={entry._id}>
      <strong>{entry.name}</strong><span>{dateLabel(entry.date)}</span>
      <small>{entry.quantity ? `${entry.quantity} ${entry.unit}` : entry.unit || entry.category}</small>
      <b>{money(entry.amount)}</b>
    </article>)}</div>
  </details>;
}
