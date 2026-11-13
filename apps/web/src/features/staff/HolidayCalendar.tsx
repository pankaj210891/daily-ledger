import { FormEvent, useEffect, useState } from "react";
import { api, HouseholdHoliday } from "../../api";
import { dateLabel } from "../../lib/formatters";

export function HolidayCalendar({
  month,
  holidays,
  onChanged,
}: {
  month: string;
  holidays: HouseholdHoliday[];
  onChanged: () => Promise<void>;
}) {
  const [date, setDate] = useState(`${month}-01`),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setDate(`${month}-01`);
  }, [month]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.saveHoliday({ date, name });
      setName("");
      await onChanged();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Could not save household holiday",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setError("");
    try {
      await api.deleteHoliday(id);
      await onChanged();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not remove holiday",
      );
    }
  }
  return (
    <section className="household-holidays">
      <div className="panel-heading">
        <div>
          <h3>Household holiday calendar</h3>
          <p>
            Listed holidays are paid unless attendance is explicitly overridden.
          </p>
        </div>
      </div>
      <form className="holiday-form" onSubmit={submit}>
        <label>
          Date
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          Holiday name
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Diwali"
          />
        </label>
        <button className="button button-secondary" disabled={busy}>
          {busy ? "Saving…" : "Add holiday"}
        </button>
      </form>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {holidays.length ? (
        <div className="holiday-list">
          {holidays.map((holiday) => (
            <div key={holiday._id}>
              <span>
                {dateLabel(holiday.date)} · {holiday.name}
              </span>
              <button
                className="text-link"
                onClick={() => void remove(holiday._id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">No household holidays for {month}.</p>
      )}
    </section>
  );
}
