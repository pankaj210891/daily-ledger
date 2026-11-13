import { useEffect, useMemo, useState } from "react";
import {
  api,
  AttendanceRecord,
  AttendanceStatus,
  HouseholdHoliday,
  StaffMember,
} from "../../api";
import {
  dateLabel,
  householdDateKey,
  money,
  monthTitle,
} from "../../lib/formatters";
import { HolidayCalendar } from "./HolidayCalendar";
import { LoadingState } from "../../components/feedback/LoadingState";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";
import { statusLabels, week } from "./staffOptions";

export function AttendanceWorkspace({
  staff,
  month,
  onMonthChange,
  onStaffChanged,
}: {
  staff: StaffMember[];
  month: string;
  onMonthChange: (month: string) => void;
  onStaffChanged: () => Promise<void>;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`,
    monthEnd = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
  const availableStaff = staff.filter(
    (member) =>
      member.joinDate <= monthEnd &&
      (!member.endDate || member.endDate >= monthStart),
  );
  const [staffId, setStaffId] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]),
    [holidays, setHolidays] = useState<HouseholdHoliday[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [drafts, setDrafts] = useState<
      Record<string, { status: AttendanceStatus | "pending"; reason: string }>
    >({}),
    [savingDate, setSavingDate] = useState("");
  useEffect(() => {
    if (!availableStaff.some((member) => member._id === staffId))
      setStaffId(availableStaff[0]?._id || "");
  }, [staff, staffId, month]);
  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [attendance, holidayRows] = await Promise.all([
        staffId ? api.attendance(month, staffId) : Promise.resolve([]),
        api.holidays(month),
      ]);
      setRecords(attendance);
      setHolidays(holidayRows);
      setDrafts({});
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not load attendance",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, [staffId, month]);
  const selectedStaff = staff.find((member) => member._id === staffId);
  const rows = useMemo(() => {
    if (!selectedStaff) return [];
    const [year, monthNumber] = month.split("-").map(Number),
      lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const today = householdDateKey(new Date()),
      saved = new Map(records.map((record) => [record.date, record]));
    const result: Array<{
      date: string;
      weekday: number;
      record?: AttendanceRecord;
      status: AttendanceStatus | "pending";
    }> = [];
    for (let day = 1; day <= lastDay; day += 1) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      if (
        date < selectedStaff.joinDate ||
        (selectedStaff.endDate && date > selectedStaff.endDate)
      )
        continue;
      const record = saved.get(date),
        weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      const weeklyPolicy = [...(selectedStaff.weeklyOffHistory || [])]
        .filter((policy) => policy.effectiveFrom <= date)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
      const weeklyOffDays = weeklyPolicy?.days || selectedStaff.weeklyOffDays;
      const status =
        record?.status ||
        (holidays.some((holiday) => holiday.date === date)
          ? "holiday"
          : weeklyOffDays.includes(weekday)
            ? "weekly_off"
            : date > today
              ? "pending"
              : "present");
      result.push({ date, weekday, record, status });
    }
    return result;
  }, [holidays, month, records, selectedStaff]);
  async function saveDay(date: string) {
    const draft = drafts[date];
    if (!draft || draft.status === "pending") return;
    if (["pto", "lop"].includes(draft.status) && !draft.reason.trim()) {
      setError("A reason is required for PTO and LOP.");
      return;
    }
    setSavingDate(date);
    setError("");
    try {
      await api.saveAttendance({
        staffId,
        date,
        status: draft.status,
        reason: draft.reason,
      });
      await reload();
      await onStaffChanged();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not save attendance",
      );
    } finally {
      setSavingDate("");
    }
  }
  async function resetDay(record?: AttendanceRecord) {
    if (!record) return;
    setError("");
    try {
      await api.deleteAttendance(record._id);
      await reload();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not reset attendance",
      );
    }
  }
  return (
    <section className="panel domain-workspace">
      <div className="panel-heading">
        <div>
          <h2>Attendance</h2>
          <p>Select a staff profile and assign one status per date.</p>
        </div>
        <label className="domain-month">
          Month
          <input
            type="month"
            value={month}
            onChange={(event) =>
              event.target.value && onMonthChange(event.target.value)
            }
          />
        </label>
      </div>
      {error && (
        <div className="api-error" role="alert">
          {error}
        </div>
      )}
      <HolidayCalendar month={month} holidays={holidays} onChanged={reload} />
      <div className="attendance-filters">
        <label>
          Staff member
          <select
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Choose staff</option>
            {availableStaff.map((member) => (
              <option value={member._id} key={member._id}>
                {member.name}
                {member.isActive ? "" : " · inactive"}
              </option>
            ))}
          </select>
        </label>
        {selectedStaff && (
          <span>
            {money(selectedStaff.currentMonthlySalary || 0)} monthly ·{" "}
            {selectedStaff.weeklyOffPaid ? "paid" : "unpaid"} weekly offs
          </span>
        )}
      </div>
      {!availableStaff.length ? (
        <div className="empty-state">
          No staff employed in {month}. Add a staff profile before recording
          attendance.
        </div>
      ) : loading ? (
        <LoadingState label="Loading attendance…" />
      ) : (
        <div className="attendance-day-list">
          {rows.map((row) => {
            const draft = drafts[row.date] || {
              status: row.status,
              reason: row.record?.reason || "",
            };
            const changed = Boolean(drafts[row.date]);
            const defaultNote =
              !row.record && row.status === "present"
                ? " · default present"
                : !row.record && row.status === "pending"
                  ? " · future date"
                  : !row.record && row.status === "weekly_off"
                    ? " · staff weekly-off policy"
                    : !row.record && row.status === "holiday"
                      ? " · household holiday"
                      : "";
            return (
              <article className="attendance-day" key={row.date}>
                <div className="attendance-day-title">
                  <strong>{dateLabel(row.date)}</strong>
                  <small>
                    {week[row.weekday].label}
                    {defaultNote}
                  </small>
                </div>
                <label>
                  Status
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.date]: {
                          ...draft,
                          status: event.target.value as
                            AttendanceStatus | "pending",
                        },
                      }))
                    }
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="pto">Paid leave (PTO)</option>
                    <option value="lop">Unpaid leave (LOP)</option>
                    <option value="weekly_off">Weekly off</option>
                    <option value="holiday">Holiday</option>
                    {row.status === "pending" && (
                      <option value="pending">Not yet recorded</option>
                    )}
                  </select>
                </label>
                {["pto", "lop"].includes(draft.status) && (
                  <label>
                    Leave reason
                    <input
                      required
                      value={draft.reason}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.date]: { ...draft, reason: event.target.value },
                        }))
                      }
                      placeholder="Personal, family, illness…"
                    />
                  </label>
                )}
                <div className="attendance-day-actions">
                  {changed && draft.status !== "pending" && (
                    <button
                      className="button button-primary"
                      disabled={savingDate === row.date}
                      onClick={() => void saveDay(row.date)}
                    >
                      {savingDate === row.date ? "Saving…" : "Save status"}
                    </button>
                  )}
                  {row.record && (
                    <button
                      className="text-link"
                      onClick={() => void resetDay(row.record)}
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
