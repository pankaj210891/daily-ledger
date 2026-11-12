import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, Entry, Product, ScheduledDelivery, TimeSlot } from "../../api";
import { dateLabel, householdDateKey } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LegacyEntryPanel } from "../../components/LegacyEntryPanel";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";

const timeSlotLabel: Record<TimeSlot, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };
function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return { from: `${month}-01`, to: new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10) };
}

function DeliveryPartForm({ delivery, part, onClose, onSaved }: { delivery: ScheduledDelivery; part?: ScheduledDelivery["deliveryRecords"][number]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [quantity, setQuantity] = useState(part?.quantity.toString() || ""), [actualDate, setActualDate] = useState(part?.actualDate || householdDateKey(new Date())), [notes, setNotes] = useState(part?.notes || ""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const input = { quantity: Number(quantity), actualDate, notes };
      if (part) await api.updateDeliveryPart(delivery._id, part._id, input);
      else await api.addDeliveryPart(delivery._id, input);
      await onSaved(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save delivery"); }
    finally { setBusy(false); }
  }
  const remaining = delivery.expectedQuantity - delivery.deliveredQuantity + (part?.quantity || 0);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="quick-modal entry-form" role="dialog" aria-modal="true" aria-labelledby="delivery-part-title" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">{part ? "EDIT DELIVERY PART" : "RECORD DELIVERY"}</span><h2 id="delivery-part-title">{delivery.productName}</h2></div><button type="button" className="close-button" aria-label="Close delivery form" onClick={onClose}>×</button></div>
    <p className="dialog-context">Scheduled {dateLabel(delivery.scheduledDate)} · {timeSlotLabel[delivery.timeSlot]} · {delivery.expectedQuantity} {delivery.unit} expected</p>
    <label>Delivered quantity ({delivery.unit})<input required type="number" min="0.01" max={remaining} step="0.01" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
    <label>Actual delivery date<input required type="date" value={actualDate} onChange={event => setActualDate(event.target.value)} /></label>
    <label>Notes (optional)<textarea rows={2} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
    <p className="form-hint">A late delivery remains billed against its scheduled date and that date’s rate.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : part ? "Save correction" : "Save delivery"}</button></div>
  </form></div>;
}

function CloseDeliveryForm({ delivery, onClose, onSaved }: { delivery: ScheduledDelivery; onClose: () => void; onSaved: () => Promise<void> }) {
  const [action, setAction] = useState<"zero-consumption" | "skip" | "cancel">(delivery.deliveredQuantity > 0 ? "skip" : "zero-consumption"), [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await api.closeScheduledDelivery(delivery._id, action, reason); await onSaved(); onClose(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to update scheduled delivery"); }
    finally { setBusy(false); }
  }
  const outstanding = Math.max(0, delivery.expectedQuantity - delivery.deliveredQuantity);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="quick-modal entry-form" role="dialog" aria-modal="true" aria-labelledby="delivery-close-title" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">UPDATE SCHEDULED DELIVERY</span><h2 id="delivery-close-title">{delivery.productName}</h2></div><button type="button" className="close-button" aria-label="Close status form" onClick={onClose}>×</button></div>
    {delivery.deliveredQuantity > 0 && <p className="dialog-context">{delivery.deliveredQuantity} {delivery.unit} delivered; {outstanding} {delivery.unit} remains. Closing this item waives its outstanding quantity.</p>}
    <label>Status<select value={action} onChange={event => setAction(event.target.value as typeof action)}>{delivery.deliveredQuantity === 0 && <option value="zero-consumption">Zero consumption</option>}<option value="skip">Skip this delivery</option><option value="cancel">Cancel this delivery</option></select></label>
    <label>Reason (optional)<textarea rows={2} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Keep open</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : action === "zero-consumption" ? "Record zero" : action === "skip" ? "Skip delivery" : "Cancel delivery"}</button></div>
  </form></div>;
}

function DeliveryCard({ delivery, onRefresh }: { delivery: ScheduledDelivery; onRefresh: () => Promise<void> }) {
  const [partForm, setPartForm] = useState<ScheduledDelivery["deliveryRecords"][number] | null | undefined>(undefined), [closeOpen, setCloseOpen] = useState(false), [error, setError] = useState("");
  const isOpen = delivery.status === "pending" || delivery.status === "partially_delivered";
  async function removePart(recordId: string) {
    if (!window.confirm("Remove this delivery record? The scheduled quantity and bill will be recalculated.")) return;
    setError("");
    try { await api.deleteDeliveryPart(delivery._id, recordId); await onRefresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove delivery record"); }
  }
  return <article className="scheduled-delivery-card">
    <div className="scheduled-delivery-head"><div><span className="scheduled-date">{dateLabel(delivery.scheduledDate)} · {timeSlotLabel[delivery.timeSlot]}</span><h3>{delivery.productName}</h3><p>Expected {delivery.expectedQuantity} {delivery.unit}</p></div><StatusBadge status={delivery.status} /></div>
    <div className="delivery-quantities"><div><small>Delivered</small><strong>{delivery.deliveredQuantity} {delivery.unit}</strong></div><div><small>{isOpen ? "Outstanding" : "Remaining waived"}</small><strong>{isOpen ? Math.max(0, delivery.expectedQuantity - delivery.deliveredQuantity) : 0} {delivery.unit}</strong></div></div>
    {delivery.closeReason && <p className="delivery-close-reason">Reason: {delivery.closeReason}</p>}
    {delivery.deliveryRecords.length > 0 && <div className="delivery-part-list"><strong>Delivery parts</strong>{delivery.deliveryRecords.map(part => <div className="delivery-part" key={part._id}><span>{part.quantity} {delivery.unit} · actual {dateLabel(part.actualDate)}{part.notes ? ` · ${part.notes}` : ""}</span><span><button onClick={() => setPartForm(part)}>Edit</button><button onClick={() => void removePart(part._id)}>Remove</button></span></div>)}</div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {isOpen && <div className="scheduled-delivery-actions"><button className="button button-primary" onClick={() => setPartForm(null)}>＋ Record part</button><button className="button button-secondary" onClick={() => setCloseOpen(true)}>Close / skip</button></div>}
    {partForm !== undefined && <DeliveryPartForm delivery={delivery} part={partForm || undefined} onClose={() => setPartForm(undefined)} onSaved={onRefresh} />}
    {closeOpen && <CloseDeliveryForm delivery={delivery} onClose={() => setCloseOpen(false)} onSaved={onRefresh} />}
  </article>;
}

function MobileDeliveryDetail({ delivery, onBack, onRefresh }: { delivery: ScheduledDelivery; onBack: () => void; onRefresh: () => Promise<void> }) {
  const [part, setPart] = useState<ScheduledDelivery["deliveryRecords"][number] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [actualDate, setActualDate] = useState(householdDateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [closeAction, setCloseAction] = useState<"zero-consumption" | "skip" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isOpen = ["pending", "partially_delivered"].includes(delivery.status);
  function startPart(correction?: ScheduledDelivery["deliveryRecords"][number]) {
    setPart(correction || null); setQuantity(correction ? String(correction.quantity) : ""); setActualDate(correction?.actualDate || householdDateKey(new Date())); setNotes(correction?.notes || ""); setError(""); setFormOpen(true);
  }
  async function savePart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const amount = Number(quantity);
    const remaining = delivery.expectedQuantity - delivery.deliveredQuantity + (part?.quantity || 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) { setError(`Enter a quantity greater than zero and no more than ${remaining} ${delivery.unit}.`); return; }
    setBusy(true); setError("");
    try {
      const input = { quantity: amount, actualDate, notes };
      if (part) await api.updateDeliveryPart(delivery._id, part._id, input); else await api.addDeliveryPart(delivery._id, input);
      setFormOpen(false); await onRefresh();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save delivery."); }
    finally { setBusy(false); }
  }
  async function removePart() {
    if (!removeId) return; setBusy(true); setError("");
    try { await api.deleteDeliveryPart(delivery._id, removeId); setRemoveId(""); await onRefresh(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to remove delivery part."); }
    finally { setBusy(false); }
  }
  async function closeDelivery() {
    if (!closeAction) return; setBusy(true); setError("");
    try { await api.closeScheduledDelivery(delivery._id, closeAction, reason); setCloseAction(null); setReason(""); await onRefresh(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to update delivery status."); }
    finally { setBusy(false); }
  }
  return <div className="mobile-delivery-detail" role="region" aria-label={`${delivery.productName} scheduled delivery`}>
    <button className="mobile-delivery-back" onClick={onBack}>‹&nbsp; Deliveries</button>
    <div className="mobile-delivery-heading"><span>SCHEDULED DELIVERY</span><h1>{delivery.productName}</h1><p>{dateLabel(delivery.scheduledDate)} · {timeSlotLabel[delivery.timeSlot]}</p></div>
    <section className="panel mobile-delivery-facts">{[["Expected", `${delivery.expectedQuantity} ${delivery.unit}`], ["Delivered", `${delivery.deliveredQuantity} ${delivery.unit}`], ["Outstanding", `${isOpen ? Math.max(0, delivery.expectedQuantity - delivery.deliveredQuantity) : 0} ${delivery.unit}`], ["Status", delivery.status.replace("_", " ")]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    {delivery.deliveryRecords.length > 0 && <section className="panel mobile-delivery-detail-panel"><h2>Recorded delivery parts</h2>{delivery.deliveryRecords.map(item => <div className="mobile-recorded-part" key={item._id}><div><strong>{dateLabel(item.actualDate)}</strong><span>{item.quantity} {delivery.unit}</span>{item.notes && <small>{item.notes}</small>}</div>{removeId === item._id ? <div className="mobile-remove-confirm"><span>Remove this record and recalculate quantity?</span><div><button onClick={() => setRemoveId("")}>Keep</button><button disabled={busy} onClick={() => void removePart()}>Remove</button></div></div> : <div className="mobile-recorded-part-actions"><button onClick={() => startPart(item)}>Correct</button><button onClick={() => setRemoveId(item._id)}>Remove</button></div>}</div>)}</section>}
    {error && <div className="api-error" role="alert">{error}</div>}
    {isOpen && <section className="panel mobile-delivery-detail-panel"><h2>Close or skip this delivery</h2><p>{delivery.deliveredQuantity > 0 ? `${delivery.deliveredQuantity} ${delivery.unit} delivered; ${Math.max(0, delivery.expectedQuantity - delivery.deliveredQuantity)} ${delivery.unit} remains. Closing waives the outstanding quantity.` : "Record zero consumption, skip this schedule, or cancel it."}</p>{closeAction ? <><label className="mobile-delivery-field">Reason (optional)<textarea rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="mobile-delivery-action primary" disabled={busy} onClick={() => void closeDelivery()}>{busy ? "Saving…" : closeAction === "zero-consumption" ? "Record zero" : closeAction === "skip" ? "Skip delivery" : "Cancel delivery"}</button><button className="mobile-delivery-action" onClick={() => setCloseAction(null)}>Keep open</button></> : <div className="mobile-delivery-close-actions">{delivery.status === "pending" && delivery.deliveryRecords.length === 0 && <button onClick={() => setCloseAction("zero-consumption")}>Zero consumption</button>}<button onClick={() => setCloseAction("skip")}>Skip</button><button className="danger" onClick={() => setCloseAction("cancel")}>Cancel</button></div>}</section>}
    {(isOpen || formOpen) && <section className="panel mobile-delivery-detail-panel"><h2>{formOpen && part ? "Correct a delivery part" : "Record a delivery"}</h2><form className="mobile-delivery-form" onSubmit={savePart}><label>Quantity delivered ({delivery.unit})<input required type="number" min="0.01" max={delivery.expectedQuantity - delivery.deliveredQuantity + (part?.quantity || 0)} step="0.01" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder={`Up to ${Math.max(0, delivery.expectedQuantity - delivery.deliveredQuantity + (part?.quantity || 0))} ${delivery.unit}`} /></label><label>Actual delivery date<input required type="date" value={actualDate} onChange={event => setActualDate(event.target.value)} /></label><label>Notes (optional)<textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>{error && <div className="form-error" role="alert">{error}</div>}{formOpen && <button type="button" className="mobile-delivery-action" onClick={() => setFormOpen(false)}>Cancel correction</button>}<button className="mobile-delivery-action primary" disabled={busy}>{busy ? "Saving…" : part ? "Save correction" : "Save delivery part"}</button></form></section>}
  </div>;
}

export function DeliveriesWorkspace({ month, products, legacyEntries, onMonthChange, onAddProduct }: { month: string; products: Product[]; legacyEntries: Entry[]; onMonthChange: (month: string) => void; onAddProduct: () => void }) {
  const [items, setItems] = useState<ScheduledDelivery[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const range = useMemo(() => monthRange(month), [month]);
  const refresh = async () => {
    setLoading(true); setError("");
    try { const result = await api.generateScheduledDeliveries(range.from, range.to); setItems(result.items); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load scheduled deliveries"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [range.from, range.to]);
  useEffect(() => { setSelectedId(""); }, [month]);
  const selectedDelivery = items.find(item => item._id === selectedId);
  const openCount = items.filter(item => item.status === "pending" || item.status === "partially_delivered").length;
  const deliveredCount = items.filter(item => item.status === "fully_delivered").length;
  return <>
    <section className="stat-grid phase-summary"><article className="stat-card"><div className="stat-top"><span className="stat-label">SCHEDULED DATES</span><span className="stat-icon blue">◷</span></div><div className="stat-value">{items.length}</div><div className="stat-foot">For {month}</div></article><article className="stat-card"><div className="stat-top"><span className="stat-label">OPEN</span><span className="stat-icon orange">!</span></div><div className="stat-value">{openCount}</div><div className="stat-foot">Pending or partial</div></article><article className="stat-card"><div className="stat-top"><span className="stat-label">FULLY DELIVERED</span><span className="stat-icon green">✓</span></div><div className="stat-value">{deliveredCount}</div><div className="stat-foot">Complete schedule items</div></article></section>
    {!selectedDelivery && <MobileMonthPicker month={month} onChange={onMonthChange} label="Delivery month" />}
    <section className="panel domain-workspace delivery-workspace"><div className="panel-heading"><div><h2>Scheduled deliveries</h2><p>Record actual delivery parts against each scheduled date.</p></div><label className="domain-month">Month<input type="month" value={month} onChange={event => event.target.value && onMonthChange(event.target.value)} /></label></div>
      <div className="feature-limit desktop-only-note" role="note">Late parts stay with the original scheduled date and rate. Partial balances remain open until delivered, skipped or cancelled. Generated dates preserve their original product, unit and expected quantity.</div>
      {error && <div className="api-error" role="alert"><strong>Delivery records could not be loaded</strong><span>{error}</span><button onClick={() => void refresh()}>Retry</button></div>}
      {loading ? <LoadingState label="Preparing scheduled deliveries…" /> : items.length ? <><div className="scheduled-delivery-list desktop-delivery-cards">{items.map(item => <DeliveryCard key={item._id} delivery={item} onRefresh={refresh} />)}</div><div className="mobile-delivery-list">{items.map(item => { const done = ["fully_delivered", "cancelled", "skipped", "zero_consumption"].includes(item.status); return <button className="mobile-delivery-card" key={item._id} onClick={() => setSelectedId(item._id)}><span className="mobile-delivery-card-head"><span><strong>{item.productName}</strong><small>{dateLabel(item.scheduledDate)} · {timeSlotLabel[item.timeSlot]}</small></span><b className={done ? "done" : item.status === "partially_delivered" ? "partial" : "pending"}>{item.status.replace("_", " ")}</b></span><span className="mobile-delivery-quantity"><small>Delivered</small><strong>{item.deliveredQuantity} / {item.expectedQuantity} {item.unit}</strong></span>{item.closeReason && <small className="mobile-delivery-reason">{item.closeReason}</small>}<span className="mobile-delivery-open-link">View or record delivery →</span></button>; })}</div></> : <div className="empty-state"><strong>No deliveries scheduled</strong><br />Add a product and set its delivery schedule to see items here.{!products.some(product => product.isActive && product.schedules.length) && <div><button className="button button-secondary empty-action" onClick={onAddProduct}>＋ Add product and schedule</button></div>}</div>}
      <button className="mobile-module-refresh" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh schedule"}</button>
    </section>
    <LegacyEntryPanel entries={legacyEntries} title="Earlier basic delivery entries" description="These generic entries are preserved separately; they are not linked to product schedules or included in the calculated monthly bill." />
    {selectedDelivery && <MobileDeliveryDetail delivery={selectedDelivery} onBack={() => setSelectedId("")} onRefresh={refresh} />}
  </>;
}
