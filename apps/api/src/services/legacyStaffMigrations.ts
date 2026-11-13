import { Attendance } from "../models/Attendance.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { Staff } from "../models/Staff.js";
import { householdTodayKey } from "../lib/dateKeys.js";

export async function migrateLegacyStaff(householdId: string) {
  const legacy = await LedgerEntry.find({ householdId, type: "staff" }).lean();
  for (const entry of legacy) {
    const joinDate = householdTodayKey(new Date(entry.date));
    await Staff.updateOne(
      { _id: entry._id, householdId },
      {
        $setOnInsert: {
          _id: entry._id,
          householdId,
          name: entry.name,
          nameKey: entry.name.trim().toLowerCase(),
          joinDate,
          isActive: true,
          weeklyOffDays: [],
          weeklyOffPaid: true,
          weeklyOffHistory: [{ days: [], paid: true, effectiveFrom: joinDate }],
          salaryHistory: [{ amount: entry.amount, effectiveFrom: joinDate }],
          sourceLedgerEntryId: entry._id,
        },
      },
      { upsert: true },
    );
  }
}

export async function migrateLegacyAttendance(
  householdId: string,
  month: string,
  staffRows: any[],
) {
  const start = `${month}-01`,
    end = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    )
      .toISOString()
      .slice(0, 10);
  const legacy = await LedgerEntry.find({
    householdId,
    type: "attendance",
    date: {
      $gte: new Date(`${start}T00:00:00.000Z`),
      $lte: new Date(`${end}T23:59:59.999Z`),
    },
    status: { $in: ["present", "absent"] },
  }).lean();
  const names = new Map<string, any[]>();
  for (const staff of staffRows) {
    const key = staff.name.trim().toLowerCase();
    names.set(key, [...(names.get(key) || []), staff]);
  }
  const grouped = new Map<
    string,
    Array<{ entry: any; staffId: any; date: string }>
  >();
  for (const entry of legacy) {
    const matches = names.get(entry.name.trim().toLowerCase()) || [];
    if (matches.length !== 1) continue;
    const date = householdTodayKey(new Date(entry.date));
    const key = `${String(matches[0]._id)}:${date}`;
    grouped.set(key, [
      ...(grouped.get(key) || []),
      { entry, staffId: matches[0]._id, date },
    ]);
  }
  for (const records of grouped.values()) {
    if (records.length !== 1) continue;
    const { entry, staffId, date } = records[0];
    await Attendance.updateOne(
      { householdId, staffId, date },
      {
        $setOnInsert: {
          householdId,
          staffId,
          date,
          status: entry.status,
          reason: "",
          sourceLedgerEntryId: entry._id,
        },
      },
      { upsert: true },
    );
  }
}
