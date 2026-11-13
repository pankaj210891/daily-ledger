import { Attendance } from "../models/Attendance.js";
import { HouseholdHoliday } from "../models/HouseholdHoliday.js";
import { Staff } from "../models/Staff.js";
import { householdTodayKey } from "../lib/dateKeys.js";
import {
  migrateLegacyAttendance,
  migrateLegacyStaff,
} from "./legacyStaffMigrations.js";

const roundCurrency = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isDayOff(date: string, weeklyOffDays: number[]) {
  return weeklyOffDays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay());
}
function salaryOn(staff: any, date: string) {
  return [...staff.salaryHistory]
    .filter((revision: any) => revision.effectiveFrom <= date)
    .sort((a: any, b: any) =>
      b.effectiveFrom.localeCompare(a.effectiveFrom),
    )[0];
}
function weeklyOffOn(staff: any, date: string) {
  return (
    [...(staff.weeklyOffHistory || [])]
      .filter((revision: any) => revision.effectiveFrom <= date)
      .sort((a: any, b: any) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom),
      )[0] || { days: staff.weeklyOffDays || [], paid: staff.weeklyOffPaid }
  );
}

export async function calculateMonth(householdId: string, month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`,
    monthEnd = dayKey(
      year,
      monthNumber,
      new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(),
    );
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const today = householdTodayKey();
  await migrateLegacyStaff(householdId);
  const staffRows = await Staff.find({ householdId }).sort({ name: 1 }).lean();
  await migrateLegacyAttendance(householdId, month, staffRows);
  const [attendanceRows, holidays] = await Promise.all([
    Attendance.find({
      householdId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean(),
    HouseholdHoliday.find({
      householdId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean(),
  ]);
  const attendanceByStaffDate = new Map(
    attendanceRows.map((record) => [
      `${String(record.staffId)}:${record.date}`,
      record,
    ]),
  );
  const holidayByDate = new Map(
    holidays.map((holiday) => [holiday.date, holiday.name]),
  );
  const statements = staffRows
    .map((staff: any) => {
      const employmentStart =
        staff.joinDate > monthStart ? staff.joinDate : monthStart;
      const employmentEnd =
        staff.endDate && staff.endDate < monthEnd ? staff.endDate : monthEnd;
      if (
        employmentStart > employmentEnd ||
        (staff.isActive === false && !staff.endDate)
      )
        return null;
      let grossSalary = 0,
        deductions = 0;
      const counts = {
        present: 0,
        absent: 0,
        pto: 0,
        lop: 0,
        weeklyOff: 0,
        paidWeeklyOff: 0,
        unpaidWeeklyOff: 0,
        holiday: 0,
        unmarkedPresentDays: 0,
        pendingAttendance: 0,
      };
      const dailyBreakdown: Array<Record<string, unknown>> = [];
      for (
        let day = Number(employmentStart.slice(8, 10));
        day <= Number(employmentEnd.slice(8, 10));
        day += 1
      ) {
        const date = dayKey(year, monthNumber, day),
          revision = salaryOn(staff, date);
        const monthlySalary = revision?.amount ?? 0,
          dailyRate = monthlySalary / daysInMonth;
        const stored: any = attendanceByStaffDate.get(
          `${String(staff._id)}:${date}`,
        );
        const weeklyOffPolicy = weeklyOffOn(staff, date),
          configuredWeeklyOff = isDayOff(date, weeklyOffPolicy.days || []);
        const calendarHoliday = holidayByDate.has(date);
        const status =
          stored?.status ||
          (calendarHoliday
            ? "holiday"
            : configuredWeeklyOff
              ? "weekly_off"
              : date > today
                ? "pending"
                : "present");
        const source = stored
          ? "recorded"
          : calendarHoliday
            ? `household holiday: ${holidayByDate.get(date)}`
            : configuredWeeklyOff
              ? "staff weekly-off policy"
              : date > today
                ? "future; not recorded"
                : "unmarked; counted present";
        let deduction = 0;
        grossSalary += dailyRate;
        if (status === "present") {
          counts.present += 1;
          if (!stored) counts.unmarkedPresentDays += 1;
        } else if (status === "absent") {
          counts.absent += 1;
          deduction = dailyRate;
        } else if (status === "pto") counts.pto += 1;
        else if (status === "lop") {
          counts.lop += 1;
          deduction = dailyRate;
        } else if (status === "weekly_off") {
          counts.weeklyOff += 1;
          if (weeklyOffPolicy.paid) counts.paidWeeklyOff += 1;
          else {
            counts.unpaidWeeklyOff += 1;
            deduction = dailyRate;
          }
        } else if (status === "holiday") counts.holiday += 1;
        else if (status === "pending") counts.pendingAttendance += 1;
        deductions += deduction;
        dailyBreakdown.push({
          date,
          weekday: weekdays[new Date(`${date}T00:00:00.000Z`).getUTCDay()],
          status,
          source,
          monthlySalary,
          dailyRate,
          deduction,
          reason: stored?.reason || "",
        });
      }
      return {
        staffId: String(staff._id),
        staffName: staff.name,
        isActive: staff.isActive,
        month,
        joinDate: staff.joinDate,
        endDate: staff.endDate || null,
        weeklyOffDays: staff.weeklyOffDays || [],
        weeklyOffPaid: staff.weeklyOffPaid,
        daysInMonth,
        employedDays: dailyBreakdown.length,
        salaryRateHistory: (staff.salaryHistory || [])
          .filter(
            (revision: any) =>
              revision.effectiveFrom <= monthEnd &&
              revision.effectiveFrom <= employmentEnd,
          )
          .map((revision: any) => ({
            effectiveFrom: revision.effectiveFrom,
            monthlySalary: revision.amount,
          })),
        weeklyOffPolicyHistory: (staff.weeklyOffHistory || [])
          .filter(
            (revision: any) =>
              revision.effectiveFrom <= monthEnd &&
              revision.effectiveFrom <= employmentEnd,
          )
          .map((revision: any) => ({
            effectiveFrom: revision.effectiveFrom,
            days: revision.days,
            paid: revision.paid,
          })),
        grossSalary: roundCurrency(grossSalary),
        deductions: roundCurrency(deductions),
        netPayable: Math.max(0, roundCurrency(grossSalary - deductions)),
        counts,
        dailyBreakdown,
      };
    })
    .filter(Boolean);
  return { month, daysInMonth, statements };
}

export function presentStatement(calculation: any, record: any) {
  const base = record?.snapshot || calculation;
  const transactions = (record?.transactions || []).map((item: any) => ({
    _id: String(item._id),
    kind: item.kind,
    amount: item.amount,
    date: item.date,
    note: item.note || "",
    reason: item.reason || "",
  }));
  const advances = roundCurrency(
    transactions
      .filter((item: any) => item.kind === "advance")
      .reduce((sum: number, item: any) => sum + item.amount, 0),
  );
  const payments = roundCurrency(
    transactions
      .filter((item: any) => item.kind === "payment")
      .reduce((sum: number, item: any) => sum + item.amount, 0),
  );
  const adjustments = roundCurrency(
    transactions
      .filter((item: any) => item.kind === "adjustment")
      .reduce((sum: number, item: any) => sum + item.amount, 0),
  );
  const adjustedPayable = Math.max(
    0,
    roundCurrency(base.netPayable + adjustments),
  );
  const amountPaid = advances + payments;
  const amountDue = Math.max(0, roundCurrency(adjustedPayable - amountPaid));
  return {
    ...base,
    finalized: Boolean(record?.finalizedAt),
    finalizedAt: record?.finalizedAt || null,
    transactions,
    advances,
    payments,
    adjustments,
    amountDue,
    paymentStatus:
      amountDue === 0 ? "paid" : amountPaid > 0 ? "partially_paid" : "pending",
  };
}
