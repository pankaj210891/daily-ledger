import { FormEvent, useEffect, useRef, useState } from "react";
import { api, Entry, Product, ProductInput, ProductSchedule, ScheduleFrequency, TimeSlot } from "../../api";
import { dateLabel, householdDateKey, money } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";
import { LegacyEntryPanel } from "../../components/LegacyEntryPanel";

const timeSlots: { value: TimeSlot; label: string }[] = [
  { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" }, { value: "night", label: "Night" }
];
const weekdays = [{ value: 0, label: "Sun" }, { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" }, { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }];
const productUnits = ["litre", "ml", "kg", "gram", "packet", "piece", "dozen"];
function defaultSchedule(timeSlot: TimeSlot): ProductSchedule {
  return { timeSlot, frequency: "daily", weekdays: [], startsOn: householdDateKey(new Date()), expectedQuantity: 1 };
}
function firstScheduleDate(schedules: ProductSchedule[]) {
  return schedules.length ? schedules.map(schedule => schedule.startsOn).sort()[0] : householdDateKey(new Date());
}

function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(product?.name || ""), [unit, setUnit] = useState(product?.unit || ""), [customUnitMode, setCustomUnitMode] = useState(Boolean(product?.unit && !productUnits.includes(product.unit))), [rate, setRate] = useState(product?.currentRate?.toString() || ""), [schedules, setSchedules] = useState<ProductSchedule[]>(product?.schedules || []), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  useEffect(() => { dialogRef.current?.querySelector<HTMLElement>("input,button")?.focus(); }, []);
  function updateSchedule(slot: TimeSlot, patch: Partial<ProductSchedule>) {
    setSchedules(current => current.map(item => item.timeSlot === slot ? { ...item, ...patch } : item));
  }
  function toggleSlot(slot: TimeSlot, enabled: boolean) {
    setSchedules(current => enabled ? [...current, defaultSchedule(slot)] : current.filter(item => item.timeSlot !== slot));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const scheduleInputs = schedules.map(({ _id, ...schedule }) => ({ ...schedule, weekdays: schedule.frequency === "selected_weekdays" ? schedule.weekdays : [], everyDays: schedule.frequency === "every_x_days" ? (schedule.everyDays || 2) : undefined, anchorDate: schedule.frequency === "every_x_days" ? (schedule.anchorDate || schedule.startsOn) : undefined }));
    try {
      if (product) await api.updateProduct(product._id, { name, unit, schedules: scheduleInputs });
      else await api.createProduct({ name, unit, rate: Number(rate), rateEffectiveFrom: firstScheduleDate(schedules), schedules: scheduleInputs } as ProductInput);
      await onSaved(); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save product"); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form ref={dialogRef} className="quick-modal entry-form product-form" role="dialog" aria-modal="true" aria-labelledby="product-form-title" onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow">{product ? "EDIT PRODUCT" : "NEW PRODUCT"}</span><h2 id="product-form-title">{product ? "Product details" : "Add a product"}</h2></div><button type="button" className="close-button" aria-label="Close product form" onClick={onClose}>×</button></div>
      <label>Product name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Milk" /></label>
      <div className="form-grid"><label>Unit<select required value={customUnitMode ? "__custom__" : unit} onChange={event => { if (event.target.value === "__custom__") { setCustomUnitMode(true); setUnit(""); } else { setCustomUnitMode(false); setUnit(event.target.value); } }}><option value="" disabled>Select a unit</option>{productUnits.map(value => <option key={value} value={value}>{value}</option>)}<option value="__custom__">Other…</option></select>{customUnitMode && <input required maxLength={30} value={unit} onChange={event => setUnit(event.target.value)} placeholder="Enter a unit" aria-label="Custom unit" />}</label>{!product && <label>Starting rate (₹)<input required type="number" min="0" max="100000000" step="0.01" value={rate} onChange={event => setRate(event.target.value)} placeholder="0.00" /></label>}</div>
      {product && <p className="form-hint">Rate history is managed separately. Editing product details will not change existing rates or generated delivery records.</p>}
      <fieldset className="schedule-editor"><legend>Delivery schedule</legend><p>Set expected quantity for each scheduled time slot. You can change schedules later; already generated dates keep their original quantities.</p>
        {timeSlots.map(slot => {
          const schedule = schedules.find(item => item.timeSlot === slot.value);
          return <div className="schedule-config" key={slot.value}>
            <label className="schedule-toggle"><input className="schedule-toggle-input" type="checkbox" checked={Boolean(schedule)} onChange={event => toggleSlot(slot.value, event.target.checked)} /><span className={`schedule-toggle-icon${schedule ? " is-selected" : ""}`} aria-hidden="true">{schedule ? "✓" : "+"}</span><span>{slot.label}</span></label>
            {schedule && <div className="schedule-fields">
              <div className="form-grid"><label>Pattern<select value={schedule.frequency} onChange={event => updateSchedule(slot.value, { frequency: event.target.value as ScheduleFrequency, weekdays: event.target.value === "selected_weekdays" ? (schedule.weekdays.length ? schedule.weekdays : [1,2,3,4,5]) : [] })}><option value="daily">Daily</option><option value="selected_weekdays">Selected weekdays</option><option value="every_x_days">Every X days</option></select></label><label>Expected quantity ({unit || "unit"})<input type="number" min="0.01" max="1000000" step="0.01" required value={schedule.expectedQuantity} onChange={event => updateSchedule(slot.value, { expectedQuantity: Number(event.target.value) })} /></label></div>
              {schedule.frequency === "selected_weekdays" && <div className="weekday-options" aria-label={`${slot.label} weekdays`}>{weekdays.map(day => <label key={day.value}><input type="checkbox" checked={schedule.weekdays.includes(day.value)} onChange={event => updateSchedule(slot.value, { weekdays: event.target.checked ? [...schedule.weekdays, day.value].sort() : schedule.weekdays.filter(value => value !== day.value) })} /><span>{day.label}</span></label>)}</div>}
              {schedule.frequency === "every_x_days" && <div className="form-grid"><label>Repeat every (days)<input type="number" min="1" max="365" required value={schedule.everyDays || 2} onChange={event => updateSchedule(slot.value, { everyDays: Number(event.target.value) })} /></label><label>Cycle anchor date<input type="date" required value={schedule.anchorDate || schedule.startsOn} onChange={event => updateSchedule(slot.value, { anchorDate: event.target.value })} /></label></div>}
              <div className="form-grid"><label>Starts on<input type="date" required value={schedule.startsOn} onChange={event => updateSchedule(slot.value, { startsOn: event.target.value, ...(schedule.frequency === "every_x_days" && schedule.anchorDate === schedule.startsOn ? { anchorDate: event.target.value } : {}) })} /></label><label>Ends on (optional)<input type="date" min={schedule.startsOn} value={schedule.endsOn || ""} onChange={event => updateSchedule(slot.value, { endsOn: event.target.value || undefined })} /></label></div>
              {schedule.frequency === "selected_weekdays" && !schedule.weekdays.length && <small className="field-error">Select at least one weekday.</small>}
            </div>}
          </div>;
        })}
      </fieldset>
      {error && <div role="alert" className="form-error">{error}</div>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy || schedules.some(item => item.frequency === "selected_weekdays" && !item.weekdays.length)}>{busy ? "Saving…" : product ? "Save product" : "Create product"}</button></div>
    </form>
  </div>;
}

function RateForm({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => Promise<void> }) {
  const [amount, setAmount] = useState(""), [effectiveFrom, setEffectiveFrom] = useState(householdDateKey(new Date())), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await api.addProductRate(product._id, Number(amount), effectiveFrom); await onSaved(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add rate"); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="quick-modal entry-form" role="dialog" aria-modal="true" aria-labelledby="rate-form-title" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">RATE HISTORY</span><h2 id="rate-form-title">Change {product.name} rate</h2></div><button type="button" className="close-button" aria-label="Close rate form" onClick={onClose}>×</button></div>
    <label>New rate (₹ per {product.unit})<input required type="number" min="0" max="100000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label>Effective from<input required type="date" min={householdDateKey(new Date())} value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} /></label>
    <p className="form-hint">A rate cannot be backdated. Existing scheduled dates keep the rate applicable to their scheduled date.</p>
    {error && <div role="alert" className="form-error">{error}</div>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Add rate"}</button></div>
  </form></div>;
}

function ProductCard({ product, onEdit, onRate, onToggleActive }: { product: Product; onEdit: () => void; onRate: () => void; onToggleActive: () => void }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const scheduleText = product.schedules.length ? product.schedules.map(schedule => `${schedule.timeSlot} · ${schedule.frequency.replace(/_/g, " ")} · ${schedule.expectedQuantity} ${product.unit} · from ${dateLabel(schedule.startsOn)}${schedule.endsOn ? ` to ${dateLabel(schedule.endsOn)}` : " · no end date"}`).join(" · ") : "No delivery schedule configured";
  return <article className={`domain-card ${product.isActive ? "" : "domain-card-inactive"}`}>
    <div className="domain-card-heading"><div><div className="domain-card-title"><h3>{product.name}</h3><span className={`domain-state ${product.isActive ? "active" : "inactive"}`}>{product.isActive ? "Active" : "Archived"}</span></div><p>{product.unit} · {product.currentRate === null ? "No rate effective today" : `${money(product.currentRate)} / ${product.unit}`}{product.currentRateEffectiveFrom ? ` · from ${dateLabel(product.currentRateEffectiveFrom)}` : ""}</p></div></div>
    <p className="domain-card-schedule">{scheduleText}</p>
    <div className="domain-card-actions"><button className="button button-secondary" onClick={onEdit}>Edit</button><button className="button button-secondary" disabled={!product.isActive} onClick={onRate}>Add rate</button><button className="text-link" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>{historyOpen ? "Hide rate history" : `View rate history (${product.rates?.length || 0})`}</button><button className="text-link archive-action" onClick={onToggleActive}>{product.isActive ? "Archive" : "Restore"}</button></div>
    {historyOpen && <div className="rate-history" aria-label={`${product.name} rate history`}>{product.rates.length ? [...product.rates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(rate => <div key={rate._id}><span>{dateLabel(rate.effectiveFrom)}</span><strong>{money(rate.amount)} / {product.unit}</strong></div>) : <p>No rates recorded.</p>}</div>}
  </article>;
}

export function ProductsWorkspace({ products, legacyEntries, loading, onReload, createRequested, onCreateHandled }: { products: Product[]; legacyEntries: Entry[]; loading: boolean; onReload: () => Promise<void>; createRequested: boolean; onCreateHandled: () => void }) {
  const [editing, setEditing] = useState<Product | null | undefined>(undefined), [rateProduct, setRateProduct] = useState<Product | null>(null), [error, setError] = useState(""), [busyId, setBusyId] = useState("");
  useEffect(() => { if (createRequested) { setEditing(null); onCreateHandled(); } }, [createRequested, onCreateHandled]);
  const activeCount = products.filter(product => product.isActive).length;
  async function toggleActive(product: Product) {
    setError(""); setBusyId(product._id);
    try { await api.updateProduct(product._id, { isActive: !product.isActive }); await onReload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update product"); }
    finally { setBusyId(""); }
  }
  return <>
    <section className="stat-grid phase-summary"><article className="stat-card"><div className="stat-top"><span className="stat-label">ACTIVE PRODUCTS</span><span className="stat-icon blue">▤</span></div><div className="stat-value">{activeCount}</div><div className="stat-foot">Of {products.length} saved products</div></article><article className="stat-card"><div className="stat-top"><span className="stat-label">SCHEDULED SLOTS</span><span className="stat-icon purple">◷</span></div><div className="stat-value">{products.filter(product => product.isActive).reduce((sum, product) => sum + product.schedules.length, 0)}</div><div className="stat-foot">Across active products</div></article></section>
    <section className="panel domain-workspace products-workspace"><div className="panel-heading"><div><h2>Products and rates</h2><p>Current product setup and effective-dated rate history.</p></div><button className="button button-primary" onClick={() => setEditing(null)}>＋ Add product</button></div>
      <div className="feature-limit desktop-only-note" role="note">Expected quantity is configured per product and time slot. Rate history is append-only; rates take effect today or later and generated delivery dates retain their original snapshots.</div>
      {error && <div className="api-error" role="alert"><span>{error}</span></div>}
      {loading ? <LoadingState label="Loading products…" /> : products.length ? <div className="domain-card-list">{products.map(product => <div key={product._id} className="domain-card-wrap"><ProductCard product={product} onEdit={() => setEditing(product)} onRate={() => setRateProduct(product)} onToggleActive={() => void toggleActive(product)} />{busyId === product._id && <small className="inline-loading">Saving product status…</small>}</div>)}</div> : <div className="empty-state"><strong>No products yet.</strong><br />Add a product to configure its rate and delivery schedule.</div>}
    </section>
    <LegacyEntryPanel entries={legacyEntries} title="Earlier basic product entries" description="These generic ledger records are preserved, but are not domain products and are not included in schedules or bills." />
    {editing !== undefined && <ProductForm product={editing} onClose={() => setEditing(undefined)} onSaved={onReload} />}
    {rateProduct && <RateForm product={rateProduct} onClose={() => setRateProduct(null)} onSaved={onReload} />}
  </>;
}
