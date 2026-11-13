import { FormEvent, useEffect, useState } from "react";
import { api, RecurringExpenseInput, RecurringExpensePolicy } from "../../api";
import { money } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";

export function RecurringExpensesPanel({ month, onReload }: { month: string; onReload: () => Promise<void> }) {
  const [policies, setPolicies] = useState<RecurringExpensePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpensePolicy | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [startsOn, setStartsOn] = useState(`${month}-01`);
  const [endsOn, setEndsOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try { setPolicies(await api.recurringExpenses()); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to load recurring expenses."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function startAdd() {
    setEditing(null); setName(""); setCategory(""); setAmount(""); setDay("1"); setStartsOn(`${month}-01`); setEndsOn(""); setNotes(""); setError(""); setOpen(true);
  }
  function startEdit(policy: RecurringExpensePolicy) {
    setEditing(policy); setName(policy.name); setCategory(policy.category || ""); setAmount(String(policy.amount)); setDay(String(policy.dayOfMonth)); setStartsOn(policy.startsOn); setEndsOn(policy.endsOn || ""); setNotes(policy.notes || ""); setError(""); setOpen(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || Number(amount) <= 0) { setError("Enter an expense name and an amount greater than zero."); return; }
    setBusy(true); setError("");
    const input: RecurringExpenseInput = { name: name.trim(), category: category.trim(), amount: Number(amount), dayOfMonth: Number(day), startsOn, endsOn: endsOn || null, notes: notes.trim() };
    try { if (editing) await api.updateRecurringExpense(editing._id, input); else await api.createRecurringExpense(input); setOpen(false); await load(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save policy."); }
    finally { setBusy(false); }
  }
  async function toggle(policy: RecurringExpensePolicy) {
    setBusy(true); setError("");
    try { await api.updateRecurringExpense(policy._id, { isActive: !policy.isActive }); await load(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to update policy."); }
    finally { setBusy(false); }
  }
  async function remove(policy: RecurringExpensePolicy) {
    if (!window.confirm(`Delete the ${policy.name} recurring policy? Existing ledger entries will stay.`)) return;
    setBusy(true); setError("");
    try { await api.deleteRecurringExpense(policy._id); await load(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to delete policy."); }
    finally { setBusy(false); }
  }
  async function generate() {
    setBusy(true); setError(""); setMessage("");
    try { const result = await api.generateRecurringExpenses(month); setMessage(`${result.count} scheduled expense${result.count === 1 ? "" : "s"} ready for ${month}.`); await onReload(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to generate expenses."); }
    finally { setBusy(false); }
  }
  return <section className="panel recurring-expenses-panel">
    <div className="panel-heading"><div><h2>Recurring expense policies</h2><p>Schedule monthly expenses into your ledger as upcoming items.</p></div><button className="button button-primary" onClick={startAdd}>＋ Add policy</button></div>
    <div className="recurring-expense-toolbar"><button className="button button-secondary" disabled={busy || !policies.some(policy => policy.isActive)} onClick={() => void generate()}>Prepare {month}</button><span>Runs safely more than once; existing items are kept.</span></div>
    {message && <div className="success-note" role="status">{message}</div>}{error && !open && <div className="api-error" role="alert">{error}</div>}
    {loading ? <LoadingState label="Loading recurring expenses…" /> : policies.length ? <div className="recurring-expense-list">{policies.map(policy => <article className="recurring-expense-item" key={policy._id}>
      <div><strong>{policy.name}</strong><small>{policy.category || "General"} · {money(policy.amount)} · monthly on day {policy.dayOfMonth}</small><small>{policy.startsOn}{policy.endsOn ? ` to ${policy.endsOn}` : " · no end date"}{!policy.isActive ? " · paused" : ""}</small></div>
      <div className="recurring-expense-actions"><button disabled={busy} onClick={() => startEdit(policy)}>Edit</button><button disabled={busy} onClick={() => void toggle(policy)}>{policy.isActive ? "Pause" : "Resume"}</button><button className="delete" disabled={busy} onClick={() => void remove(policy)}>Delete</button></div>
    </article>)}</div> : <div className="recurring-expense-empty">No recurring policies yet. Add one for rent, utilities, or another monthly cost.</div>}
    {open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><form className="quick-modal recurring-expense-form" role="dialog" aria-modal="true" aria-labelledby="recurring-expense-title" onSubmit={submit}>
      <div className="panel-heading"><div><h2 id="recurring-expense-title">{editing ? "Edit recurring expense" : "Add recurring expense"}</h2></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}>×</button></div>
      <label>Expense name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="Rent" /></label>
      <label>Category<input value={category} onChange={event => setCategory(event.target.value)} placeholder="Housing" /></label>
      <div className="recurring-expense-fields"><label>Amount<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>Day each month<input required type="number" min="1" max="31" value={day} onChange={event => setDay(event.target.value)} /></label></div>
      <div className="recurring-expense-fields"><label>Starts on<input required type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} /></label><label>Ends on (optional)<input type="date" value={endsOn} onChange={event => setEndsOn(event.target.value)} /></label></div>
      <label>Notes<input value={notes} onChange={event => setNotes(event.target.value)} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create policy"}</button>
    </form></div>}
  </section>;
}
