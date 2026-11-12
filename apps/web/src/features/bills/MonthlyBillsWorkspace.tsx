import { useEffect, useState } from "react";
import { api, Entry, MonthlyBill } from "../../api";
import { dateLabel, money } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LegacyEntryPanel } from "../../components/LegacyEntryPanel";

const timeLabels: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };

export function MonthlyBillsWorkspace({ month, legacyEntries }: { month: string; legacyEntries: Entry[] }) {
  const [bill, setBill] = useState<MonthlyBill | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setBill(await api.prepareBill(month)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to calculate monthly bill"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [month]);
  return <>
    <section className="stat-grid bill-summary"><article className="stat-card"><div className="stat-top"><span className="stat-label">DELIVERED CHARGES</span><span className="stat-icon green">₹</span></div><div className="stat-value">{bill ? money(bill.totals.totalAmount) : "—"}</div><div className="stat-foot">Only recorded delivered quantity</div></article><article className="stat-card"><div className="stat-top"><span className="stat-label">OPEN ESTIMATE</span><span className="stat-icon orange">◷</span></div><div className="stat-value">{bill ? money(bill.totals.totalOutstandingEstimate) : "—"}</div><div className="stat-foot">Open quantity; not included in delivered charges</div></article><article className="stat-card"><div className="stat-top"><span className="stat-label">SCHEDULED ITEMS</span><span className="stat-icon blue">▤</span></div><div className="stat-value">{bill ? bill.totals.scheduledCount : "—"}</div><div className="stat-foot">Outstanding quantities remain estimates until delivered.</div></article></section>
    <section className="panel domain-workspace bill-workspace"><div className="panel-heading"><div><h2>Product-wise monthly bill</h2><p>Rates are selected by scheduled date; late deliveries remain in their original month.</p></div><button className="button button-secondary" onClick={() => void load()} disabled={loading}>Refresh bill</button></div>
      <div className="feature-limit desktop-only-note" role="note">Delivered quantity is charged at its scheduled-date rate. Open quantity is shown as an estimate and remains unbilled until delivered. Archived products and old generic bill entries are kept separately.</div>
      {error && <div className="api-error" role="alert"><strong>Bill could not be calculated</strong><span>{error}</span><button onClick={() => void load()}>Retry</button></div>}
      {bill?.totals.unpricedLines ? <div className="form-error bill-warning" role="alert">{bill.totals.unpricedLines} scheduled item(s) have no rate effective on their scheduled date and are excluded from both totals. The app does not apply a later rate retroactively.</div> : null}
      {loading ? <LoadingState label="Calculating monthly bill…" /> : bill?.products.length ? <div className="bill-product-list">{bill.products.map(product => <BillProductCard key={product.productId} product={product} />)}</div> : <div className="empty-state"><strong>No scheduled product deliveries in {month}.</strong><br />Configure a product schedule and refresh this bill to prepare the month.</div>}
    </section>
    <LegacyEntryPanel entries={legacyEntries} title="Earlier manual bill entries" description="These generic bill records remain unchanged and are not included in the calculated product bill above." />
  </>;
}

function BillProductCard({ product }: { product: MonthlyBill["products"][number] }) {
  const [expanded, setExpanded] = useState(() => !window.matchMedia("(max-width: 720px)").matches);
  const progress = product.expectedQuantity ? Math.min(100, product.deliveredQuantity / product.expectedQuantity * 100) : 0;
  return <section className="bill-product">
    <div className="bill-product-heading"><div><h3>{product.productName}</h3><p>{product.deliveredQuantity} {product.unit} delivered · {product.outstandingQuantity} {product.unit} open</p></div><div><strong>{money(product.deliveredAmount)}</strong><small>Delivered charge</small></div></div>
    <div className="bill-product-progress"><span style={{ width: `${progress}%` }} /></div>
    <p className="bill-product-estimate">{product.expectedQuantity} {product.unit} expected · estimate {money(product.outstandingAmount)}</p>
    <button className="bill-lines-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Hide" : "View"} scheduled line details ({product.lines.length})</button>
    {expanded && <div className="bill-line-list">{product.lines.map((line, index) => <article className="bill-line" key={line.scheduledDeliveryId || `${line.scheduledDate}-${line.timeSlot}-${index}`}>
      <div className="bill-line-heading"><strong>{dateLabel(line.scheduledDate)} · {timeLabels[line.timeSlot]}</strong><StatusBadge status={line.status} /></div>
      <div className="bill-line-facts"><span>Delivered {line.deliveredQuantity} / {line.expectedQuantity} {line.unit} · open {line.outstandingQuantity} {line.unit}</span><span>{line.rate === null ? "No effective rate" : `${money(line.rate)} / ${line.unit}`}</span></div>
      <div className="bill-line-amounts"><span>Delivered {line.deliveredAmount === null ? "unpriced" : money(line.deliveredAmount)}</span><span>Estimate {line.outstandingAmount === null ? "unpriced" : money(line.outstandingAmount)}</span></div>
      {line.records.length > 0 && <small className="bill-actual-dates">Actual parts: {line.records.map(record => `${record.quantity} ${line.unit} on ${dateLabel(record.actualDate)}`).join(" · ")}</small>}
      {line.closeReason && <small className="bill-actual-dates">Closed: {line.closeReason}</small>}
    </article>)}</div>}
  </section>;
}
