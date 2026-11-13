import type { AttendanceStatus } from "../../api";

export const week = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export const statusLabels: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  pto: "Paid leave (PTO)",
  lop: "Unpaid leave (LOP)",
  weekly_off: "Weekly off",
  holiday: "Holiday",
  pending: "Not yet recorded",
};

export const mobileAttendanceChoices: Array<{
  value: AttendanceStatus;
  label: string;
}> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "pto", label: "Paid leave (PTO)" },
  { value: "lop", label: "Unpaid leave (LOP)" },
  { value: "weekly_off", label: "Weekly off" },
  { value: "holiday", label: "Holiday" },
];
