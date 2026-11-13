import { AttendanceRecord, ScheduledDelivery, StaffMember } from "../../api";
import { householdDateKey } from "../../lib/formatters";
import type { Section } from "../../app/sectionConfig";

export function TodayOperations({
  deliveries,
  attendanceRecords,
  staff,
  onView,
}: {
  deliveries: ScheduledDelivery[];
  attendanceRecords: AttendanceRecord[];
  staff: StaffMember[];
  onView: (section: Section) => void;
}) {
  const today = householdDateKey(new Date());
  const todaysDeliveries = deliveries
    .filter((item) => item.scheduledDate === today)
    .slice(0, 5);
  const attendance = attendanceRecords.filter(
    (record) =>
      record.date === today &&
      staff.some((member) => member._id === record.staffId && member.isActive),
  );
  const activeStaffToday = staff.filter(
    (member) =>
      member.isActive &&
      member.joinDate <= today &&
      (!member.endDate || member.endDate >= today),
  );
  const present = activeStaffToday.filter((member) => {
    const record = attendance.find((item) => item.staffId === member._id);
    return !record || record.status === "present";
  }).length;
  const absent = attendance.filter(
    (record) => record.status === "absent" || record.status === "lop",
  ).length;
  return (
    <section className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Today’s household activity</h2>
          <p>Deliveries and staff attendance · {today}</p>
        </div>
      </div>
      <div className="operations-section">
        <div className="operations-section-title">
          <strong>Deliveries</strong>
          <button className="text-link" onClick={() => onView("Deliveries")}>
            View all →
          </button>
        </div>
        {todaysDeliveries.length ? (
          <div className="operation-list">
            {todaysDeliveries.map((entry) => (
              <div className="operation-row" key={entry._id}>
                <span className="operation-icon">◷</span>
                <span className="operation-name">
                  <strong>{entry.productName}</strong>
                  <small>
                    {entry.deliveredQuantity}/{entry.expectedQuantity}{" "}
                    {entry.unit} · {entry.timeSlot}
                  </small>
                </span>
                <span className={`status status-${entry.status}`}>
                  {entry.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="operations-empty">No scheduled deliveries today.</p>
        )}
      </div>
      <div className="operations-section attendance-summary">
        <div className="operations-section-title">
          <strong>Staff attendance</strong>
          <button
            className="text-link"
            onClick={() => onView("Staff & Attendance")}
          >
            View all →
          </button>
        </div>
        {activeStaffToday.length ? (
          <div className="attendance-counts">
            <span>
              <strong>{present}</strong>
              <small>Present</small>
            </span>
            <span>
              <strong>{absent}</strong>
              <small>Absent</small>
            </span>
            <span>
              <strong>{activeStaffToday.length}</strong>
              <small>Active staff</small>
            </span>
          </div>
        ) : (
          <p className="operations-empty">No active staff to summarize.</p>
        )}
      </div>
    </section>
  );
}
