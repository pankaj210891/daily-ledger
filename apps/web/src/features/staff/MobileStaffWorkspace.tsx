import { useEffect, useState } from "react";
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
import { LoadingState } from "../../components/feedback/LoadingState";
import { MobileMonthPicker } from "../../components/MobileMonthPicker";
import { mobileAttendanceChoices, week } from "./staffOptions";
import { MobileStaffProfiles } from "./MobileStaffProfiles";
import { MobileAttendanceEditor } from "./MobileAttendanceEditor";
import { MobileHolidayCalendar } from "./MobileHolidayCalendar";
import { MobileSalarySummary } from "./MobileSalarySummary";

export function MobileStaffWorkspace({
  staff,
  month,
  onMonthChange,
  onReload,
  onOpenSalary,
  onEdit,
  onRevise,
  onEnd,
  onRestore,
  busyId,
  profileError,
}: {
  staff: StaffMember[];
  month: string;
  onMonthChange: (month: string) => void;
  onReload: () => Promise<void>;
  onOpenSalary: () => void;
  onEdit: (member: StaffMember | null) => void;
  onRevise: (member: StaffMember) => void;
  onEnd: (member: StaffMember) => Promise<void>;
  onRestore: (member: StaffMember) => Promise<void>;
  busyId: string;
  profileError: string;
}) {
  const today = householdDateKey(new Date());
  const [date, setDate] = useState(today),
    [holidayDate, setHolidayDate] = useState(`${month}-01`),
    [holidayName, setHolidayName] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]),
    [holidays, setHolidays] = useState<HouseholdHoliday[]>([]),
    [statements, setStatements] = useState<
      Awaited<ReturnType<typeof api.salaries>>["statements"]
    >([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(""),
    [holidayBusy, setHolidayBusy] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 720px)").matches,
  );
  async function load() {
    setError("");
    try {
      const [attendanceRows, holidayRows, salaryRows] = await Promise.all([
        api.attendance(month),
        api.holidays(month),
        api.salaries(month),
      ]);
      setAttendance(attendanceRows);
      setHolidays(holidayRows);
      setStatements(salaryRows.statements);
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Unable to load staff and attendance.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)"),
      update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (isMobile) void load();
  }, [month, isMobile]);
  useEffect(() => {
    setHolidayDate(`${month}-01`);
  }, [month]);
  function changeMonth(next: string) {
    setDate(`${next}-01`);
    onMonthChange(next);
  }
  function changeDate(next: string) {
    setDate(next);
    if (next && next.slice(0, 7) !== month) {
      onMonthChange(next.slice(0, 7));
      setHolidayDate(`${next.slice(0, 7)}-01`);
    }
  }
  const holidayMap = new Map(holidays.map((item) => [item.date, item]));
  const employed = staff.filter(
    (member) =>
      member.joinDate <= date && (!member.endDate || member.endDate >= date),
  );
  function effectiveStatus(member: StaffMember): AttendanceStatus | "pending" {
    const record = attendance.find(
      (item) => item.staffId === member._id && item.date === date,
    );
    if (record) return record.status;
    if (holidayMap.has(date)) return "holiday";
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const policy = [...(member.weeklyOffHistory || [])]
      .filter((item) => item.effectiveFrom <= date)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
    if ((policy?.days || member.weeklyOffDays).includes(weekday))
      return "weekly_off";
    return date > today ? "pending" : "present";
  }
  async function mark(member: StaffMember, status: AttendanceStatus) {
    if (["pto", "lop"].includes(status) && !reason.trim()) {
      setError("Add a reason for paid or unpaid leave.");
      return;
    }
    setSaving(member._id);
    setError("");
    try {
      await api.saveAttendance({
        staffId: member._id,
        date,
        status,
        ...(["pto", "lop"].includes(status) ? { reason: reason.trim() } : {}),
      });
      setReason("");
      await load();
      await onReload();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Unable to save attendance.",
      );
    } finally {
      setSaving("");
    }
  }
  async function reset(record: AttendanceRecord) {
    setSaving(record.staffId);
    setError("");
    try {
      await api.deleteAttendance(record._id);
      await load();
      await onReload();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Unable to reset attendance.",
      );
    } finally {
      setSaving("");
    }
  }
  async function saveHoliday() {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(holidayDate) ||
      holidayDate.slice(0, 7) !== month
    ) {
      setError(`Choose a holiday date in ${month}.`);
      return;
    }
    if (!holidayName.trim()) {
      setError("Enter a holiday name.");
      return;
    }
    setHolidayBusy(true);
    setError("");
    try {
      await api.saveHoliday({ date: holidayDate, name: holidayName.trim() });
      setHolidayName("");
      await load();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Unable to save holiday.",
      );
    } finally {
      setHolidayBusy(false);
    }
  }
  async function removeHoliday(item: HouseholdHoliday) {
    setHolidayBusy(true);
    setError("");
    try {
      await api.deleteHoliday(item._id);
      await load();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Unable to remove holiday.",
      );
    } finally {
      setHolidayBusy(false);
    }
  }
  if (!isMobile) return null;
  return (
    <div className="mobile-staff-flow">
      <MobileStaffProfiles
        staff={staff}
        loading={loading}
        busyId={busyId}
        onEdit={onEdit}
        onRevise={onRevise}
        onEnd={onEnd}
        onRestore={onRestore}
      />
      <MobileAttendanceEditor
        date={date}
        month={month}
        onMonthChange={changeMonth}
        onDateChange={changeDate}
        employed={employed}
        attendance={attendance}
        effectiveStatus={effectiveStatus}
        saving={saving}
        onMark={mark}
        onReset={reset}
        reason={reason}
        setReason={setReason}
      />
      <MobileHolidayCalendar
        month={month}
        holidayDate={holidayDate}
        setHolidayDate={setHolidayDate}
        holidayName={holidayName}
        setHolidayName={setHolidayName}
        holidayBusy={holidayBusy}
        holidays={holidays}
        onMonthChange={changeMonth}
        onSave={saveHoliday}
        onRemove={removeHoliday}
      />
      <MobileSalarySummary
        statements={statements}
        month={month}
        onOpenSalary={onOpenSalary}
      />
      {(error || profileError) && (
        <div className="api-error" role="alert">
          {error || profileError}
        </div>
      )}
    </div>
  );
}
