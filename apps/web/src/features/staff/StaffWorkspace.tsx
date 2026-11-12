import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, AttendanceRecord, AttendanceStatus, Entry, HouseholdHoliday, StaffMember } from "../../api";
import { dateLabel, householdDateKey, money, monthTitle } from "../../lib/formatters";
import { LoadingState } from "../../components/feedback/LoadingState";
import { LegacyEntryPanel } from "../../components/LegacyEntryPanel";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";

const week = [{ value: 0, label: "Sun" }, { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" }, { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }];
const statusLabels: Record<string, string> = { present: "Present", absent: "Absent", pto: "Paid leave (PTO)", lop: "Unpaid leave (LOP)", weekly_off: "Weekly off", holiday: "Holiday", pending: "Not yet recorded" };

function HolidayCalendar({ month, holidays, onChanged }: { month: string; holidays: HouseholdHoliday[]; onChanged: () => Promise<void> }) {
  const [date, setDate] = useState(`${month}-01`), [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { setDate(`${month}-01`); }, [month]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api.saveHoliday({ date, name }); setName(""); await onChanged(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not save household holiday"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setError("");
    try { await api.deleteHoliday(id); await onChanged(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not remove holiday"); }
  }
  return <section className="household-holidays"><div className="panel-heading"><div><h3>Household holiday calendar</h3><p>Listed holidays are paid unless attendance is explicitly overridden.</p></div></div><form className="holiday-form" onSubmit={submit}><label>Date<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Holiday name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Diwali" /></label><button className="button button-secondary" disabled={busy}>{busy ? "Saving…" : "Add holiday"}</button></form>{error && <div className="form-error" role="alert">{error}</div>}{holidays.length ? <div className="holiday-list">{holidays.map(holiday => <div key={holiday._id}><span>{dateLabel(holiday.date)} · {holiday.name}</span><button className="text-link" onClick={() => void remove(holiday._id)}>Remove</button></div>)}</div> : <p className="empty-note">No household holidays for {month}.</p>}</section>;
}

function StaffForm({ staff, onClose, onSaved }: { staff?: StaffMember; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(staff?.name || ""), [joinDate, setJoinDate] = useState(staff?.joinDate || householdDateKey(new Date())), [endDate, setEndDate] = useState(staff?.endDate || ""), [weeklyOffDays, setWeeklyOffDays] = useState(staff?.weeklyOffDays || []), [weeklyOffPaid, setWeeklyOffPaid] = useState(staff?.weeklyOffPaid ?? true), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const monthlySalary = Number(new FormData(event.currentTarget).get("monthlySalary"));
    try {
      if (staff) await api.updateStaff(staff._id, { name, joinDate, ...(staff.isActive ? { endDate: endDate || null } : {}), weeklyOffDays, weeklyOffPaid });
      else await api.createStaff({ name, joinDate, monthlySalary, weeklyOffDays, weeklyOffPaid });
      await onSaved(); onClose();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not save staff member"); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="quick-modal entry-form staff-form" role="dialog" aria-modal="true" aria-labelledby="staff-form-title" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">{staff ? "EDIT STAFF PROFILE" : "NEW STAFF PROFILE"}</span><h2 id="staff-form-title">{staff ? staff.name : "Add staff member"}</h2></div><button type="button" className="close-button" aria-label="Close staff form" onClick={onClose}>×</button></div>
    <label>Name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
    <div className="form-grid"><label>Joining date<input required type="date" value={joinDate} onChange={event => setJoinDate(event.target.value)} /></label>{staff?.isActive ? <label>Leaving date (optional)<input type="date" min={joinDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label> : !staff && <label>Monthly salary (₹)<input required type="number" min="0" step="0.01" name="monthlySalary" /></label>}</div>
    <fieldset className="staff-weekly-offs"><legend>Weekly off days</legend><div className="weekday-options">{week.map(day => <label key={day.value}><input type="checkbox" checked={weeklyOffDays.includes(day.value)} onChange={event => setWeeklyOffDays(current => event.target.checked ? [...current, day.value].sort() : current.filter(value => value !== day.value))} /><span>{day.label}</span></label>)}</div><label className="staff-paid-off"><input type="checkbox" checked={weeklyOffPaid} onChange={event => setWeeklyOffPaid(event.target.checked)} /> Weekly offs are paid</label></fieldset>
    <p className="form-hint">Absence and LOP deduct one calendar-day rate. PTO and listed household holidays are paid. Weekly-off changes take effect today; salary changes are recorded separately with an effective date.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : staff ? "Save profile" : "Save staff member"}</button></div>
  </form></div>;
}

function SalaryRevisionForm({ staff, onClose, onSaved }: { staff: StaffMember; onClose: () => void; onSaved: () => Promise<void> }) {
  const [amount, setAmount] = useState(""), [effectiveFrom, setEffectiveFrom] = useState(householdDateKey(new Date())), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api.addSalaryRevision(staff._id, Number(amount), effectiveFrom); await onSaved(); onClose(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not add salary revision"); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="quick-modal entry-form" role="dialog" aria-modal="true" aria-labelledby="salary-revision-title" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">SALARY HISTORY</span><h2 id="salary-revision-title">Revise {staff.name}’s salary</h2></div><button type="button" className="close-button" aria-label="Close salary form" onClick={onClose}>×</button></div>
    <label>New monthly salary (₹)<input required type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label>Effective from<input required type="date" min={householdDateKey(new Date())} value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Add salary revision"}</button></div>
  </form></div>;
}

function AttendanceWorkspace({ staff, month, onMonthChange, onStaffChanged }: { staff: StaffMember[]; month: string; onMonthChange: (month: string) => void; onStaffChanged: () => Promise<void> }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`, monthEnd = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
  const availableStaff = staff.filter(member => member.joinDate <= monthEnd && (!member.endDate || member.endDate >= monthStart));
  const [staffId, setStaffId] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]), [holidays, setHolidays] = useState<HouseholdHoliday[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState(""), [drafts, setDrafts] = useState<Record<string, {status: AttendanceStatus | "pending"; reason: string}>>({}), [savingDate, setSavingDate] = useState("");
  useEffect(() => { if (!availableStaff.some(member => member._id === staffId)) setStaffId(availableStaff[0]?._id || ""); }, [staff, staffId, month]);
  async function reload() {
    setLoading(true); setError("");
    try {
      const [attendance, holidayRows] = await Promise.all([staffId ? api.attendance(month, staffId) : Promise.resolve([]), api.holidays(month)]);
      setRecords(attendance); setHolidays(holidayRows); setDrafts({});
    }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not load attendance"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, [staffId, month]);
  const selectedStaff = staff.find(member => member._id === staffId);
  const rows = useMemo(() => {
    if (!selectedStaff) return [];
    const [year, monthNumber] = month.split("-").map(Number), lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const today = householdDateKey(new Date()), saved = new Map(records.map(record => [record.date, record]));
    const result: Array<{date:string;weekday:number;record?:AttendanceRecord;status:AttendanceStatus | "pending"}> = [];
    for (let day = 1; day <= lastDay; day += 1) {
      const date = `${month}-${String(day).padStart(2,"0")}`;
      if (date < selectedStaff.joinDate || (selectedStaff.endDate && date > selectedStaff.endDate)) continue;
      const record = saved.get(date), weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      const weeklyPolicy = [...(selectedStaff.weeklyOffHistory || [])].filter(policy => policy.effectiveFrom <= date).sort((a,b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
      const weeklyOffDays = weeklyPolicy?.days || selectedStaff.weeklyOffDays;
      const status = record?.status || (holidays.some(holiday => holiday.date === date) ? "holiday" : weeklyOffDays.includes(weekday) ? "weekly_off" : date > today ? "pending" : "present");
      result.push({ date, weekday, record, status });
    }
    return result;
  }, [holidays, month, records, selectedStaff]);
  async function saveDay(date: string) {
    const draft = drafts[date];
    if (!draft || draft.status === "pending") return;
    if (["pto", "lop"].includes(draft.status) && !draft.reason.trim()) { setError("A reason is required for PTO and LOP."); return; }
    setSavingDate(date); setError("");
    try {
      await api.saveAttendance({ staffId, date, status: draft.status, reason: draft.reason });
      await reload(); await onStaffChanged();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not save attendance"); }
    finally { setSavingDate(""); }
  }
  async function resetDay(record?: AttendanceRecord) {
    if (!record) return;
    setError("");
    try { await api.deleteAttendance(record._id); await reload(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not reset attendance"); }
  }
  return <section className="panel domain-workspace">
    <div className="panel-heading"><div><h2>Attendance</h2><p>Select a staff profile and assign one status per date.</p></div><label className="domain-month">Month<input type="month" value={month} onChange={event => event.target.value && onMonthChange(event.target.value)} /></label></div>
    {error && <div className="api-error" role="alert">{error}</div>}
    <HolidayCalendar month={month} holidays={holidays} onChanged={reload} />
    <div className="attendance-filters"><label>Staff member<select value={staffId} onChange={event => setStaffId(event.target.value)}><option value="">Choose staff</option>{availableStaff.map(member => <option value={member._id} key={member._id}>{member.name}{member.isActive ? "" : " · inactive"}</option>)}</select></label>{selectedStaff && <span>{money(selectedStaff.currentMonthlySalary || 0)} monthly · {selectedStaff.weeklyOffPaid ? "paid" : "unpaid"} weekly offs</span>}</div>
    {!availableStaff.length ? <div className="empty-state">No staff employed in {month}. Add a staff profile before recording attendance.</div> : loading ? <LoadingState label="Loading attendance…" /> : <div className="attendance-day-list">{rows.map(row => {
      const draft = drafts[row.date] || { status: row.status, reason: row.record?.reason || "" };
      const changed = Boolean(drafts[row.date]);
      const defaultNote = !row.record && row.status === "present" ? " · default present" : !row.record && row.status === "pending" ? " · future date" : !row.record && row.status === "weekly_off" ? " · staff weekly-off policy" : !row.record && row.status === "holiday" ? " · household holiday" : "";
      return <article className="attendance-day" key={row.date}>
        <div className="attendance-day-title"><strong>{dateLabel(row.date)}</strong><small>{week[row.weekday].label}{defaultNote}</small></div>
        <label>Status<select value={draft.status} onChange={event => setDrafts(current => ({ ...current, [row.date]: { ...draft, status: event.target.value as AttendanceStatus | "pending" } }))}><option value="present">Present</option><option value="absent">Absent</option><option value="pto">Paid leave (PTO)</option><option value="lop">Unpaid leave (LOP)</option><option value="weekly_off">Weekly off</option><option value="holiday">Holiday</option>{row.status === "pending" && <option value="pending">Not yet recorded</option>}</select></label>
        {["pto", "lop"].includes(draft.status) && <label>Leave reason<input required value={draft.reason} onChange={event => setDrafts(current => ({ ...current, [row.date]: { ...draft, reason: event.target.value } }))} placeholder="Personal, family, illness…" /></label>}
        <div className="attendance-day-actions">{changed && draft.status !== "pending" && <button className="button button-primary" disabled={savingDate === row.date} onClick={() => void saveDay(row.date)}>{savingDate === row.date ? "Saving…" : "Save status"}</button>}{row.record && <button className="text-link" onClick={() => void resetDay(row.record)}>Reset to default</button>}</div>
      </article>;
    })}</div>}
  </section>;
}

export function StaffWorkspace({ staff, month, onMonthChange, onReload, onOpenSalary }: { staff: StaffMember[]; month: string; onMonthChange: (month: string) => void; onReload: () => Promise<void>; onOpenSalary: () => void }) {
  const [editing, setEditing] = useState<StaffMember | null | undefined>(undefined), [revision, setRevision] = useState<StaffMember | null>(null), [busyId, setBusyId] = useState(""), [error, setError] = useState("");
  async function endEmployment(member: StaffMember) {
    setBusyId(member._id); setError("");
    try { await api.updateStaff(member._id, { isActive: false, endDate: householdDateKey(new Date()) }); await onReload(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not update staff status"); }
    finally { setBusyId(""); }
  }
  async function restoreEmployment(member: StaffMember) {
    setBusyId(member._id); setError("");
    try { await api.updateStaff(member._id, { isActive: true, endDate: null }); await onReload(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not restore staff status"); }
    finally { setBusyId(""); }
  }
  return <>
    <div className="desktop-staff-flow">
    <section className="panel domain-workspace">
      <div className="panel-heading"><div><h2>Staff profiles</h2><p>Attendance and salary calculations use these linked profiles.</p></div><button className="button button-primary" onClick={() => setEditing(null)}>＋ Add staff</button></div>
      {error && <div className="api-error" role="alert">{error}</div>}
      {staff.length ? <div className="staff-directory">{staff.map(member => <article className={`staff-card ${member.isActive ? "" : "staff-inactive"}`} key={member._id}>
        <div className="staff-card-main"><div><span className={`domain-state ${member.isActive ? "active" : "inactive"}`}>{member.isActive ? "Active" : "Inactive"}</span><h3>{member.name}</h3><p>Joined {dateLabel(member.joinDate)}{member.endDate ? ` · ended ${dateLabel(member.endDate)}` : ""}</p><strong>{member.currentMonthlySalary === null ? "No salary rate effective" : `${money(member.currentMonthlySalary)} / month`}</strong><small>{member.weeklyOffDays.length ? `${member.weeklyOffDays.map(day => week[day].label).join(", ")} · ${member.weeklyOffPaid ? "paid" : "unpaid"}` : "No weekly off configured"}</small></div></div>
        <div className="staff-card-actions"><button className="button button-secondary" onClick={() => setEditing(member)}>Edit</button><button className="button button-secondary" disabled={!member.isActive} onClick={() => setRevision(member)}>Revise salary</button>{member.isActive ? <button className="text-link" disabled={busyId === member._id} onClick={() => void endEmployment(member)}>{busyId === member._id ? "Saving…" : "End employment"}</button> : <button className="text-link" disabled={busyId === member._id} onClick={() => void restoreEmployment(member)}>{busyId === member._id ? "Saving…" : "Restore"}</button>}</div>
        <details className="staff-history"><summary>Salary history</summary>{[...member.salaryHistory].sort((a,b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(item => <div key={item._id}><span>{dateLabel(item.effectiveFrom)}</span><strong>{money(item.amount)} / month</strong></div>)}</details>
        <details className="staff-history"><summary>Weekly-off history</summary>{[...(member.weeklyOffHistory || [])].sort((a,b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(item => <div key={item._id}><span>{dateLabel(item.effectiveFrom)} · {item.days.map(day => week[day].label).join(", ") || "no weekly off"}</span><strong>{item.paid ? "Paid" : "Unpaid"}</strong></div>)}</details>
      </article>)}</div> : <div className="empty-state">No staff profiles yet. Add a staff member to begin attendance tracking.</div>}
    </section>
    <AttendanceWorkspace staff={staff} month={month} onMonthChange={onMonthChange} onStaffChanged={onReload} />
    <section className="panel salary-link-panel"><div><h2>Salary calculations</h2><p>Review monthly earnings, absence/leave deductions and attendance breakdown.</p></div><button className="button button-secondary" onClick={onOpenSalary}>Open salary management →</button></section>
    </div>
    <MobileStaffWorkspace staff={staff} month={month} onMonthChange={onMonthChange} onReload={onReload} onOpenSalary={onOpenSalary} onEdit={member => setEditing(member)} onRevise={member => setRevision(member)} onEnd={endEmployment} onRestore={restoreEmployment} busyId={busyId} profileError={error} />
    {editing !== undefined && <StaffForm staff={editing || undefined} onClose={() => setEditing(undefined)} onSaved={onReload} />}
    {revision && <SalaryRevisionForm staff={revision} onClose={() => setRevision(null)} onSaved={onReload} />}
  </>;
}

const mobileAttendanceChoices: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: "Present" }, { value: "absent", label: "Absent" },
  { value: "pto", label: "Paid leave (PTO)" }, { value: "lop", label: "Unpaid leave (LOP)" },
  { value: "weekly_off", label: "Weekly off" }, { value: "holiday", label: "Holiday" },
];

function MobileStaffWorkspace({ staff, month, onMonthChange, onReload, onOpenSalary, onEdit, onRevise, onEnd, onRestore, busyId, profileError }: {
  staff: StaffMember[]; month: string; onMonthChange: (month: string) => void; onReload: () => Promise<void>; onOpenSalary: () => void;
  onEdit: (member: StaffMember | null) => void; onRevise: (member: StaffMember) => void; onEnd: (member: StaffMember) => Promise<void>; onRestore: (member: StaffMember) => Promise<void>; busyId: string; profileError: string;
}) {
  const today = householdDateKey(new Date());
  const [date, setDate] = useState(today), [holidayDate, setHolidayDate] = useState(`${month}-01`), [holidayName, setHolidayName] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]), [holidays, setHolidays] = useState<HouseholdHoliday[]>([]), [statements, setStatements] = useState<Awaited<ReturnType<typeof api.salaries>>["statements"]>([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(""), [holidayBusy, setHolidayBusy] = useState(false), [reason, setReason] = useState(""), [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 720px)").matches);
  async function load() {
    setError("");
    try {
      const [attendanceRows, holidayRows, salaryRows] = await Promise.all([api.attendance(month), api.holidays(month), api.salaries(month)]);
      setAttendance(attendanceRows); setHolidays(holidayRows); setStatements(salaryRows.statements);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to load staff and attendance."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)"), update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (isMobile) void load(); }, [month, isMobile]);
  useEffect(() => { setHolidayDate(`${month}-01`); }, [month]);
  function changeMonth(next: string) { setDate(`${next}-01`); onMonthChange(next); }
  function changeDate(next: string) { setDate(next); if (next && next.slice(0, 7) !== month) { onMonthChange(next.slice(0, 7)); setHolidayDate(`${next.slice(0, 7)}-01`); } }
  const holidayMap = new Map(holidays.map(item => [item.date, item]));
  const employed = staff.filter(member => member.joinDate <= date && (!member.endDate || member.endDate >= date));
  function effectiveStatus(member: StaffMember): AttendanceStatus | "pending" {
    const record = attendance.find(item => item.staffId === member._id && item.date === date);
    if (record) return record.status;
    if (holidayMap.has(date)) return "holiday";
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const policy = [...(member.weeklyOffHistory || [])].filter(item => item.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
    if ((policy?.days || member.weeklyOffDays).includes(weekday)) return "weekly_off";
    return date > today ? "pending" : "present";
  }
  async function mark(member: StaffMember, status: AttendanceStatus) {
    if (["pto", "lop"].includes(status) && !reason.trim()) { setError("Add a reason for paid or unpaid leave."); return; }
    setSaving(member._id); setError("");
    try { await api.saveAttendance({ staffId: member._id, date, status, ...(["pto", "lop"].includes(status) ? { reason: reason.trim() } : {}) }); setReason(""); await load(); await onReload(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save attendance."); }
    finally { setSaving(""); }
  }
  async function reset(record: AttendanceRecord) {
    setSaving(record.staffId); setError("");
    try { await api.deleteAttendance(record._id); await load(); await onReload(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to reset attendance."); }
    finally { setSaving(""); }
  }
  async function saveHoliday() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate) || holidayDate.slice(0, 7) !== month) { setError(`Choose a holiday date in ${month}.`); return; }
    if (!holidayName.trim()) { setError("Enter a holiday name."); return; }
    setHolidayBusy(true); setError("");
    try { await api.saveHoliday({ date: holidayDate, name: holidayName.trim() }); setHolidayName(""); await load(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save holiday."); }
    finally { setHolidayBusy(false); }
  }
  async function removeHoliday(item: HouseholdHoliday) {
    setHolidayBusy(true); setError("");
    try { await api.deleteHoliday(item._id); await load(); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to remove holiday."); }
    finally { setHolidayBusy(false); }
  }
  if (!isMobile) return null;
  return <div className="mobile-staff-flow">
    <section className="panel mobile-staff-section">
      <div className="mobile-staff-section-head"><h2>Staff profiles</h2><button className="button button-primary" onClick={() => onEdit(null)}>＋ Add staff</button></div>
      {loading && !staff.length ? <LoadingState label="Loading staff and attendance…" /> : staff.length ? staff.map(member => <article className="mobile-staff-card" key={member._id}>
        <div className="mobile-staff-profile"><div><strong>{member.name}</strong><small>{member.isActive ? "Active" : "Inactive"} · joined {dateLabel(member.joinDate)}{member.endDate ? ` · ended ${dateLabel(member.endDate)}` : ""}</small><small>{member.currentMonthlySalary === null ? "No salary set" : `Monthly salary ${money(member.currentMonthlySalary)}`}</small><small>{member.weeklyOffDays.length ? `${member.weeklyOffDays.map(day => week[day].label).join(", ")} · ${member.weeklyOffPaid ? "paid" : "unpaid"} weekly offs` : "No weekly off configured"}</small></div></div>
        <div className="mobile-staff-actions"><button onClick={() => onEdit(member)}>Edit profile</button><button disabled={!member.isActive} onClick={() => onRevise(member)}>Revise salary</button><button disabled={busyId === member._id} onClick={() => void(member.isActive ? onEnd(member) : onRestore(member))}>{member.isActive ? "End employment" : "Restore"}</button></div>
        {member.salaryHistory.length ? <details className="mobile-staff-history"><summary>Salary history</summary>{[...member.salaryHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(item => <div key={item._id}>{dateLabel(item.effectiveFrom)} · {money(item.amount)}</div>)}</details> : null}
      </article>) : <p className="mobile-staff-empty">No staff profiles yet. Add a staff member to begin attendance tracking.</p>}
    </section>
    <section className="panel mobile-staff-section">
      <h2>Attendance</h2><p className="mobile-staff-help">Past unmarked dates default to present. Future dates stay pending.</p>
      <MobileMonthPicker month={month} onChange={changeMonth} label="Attendance month" />
      <label className="mobile-staff-field">Attendance date<input type="date" value={date} onChange={event => changeDate(event.target.value)} /></label>
      {!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) || date.slice(0, 7) !== month ? <p className="mobile-staff-error">Enter a date in {month}.</p> : employed.length ? employed.map(member => {
        const record = attendance.find(item => item.staffId === member._id && item.date === date), status = effectiveStatus(member);
        return <article className="mobile-attendance-card" key={member._id}><div className="mobile-attendance-heading"><strong>{member.name}</strong><span>{status.replace("_", " ")}{record ? " · recorded" : " · default"}</span></div>
          {(status === "pto" || status === "lop") && <small>Reason: {record?.reason || "—"}</small>}
          <div className="mobile-attendance-choices">{mobileAttendanceChoices.map(choice => <button key={choice.value} className={status === choice.value ? "active" : ""} disabled={saving === member._id} onClick={() => void mark(member, choice.value)}>{choice.label}</button>)}</div>
          {record && <button className="mobile-reset-attendance" disabled={saving === member._id} onClick={() => void reset(record)}>Reset to default</button>}
        </article>;
      }) : <p className="mobile-staff-help">No staff employed on this date.</p>}
      <label className="mobile-staff-field">PTO / LOP reason (required for leave)<input value={reason} onChange={event => setReason(event.target.value)} placeholder="Personal, illness…" /></label>
    </section>
    <section className="panel mobile-staff-section">
      <h2>Household holiday calendar</h2><p className="mobile-staff-help">Listed holidays are paid by default unless attendance is explicitly overridden.</p>
      <MobileMonthPicker month={month} onChange={changeMonth} label="Holiday month" />
      <label className="mobile-staff-field">Holiday date<input type="date" value={holidayDate} min={`${month}-01`} max={`${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`} onChange={event => setHolidayDate(event.target.value)} /></label>
      <label className="mobile-staff-field">Holiday name<input value={holidayName} onChange={event => setHolidayName(event.target.value)} placeholder="e.g. Diwali" /></label>
      <button className="button button-primary mobile-staff-holiday-add" disabled={holidayBusy} onClick={() => void saveHoliday()}>{holidayBusy ? "Saving…" : "Add holiday"}</button>
      {holidays.length ? holidays.map(item => <div className="mobile-holiday-row" key={item._id}><span>{dateLabel(item.date)} · {item.name}</span><button disabled={holidayBusy} onClick={() => void removeHoliday(item)}>Remove</button></div>) : <p className="mobile-staff-help">No holidays for {month}.</p>}
    </section>
    <section className="panel mobile-staff-section">
      <h2>Salary estimate · {month}</h2>
      {statements.map(line => <div className="mobile-salary-estimate" key={line.staffId}><div><strong>{line.staffName}</strong><small>Gross {money(line.grossSalary)} · deductions {money(line.deductions)}</small></div><b>{money(line.netPayable)}</b></div>)}
      <p className="mobile-staff-help">Open Salary management from More for the daily breakdown.</p>
      <button className="mobile-open-salary" onClick={onOpenSalary}>Open salary management →</button>
    </section>
    {(error || profileError) && <div className="api-error" role="alert">{error || profileError}</div>}
  </div>;
}

export function SalaryWorkspace({ staff, month, legacyEntries, onMonthChange, onOpenAttendance }: { staff: StaffMember[]; month: string; legacyEntries: Entry[]; onMonthChange: (month: string) => void; onOpenAttendance: () => void }) {
  const [statements, setStatements] = useState<Awaited<ReturnType<typeof api.salaries>>["statements"]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [expanded, setExpanded] = useState<string[]>([]);
  async function reload() {
    setLoading(true); setError("");
    try { setStatements((await api.salaries(month)).statements); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not calculate salary"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, [month, staff]);
  const totals = statements.reduce((sum, line) => ({ gross: sum.gross + line.grossSalary, deductions: sum.deductions + line.deductions, net: sum.net + line.netPayable }), { gross: 0, deductions: 0, net: 0 });
  return <>
    <MobileMonthPicker month={month} onChange={onMonthChange} label="Salary month" />
    <section className="panel mobile-salary-total"><span>TOTAL ESTIMATED PAYABLE · {monthTitle(month)}</span><strong>{loading ? "—" : money(totals.net)}</strong><div><span>Gross {money(totals.gross)}</span><span>Deductions −{money(totals.deductions)}</span></div><p>Unmarked past dates count as present. Future dates remain pending and are not deducted.</p></section>
    <section className="stat-grid bill-summary desktop-salary-summary">
      <article className="stat-card"><div className="stat-top"><span className="stat-label">GROSS SALARY</span><span className="stat-icon blue">₹</span></div><div className="stat-value">{loading ? "—" : money(totals.gross)}</div><div className="stat-foot">Prorated by employment dates</div></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-label">DEDUCTIONS</span><span className="stat-icon orange">−</span></div><div className="stat-value">{loading ? "—" : money(totals.deductions)}</div><div className="stat-foot">Absence, LOP and unpaid weekly offs</div></article>
      <article className="stat-card"><div className="stat-top"><span className="stat-label">ESTIMATED PAYABLE</span><span className="stat-icon green">₹</span></div><div className="stat-value">{loading ? "—" : money(totals.net)}</div><div className="stat-foot">Live calculation for {month}</div></article>
    </section>
    <section className="panel domain-workspace salary-workspace">
      <div className="panel-heading salary-workspace-heading"><div><h2>Attendance-based salary</h2><p>Daily rate = effective monthly salary ÷ calendar days in the month.</p></div><label className="domain-month">Salary month<input type="month" value={month} onChange={event => event.target.value && onMonthChange(event.target.value)} /></label></div>
      <div className="feature-limit desktop-only-note" role="note">Unmarked past dates count as present. Future dates remain pending and are included in the salary estimate without being counted as present or deducted. Explicit absences and LOP deduct one daily rate.</div>
      {error && <div className="api-error" role="alert"><strong>Salary could not be calculated</strong><span>{error}</span><button onClick={() => void reload()}>Retry</button></div>}
      {loading ? <LoadingState label="Calculating attendance-based salary…" /> : statements.length ? <div className="salary-statement-list">{statements.map(line => <article className="salary-statement" key={line.staffId}>
        <div className="salary-statement-head"><div><h3>{line.staffName}</h3><p>{line.employedDays} employed calendar days · salary range {dateLabel(line.joinDate)}{line.endDate ? ` to ${dateLabel(line.endDate)}` : ""}</p><p className="salary-mobile-counts">Present {line.counts.present} · absent {line.counts.absent} · PTO {line.counts.pto} · LOP {line.counts.lop}<br />Weekly off {line.counts.weeklyOff} · holidays {line.counts.holiday}</p></div><div><strong>{money(line.netPayable)}</strong><small>Estimated payable</small></div></div>
        <div className="salary-count-grid"><span>Present<strong>{line.counts.present}</strong></span><span>Absent<strong>{line.counts.absent}</strong></span><span>PTO<strong>{line.counts.pto}</strong></span><span>LOP<strong>{line.counts.lop}</strong></span><span>Paid weekly off<strong>{line.counts.paidWeeklyOff}</strong></span><span>Unpaid weekly off<strong>{line.counts.unpaidWeeklyOff}</strong></span><span>Holiday<strong>{line.counts.holiday}</strong></span><span>Unmarked, counted present<strong>{line.counts.unmarkedPresentDays}</strong></span><span>Future, pending<strong>{line.counts.pendingAttendance}</strong></span></div>
        <p className="salary-pending-count">{line.counts.pendingAttendance} future attendance days pending</p>
        <div className="salary-money-row"><span>Gross {money(line.grossSalary)}</span><span>Deductions −{money(line.deductions)}</span><button className="text-link" aria-expanded={expanded.includes(line.staffId)} onClick={() => setExpanded(current => current.includes(line.staffId) ? current.filter(id => id !== line.staffId) : [...current, line.staffId])}>{expanded.includes(line.staffId) ? "Hide daily breakdown" : "View daily breakdown"}</button></div>
        {line.counts.unmarkedPresentDays > 0 && <p className="salary-defaults">{line.counts.unmarkedPresentDays} unmarked past date(s) count as present. Record absences or leave to apply deductions.</p>}
        {expanded.includes(line.staffId) && <div className="salary-daily-list">{line.dailyBreakdown.map(day => <div key={day.date}><span>{dateLabel(day.date)} · {day.weekday}</span><strong>{statusLabels[day.status] || day.status}</strong><small>{day.source}{day.reason ? ` · ${day.reason}` : ""}</small><span>{day.deduction ? `−${money(day.deduction)}` : "No deduction"}</span></div>)}</div>}
      </article>)}</div> : <div className="empty-state">No staff employed in {month}. Add a staff profile or choose another month.</div>}
    </section>
    <section className="panel salary-link-panel"><div><h2>Need to correct attendance?</h2><p>Attendance changes flow into this salary calculation automatically.</p></div><button className="button button-secondary" onClick={onOpenAttendance}>Open attendance to make corrections →</button></section>
    <LegacyEntryPanel entries={legacyEntries} title="Earlier manual salary entries" description="These generic salary amounts are preserved separately and are not included in this attendance-based calculation." />
  </>;
}
