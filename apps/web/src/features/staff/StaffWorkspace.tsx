import { useState } from "react";
import { api, StaffMember } from "../../api";
import { dateLabel, householdDateKey, money } from "../../lib/formatters";
import { AttendanceWorkspace } from "./AttendanceWorkspace";
import { MobileStaffWorkspace } from "./MobileStaffWorkspace";
import { SalaryRevisionForm, StaffForm } from "./StaffForms";
import { week } from "./staffOptions";

export function StaffWorkspace({
  staff,
  month,
  onMonthChange,
  onReload,
  onOpenSalary,
}: {
  staff: StaffMember[];
  month: string;
  onMonthChange: (month: string) => void;
  onReload: () => Promise<void>;
  onOpenSalary: () => void;
}) {
  const [editing, setEditing] = useState<StaffMember | null | undefined>(
      undefined,
    ),
    [revision, setRevision] = useState<StaffMember | null>(null),
    [busyId, setBusyId] = useState(""),
    [error, setError] = useState("");
  async function endEmployment(member: StaffMember) {
    setBusyId(member._id);
    setError("");
    try {
      await api.updateStaff(member._id, {
        isActive: false,
        endDate: householdDateKey(new Date()),
      });
      await onReload();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Could not update staff status",
      );
    } finally {
      setBusyId("");
    }
  }
  async function restoreEmployment(member: StaffMember) {
    setBusyId(member._id);
    setError("");
    try {
      await api.updateStaff(member._id, { isActive: true, endDate: null });
      await onReload();
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Could not restore staff status",
      );
    } finally {
      setBusyId("");
    }
  }
  return (
    <>
      <div className="desktop-staff-flow">
        <section className="panel domain-workspace">
          <div className="panel-heading">
            <div>
              <h2>Staff profiles</h2>
              <p>
                Attendance and salary calculations use these linked profiles.
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={() => setEditing(null)}
            >
              ＋ Add staff
            </button>
          </div>
          {error && (
            <div className="api-error" role="alert">
              {error}
            </div>
          )}
          {staff.length ? (
            <div className="staff-directory">
              {staff.map((member) => (
                <article
                  className={`staff-card ${member.isActive ? "" : "staff-inactive"}`}
                  key={member._id}
                >
                  <div className="staff-card-main">
                    <div>
                      <span
                        className={`domain-state ${member.isActive ? "active" : "inactive"}`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                      <h3>{member.name}</h3>
                      <p>
                        Joined {dateLabel(member.joinDate)}
                        {member.endDate
                          ? ` · ended ${dateLabel(member.endDate)}`
                          : ""}
                      </p>
                      <strong>
                        {member.currentMonthlySalary === null
                          ? "No salary rate effective"
                          : `${money(member.currentMonthlySalary)} / month`}
                      </strong>
                      <small>
                        Salary payday: day {member.salaryPayDay} each month
                      </small>
                      <small>
                        {member.weeklyOffDays.length
                          ? `${member.weeklyOffDays.map((day) => week[day].label).join(", ")} · ${member.weeklyOffPaid ? "paid" : "unpaid"}`
                          : "No weekly off configured"}
                      </small>
                    </div>
                  </div>
                  <div className="staff-card-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => setEditing(member)}
                    >
                      Edit
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={!member.isActive}
                      onClick={() => setRevision(member)}
                    >
                      Revise salary
                    </button>
                    {member.isActive ? (
                      <button
                        className="text-link"
                        disabled={busyId === member._id}
                        onClick={() => void endEmployment(member)}
                      >
                        {busyId === member._id ? "Saving…" : "End employment"}
                      </button>
                    ) : (
                      <button
                        className="text-link"
                        disabled={busyId === member._id}
                        onClick={() => void restoreEmployment(member)}
                      >
                        {busyId === member._id ? "Saving…" : "Restore"}
                      </button>
                    )}
                  </div>
                  <details className="staff-history">
                    <summary>Salary history</summary>
                    {[...member.salaryHistory]
                      .sort((a, b) =>
                        b.effectiveFrom.localeCompare(a.effectiveFrom),
                      )
                      .map((item) => (
                        <div key={item._id}>
                          <span>{dateLabel(item.effectiveFrom)}</span>
                          <strong>{money(item.amount)} / month</strong>
                        </div>
                      ))}
                  </details>
                  <details className="staff-history">
                    <summary>Weekly-off history</summary>
                    {[...(member.weeklyOffHistory || [])]
                      .sort((a, b) =>
                        b.effectiveFrom.localeCompare(a.effectiveFrom),
                      )
                      .map((item) => (
                        <div key={item._id}>
                          <span>
                            {dateLabel(item.effectiveFrom)} ·{" "}
                            {item.days
                              .map((day) => week[day].label)
                              .join(", ") || "no weekly off"}
                          </span>
                          <strong>{item.paid ? "Paid" : "Unpaid"}</strong>
                        </div>
                      ))}
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No staff profiles yet. Add a staff member to begin attendance
              tracking.
            </div>
          )}
        </section>
        <AttendanceWorkspace
          staff={staff}
          month={month}
          onMonthChange={onMonthChange}
          onStaffChanged={onReload}
        />
        <section className="panel salary-link-panel">
          <div>
            <h2>Salary calculations</h2>
            <p>
              Review monthly earnings, absence/leave deductions and attendance
              breakdown.
            </p>
          </div>
          <button className="button button-secondary" onClick={onOpenSalary}>
            Open salary management →
          </button>
        </section>
      </div>
      <MobileStaffWorkspace
        staff={staff}
        month={month}
        onMonthChange={onMonthChange}
        onReload={onReload}
        onOpenSalary={onOpenSalary}
        onEdit={(member) => setEditing(member)}
        onRevise={(member) => setRevision(member)}
        onEnd={endEmployment}
        onRestore={restoreEmployment}
        busyId={busyId}
        profileError={error}
      />
      {editing !== undefined && (
        <StaffForm
          staff={editing || undefined}
          onClose={() => setEditing(undefined)}
          onSaved={onReload}
        />
      )}
      {revision && (
        <SalaryRevisionForm
          staff={revision}
          onClose={() => setRevision(null)}
          onSaved={onReload}
        />
      )}
    </>
  );
}
