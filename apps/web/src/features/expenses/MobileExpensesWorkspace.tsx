import { FormEvent, useEffect, useState } from "react";
import { api, Entry } from "../../api";
import { householdDateKey, money } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";

export function MobileExpensesWorkspace() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(householdDateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 720px)").matches);
  async function load() {
    setError("");
    try { setEntries((await api.entries()).filter(entry => entry.type === "expense").sort((a, b) => b.date.localeCompare(a.date))); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to load expenses."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)"), update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (isMobile) void load(); }, [isMobile]);
  function startAdd() {
    setEditing(null); setName(""); setCategory(""); setAmount(""); setDate(householdDateKey(new Date())); setNotes(""); setError(""); setOpen(true);
  }
  function startEdit(entry: Entry) {
    setEditing(entry); setName(entry.name); setCategory(entry.category || ""); setAmount(String(entry.amount)); setDate(entry.date.slice(0, 10)); setNotes(entry.notes || ""); setError(""); setOpen(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!name.trim()) { setError("Enter what the expense was for."); return; }
    if (!Number.isFinite(value) || value <= 0) { setError("Enter an amount greater than zero."); return; }
    setSaving(true); setError("");
    try {
      const input = { name: name.trim(), category: category.trim(), amount: value, date, status: "recorded", notes };
      if (editing) await api.updateEntry(editing._id, input);
      else await api.createEntry({ type: "expense", ...input });
      setOpen(false); await load();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save expense."); }
    finally { setSaving(false); }
  }
  async function remove(entry: Entry) {
    setSaving(true); setError("");
    try { await api.deleteEntry(entry._id); setRemoving(null); await load(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to delete expense."); }
    finally { setSaving(false); }
  }
  if (!isMobile) return null;
  return <div className="mobile-expenses-flow">
    <button className="mobile-expense-add" onClick={startAdd}><span aria-hidden="true">＋</span> Add expense</button>
    {error && !open && <div className="api-error" role="alert">{error}</div>}
    {loading ? <LoadingState label="Loading expenses…" /> : entries.length ? entries.map(entry => <article className="mobile-expense-card" key={entry._id}>
      <div className="mobile-expense-row"><div><strong>{entry.name}</strong><small>{entry.category || "General"} · {entry.date.slice(0, 10)}</small>{entry.notes && <small>{entry.notes}</small>}</div><b>{money(entry.amount)}</b></div>
      <div className="mobile-expense-actions"><button onClick={() => startEdit(entry)}>Edit</button>{removing === entry._id ? <div className="mobile-expense-confirm"><span>Delete this expense?</span><button onClick={() => setRemoving(null)}>Keep</button><button disabled={saving} onClick={() => void remove(entry)}>Delete</button></div> : <button className="delete" onClick={() => setRemoving(entry._id)}>Delete</button>}</div>
    </article>) : <section className="panel mobile-expense-empty"><strong>No expenses recorded yet</strong><p>Add an expense to start building your ledger.</p></section>}
    {open && <div className="modal-backdrop mobile-expense-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
      <form className="quick-modal mobile-expense-form" role="dialog" aria-modal="true" aria-labelledby="mobile-expense-title" onSubmit={submit}>
        <div className="mobile-expense-modal-head"><h2 id="mobile-expense-title">{editing ? "Edit expense" : "Add expense"}</h2><button type="button" aria-label="Close expense form" onClick={() => setOpen(false)}>×</button></div>
        <label>What was it for?<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Expense name" /></label>
        <label>Category (optional)<input value={category} onChange={event => setCategory(event.target.value)} placeholder="General" /></label>
        <label>Amount<input inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" /></label>
        <label>Payment date<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        <label>Notes (optional)<textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button-primary mobile-expense-save" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Save expense"}</button>
      </form>
    </div>}
  </div>;
}
