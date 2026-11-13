import { FormEvent, useState } from "react";
import { api, StaffMember } from "../../api";
import { householdDateKey } from "../../lib/formatters";
import { week } from "./staffOptions";

export function StaffForm({
  staff,
  onClose,
  onSaved,
}: {
  staff?: StaffMember;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(staff?.name || ""),
    [joinDate, setJoinDate] = useState(
      staff?.joinDate || householdDateKey(new Date()),
    ),
    [salaryPayDay, setSalaryPayDay] = useState(String(staff?.salaryPayDay ?? 1)),
    [endDate, setEndDate] = useState(staff?.endDate || ""),
    [weeklyOffDays, setWeeklyOffDays] = useState(staff?.weeklyOffDays || []),
    [weeklyOffPaid, setWeeklyOffPaid] = useState(staff?.weeklyOffPaid ?? true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const monthlySalary = Number(
      new FormData(event.currentTarget).get("monthlySalary"),
    );
    try {
      if (staff)
        await api.updateStaff(staff._id, {
          name,
          joinDate,
          salaryPayDay: Number(salaryPayDay),
          ...(staff.isActive ? { endDate: endDate || null } : {}),
          weeklyOffDays,
          weeklyOffPaid,
        });
      else
        await api.createStaff({
          name,
          joinDate,
          salaryPayDay: Number(salaryPayDay),
          monthlySalary,
          weeklyOffDays,
          weeklyOffPaid,
        });
      await onSaved();
      onClose();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not save staff member",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="quick-modal entry-form staff-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-title"
        onSubmit={submit}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {staff ? "EDIT STAFF PROFILE" : "NEW STAFF PROFILE"}
            </span>
            <h2 id="staff-form-title">
              {staff ? staff.name : "Add staff member"}
            </h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="Close staff form"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <label>
          Name
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Joining date
            <input
              required
              type="date"
              value={joinDate}
              onChange={(event) => setJoinDate(event.target.value)}
            />
          </label>
          <label>
            Salary payday (day of month)
            <input
              required
              type="number"
              min="1"
              max="31"
              value={salaryPayDay}
              onChange={(event) => setSalaryPayDay(event.target.value)}
            />
          </label>
          {staff?.isActive ? (
            <label>
              Leaving date (optional)
              <input
                type="date"
                min={joinDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          ) : (
            !staff && (
              <label>
                Monthly salary (₹)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  name="monthlySalary"
                />
              </label>
            )
          )}
        </div>
        <fieldset className="staff-weekly-offs">
          <legend>Weekly off days</legend>
          <div className="weekday-options">
            {week.map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  checked={weeklyOffDays.includes(day.value)}
                  onChange={(event) =>
                    setWeeklyOffDays((current) =>
                      event.target.checked
                        ? [...current, day.value].sort()
                        : current.filter((value) => value !== day.value),
                    )
                  }
                />
                <span>{day.label}</span>
              </label>
            ))}
          </div>
          <label className="staff-paid-off">
            <input
              type="checkbox"
              checked={weeklyOffPaid}
              onChange={(event) => setWeeklyOffPaid(event.target.checked)}
            />{" "}
            Weekly offs are paid
          </label>
        </fieldset>
        <p className="form-hint">
          Absence and LOP deduct one calendar-day rate. PTO and listed household
          holidays are paid. Weekly-off changes take effect today; salary
          changes are recorded separately with an effective date. Payday is
          separate from the joining date; a day 7 payday can be recorded for
          salary earned in the previous month.
        </p>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : staff ? "Save profile" : "Save staff member"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SalaryRevisionForm({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffMember;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(""),
    [effectiveFrom, setEffectiveFrom] = useState(householdDateKey(new Date())),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.addSalaryRevision(staff._id, Number(amount), effectiveFrom);
      await onSaved();
      onClose();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Could not add salary revision",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="quick-modal entry-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="salary-revision-title"
        onSubmit={submit}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">SALARY HISTORY</span>
            <h2 id="salary-revision-title">Revise {staff.name}’s salary</h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="Close salary form"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <label>
          New monthly salary (₹)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          Effective from
          <input
            required
            type="date"
            min={householdDateKey(new Date())}
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </label>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Add salary revision"}
          </button>
        </div>
      </form>
    </div>
  );
}
