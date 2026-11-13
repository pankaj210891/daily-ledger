import { Dispatch, SetStateAction } from "react";
import { HouseholdHoliday } from "../../api";
import { dateLabel } from "../../lib/formatters";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";

export function MobileHolidayCalendar({
  month,
  holidayDate,
  setHolidayDate,
  holidayName,
  setHolidayName,
  holidayBusy,
  holidays,
  onMonthChange,
  onSave,
  onRemove,
}: {
  month: string;
  holidayDate: string;
  setHolidayDate: Dispatch<SetStateAction<string>>;
  holidayName: string;
  setHolidayName: Dispatch<SetStateAction<string>>;
  holidayBusy: boolean;
  holidays: HouseholdHoliday[];
  onMonthChange: (month: string) => void;
  onSave: () => Promise<void>;
  onRemove: (holiday: HouseholdHoliday) => Promise<void>;
}) {
  return (
    <section className="panel mobile-staff-section">
      <h2>Household holiday calendar</h2>
      <p className="mobile-staff-help">
        Listed holidays are paid by default unless attendance is explicitly
        overridden.
      </p>
      <MobileMonthPicker
        month={month}
        onChange={onMonthChange}
        label="Holiday month"
      />
      <label className="mobile-staff-field">
        Holiday date
        <input
          type="date"
          value={holidayDate}
          min={`${month}-01`}
          max={`${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`}
          onChange={(event) => setHolidayDate(event.target.value)}
        />
      </label>
      <label className="mobile-staff-field">
        Holiday name
        <input
          value={holidayName}
          onChange={(event) => setHolidayName(event.target.value)}
          placeholder="e.g. Diwali"
        />
      </label>
      <button
        className="button button-primary mobile-staff-holiday-add"
        disabled={holidayBusy}
        onClick={() => void onSave()}
      >
        {holidayBusy ? "Saving…" : "Add holiday"}
      </button>
      {holidays.length ? (
        holidays.map((item) => (
          <div className="mobile-holiday-row" key={item._id}>
            <span>
              {dateLabel(item.date)} · {item.name}
            </span>
            <button disabled={holidayBusy} onClick={() => void onRemove(item)}>
              Remove
            </button>
          </div>
        ))
      ) : (
        <p className="mobile-staff-help">No holidays for {month}.</p>
      )}
    </section>
  );
}
