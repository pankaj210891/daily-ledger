import { Dispatch, SetStateAction } from "react";
import { AttendanceRecord, AttendanceStatus, StaffMember } from "../../api";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";
import { mobileAttendanceChoices } from "./staffOptions";

export function MobileAttendanceEditor({
  date,
  month,
  onMonthChange,
  onDateChange,
  employed,
  attendance,
  effectiveStatus,
  saving,
  onMark,
  onReset,
  reason,
  setReason,
}: {
  date: string;
  month: string;
  onMonthChange: (month: string) => void;
  onDateChange: (date: string) => void;
  employed: StaffMember[];
  attendance: AttendanceRecord[];
  effectiveStatus: (member: StaffMember) => AttendanceStatus | "pending";
  saving: string;
  onMark: (member: StaffMember, status: AttendanceStatus) => Promise<void>;
  onReset: (record: AttendanceRecord) => Promise<void>;
  reason: string;
  setReason: Dispatch<SetStateAction<string>>;
}) {
  return (
    <section className="panel mobile-staff-section">
      <h2>Attendance</h2>
      <p className="mobile-staff-help">
        Past unmarked dates default to present. Future dates stay pending.
      </p>
      <MobileMonthPicker
        month={month}
        onChange={onMonthChange}
        label="Attendance month"
      />
      <label className="mobile-staff-field">
        Attendance date
        <input
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>
      {!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ||
      date.slice(0, 7) !== month ? (
        <p className="mobile-staff-error">Enter a date in {month}.</p>
      ) : employed.length ? (
        employed.map((member) => {
          const record = attendance.find(
              (item) => item.staffId === member._id && item.date === date,
            ),
            status = effectiveStatus(member);
          return (
            <article className="mobile-attendance-card" key={member._id}>
              <div className="mobile-attendance-heading">
                <strong>{member.name}</strong>
                <span>
                  {status.replace("_", " ")}
                  {record ? " · recorded" : " · default"}
                </span>
              </div>
              {(status === "pto" || status === "lop") && (
                <small>Reason: {record?.reason || "—"}</small>
              )}
              <div className="mobile-attendance-choices">
                {mobileAttendanceChoices.map((choice) => (
                  <button
                    key={choice.value}
                    className={status === choice.value ? "active" : ""}
                    disabled={saving === member._id}
                    onClick={() => void onMark(member, choice.value)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
              {record && (
                <button
                  className="mobile-reset-attendance"
                  disabled={saving === member._id}
                  onClick={() => void onReset(record)}
                >
                  Reset to default
                </button>
              )}
            </article>
          );
        })
      ) : (
        <p className="mobile-staff-help">No staff employed on this date.</p>
      )}
      <label className="mobile-staff-field">
        PTO / LOP reason (required for leave)
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Personal, illness…"
        />
      </label>
    </section>
  );
}
