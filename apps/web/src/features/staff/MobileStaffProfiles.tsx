import { StaffMember } from "../../api";
import { LoadingState } from "../../components/feedback/LoadingState";
import { dateLabel, money } from "../../lib/formatters";
import { week } from "./staffOptions";

export function MobileStaffProfiles({
  staff,
  loading,
  busyId,
  onEdit,
  onRevise,
  onEnd,
  onRestore,
}: {
  staff: StaffMember[];
  loading: boolean;
  busyId: string;
  onEdit: (member: StaffMember | null) => void;
  onRevise: (member: StaffMember) => void;
  onEnd: (member: StaffMember) => Promise<void>;
  onRestore: (member: StaffMember) => Promise<void>;
}) {
  return (
    <section className="panel mobile-staff-section">
      <div className="mobile-staff-section-head">
        <h2>Staff profiles</h2>
        <button className="button button-primary" onClick={() => onEdit(null)}>
          ＋ Add staff
        </button>
      </div>
      {loading && !staff.length ? (
        <LoadingState label="Loading staff and attendance…" />
      ) : staff.length ? (
        staff.map((member) => (
          <article className="mobile-staff-card" key={member._id}>
            <div className="mobile-staff-profile">
              <div>
                <strong>{member.name}</strong>
                <small>
                  {member.isActive ? "Active" : "Inactive"} · joined{" "}
                  {dateLabel(member.joinDate)}
                  {member.endDate
                    ? ` · ended ${dateLabel(member.endDate)}`
                    : ""}
                </small>
                <small>
                  {member.currentMonthlySalary === null
                    ? "No salary set"
                    : `Monthly salary ${money(member.currentMonthlySalary)}`}
                </small>
                <small>
                  Salary payday: day {member.salaryPayDay} each month
                </small>
                <small>
                  {member.weeklyOffDays.length
                    ? `${member.weeklyOffDays.map((day) => week[day].label).join(", ")} · ${member.weeklyOffPaid ? "paid" : "unpaid"} weekly offs`
                    : "No weekly off configured"}
                </small>
              </div>
            </div>
            <div className="mobile-staff-actions">
              <button onClick={() => onEdit(member)}>Edit profile</button>
              <button
                disabled={!member.isActive}
                onClick={() => onRevise(member)}
              >
                Revise salary
              </button>
              <button
                disabled={busyId === member._id}
                onClick={() =>
                  void (member.isActive ? onEnd(member) : onRestore(member))
                }
              >
                {member.isActive ? "End employment" : "Restore"}
              </button>
            </div>
            {member.salaryHistory.length ? (
              <details className="mobile-staff-history">
                <summary>Salary history</summary>
                {[...member.salaryHistory]
                  .sort((a, b) =>
                    b.effectiveFrom.localeCompare(a.effectiveFrom),
                  )
                  .map((item) => (
                    <div key={item._id}>
                      {dateLabel(item.effectiveFrom)} · {money(item.amount)}
                    </div>
                  ))}
              </details>
            ) : null}
          </article>
        ))
      ) : (
        <p className="mobile-staff-empty">
          No staff profiles yet. Add a staff member to begin attendance
          tracking.
        </p>
      )}
    </section>
  );
}
