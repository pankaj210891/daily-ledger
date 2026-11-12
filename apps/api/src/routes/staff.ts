import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Attendance } from "../models/Attendance.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { Staff } from "../models/Staff.js";
import { requireAuth } from "../middleware/auth.js";
import { householdTodayKey, isDateKey } from "../lib/dateKeys.js";

const router = Router();
const dateKey = z.string().refine(isDateKey, "Use a valid YYYY-MM-DD date");
const weeklyOffDays = z.array(z.number().int().min(0).max(6)).max(7).refine(days => new Set(days).size === days.length, "Choose each weekly-off day once");
const createSchema = z.object({
  name: z.string().trim().min(1).max(120), joinDate: dateKey,
  monthlySalary: z.number().min(0).max(100000000), weeklyOffDays,
  weeklyOffPaid: z.boolean()
}).strict();
const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(), joinDate: dateKey.optional(),
  endDate: dateKey.nullable().optional(), isActive: z.boolean().optional(),
  weeklyOffDays: weeklyOffDays.optional(), weeklyOffPaid: z.boolean().optional()
}).strict().refine(value => Object.keys(value).length > 0, "Provide at least one staff field to update");
const salaryRevisionSchema = z.object({ amount: z.number().min(0).max(100000000), effectiveFrom: dateKey }).strict();
const validId = (id: string) => mongoose.isValidObjectId(id);

function presentStaff(staff: any) {
  const today = householdTodayKey();
  const current = [...(staff.salaryHistory || [])].filter((item: any) => item.effectiveFrom <= today).sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return { ...staff, currentMonthlySalary: current?.amount ?? null, currentSalaryEffectiveFrom: current?.effectiveFrom ?? null };
}

export async function migrateLegacyStaff(householdId: string) {
  const legacy = await LedgerEntry.find({ householdId, type: "staff" }).lean();
  for (const entry of legacy) {
    const joinDate = householdTodayKey(new Date(entry.date));
    await Staff.updateOne(
      { _id: entry._id, householdId },
      { $setOnInsert: {
        _id: entry._id, householdId, name: entry.name, nameKey: entry.name.trim().toLowerCase(),
        joinDate, isActive: true, weeklyOffDays: [], weeklyOffPaid: true,
        weeklyOffHistory: [{ days: [], paid: true, effectiveFrom: joinDate }],
        salaryHistory: [{ amount: entry.amount, effectiveFrom: joinDate }], sourceLedgerEntryId: entry._id
      } },
      { upsert: true }
    );
  }
}

router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    await migrateLegacyStaff(req.auth!.householdId);
    const rows = await Staff.find({ householdId: req.auth!.householdId }).sort({ isActive: -1, name: 1 }).lean();
    res.json({ data: rows.map(presentStaff) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const row = await Staff.create({
      householdId: req.auth!.householdId, name: input.name, nameKey: input.name.toLowerCase(),
      joinDate: input.joinDate, isActive: true, weeklyOffDays: input.weeklyOffDays,
      weeklyOffPaid: input.weeklyOffPaid,
      weeklyOffHistory: [{ days: input.weeklyOffDays, paid: input.weeklyOffPaid, effectiveFrom: input.joinDate }],
      salaryHistory: [{ amount: input.monthlySalary, effectiveFrom: input.joinDate }]
    });
    res.status(201).json({ data: presentStaff(row.toObject()) });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid staff id" } });
    const input = patchSchema.parse(req.body);
    const row = await Staff.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!row) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Staff member not found" } });
    if (input.name !== undefined) { row.name = input.name; row.nameKey = input.name.toLowerCase(); }
    if (input.joinDate !== undefined) row.joinDate = input.joinDate;
    if (input.endDate !== undefined) {
      row.endDate = input.endDate || undefined;
      if (input.endDate && input.endDate <= householdTodayKey()) row.isActive = false;
    }
    if (input.isActive !== undefined) {
      row.isActive = input.isActive;
      if (input.isActive === false && input.endDate === undefined) row.endDate = householdTodayKey();
      if (input.isActive === true && input.endDate === undefined) row.endDate = undefined;
    }
    if (input.weeklyOffDays !== undefined || input.weeklyOffPaid !== undefined) {
      const today = householdTodayKey();
      const days = input.weeklyOffDays ?? row.weeklyOffDays;
      const paid = input.weeklyOffPaid ?? row.weeklyOffPaid;
      row.weeklyOffDays = days;
      row.weeklyOffPaid = paid;
      const existingToday = row.weeklyOffHistory.find((item: any) => item.effectiveFrom === today);
      if (existingToday) { existingToday.days = days; existingToday.paid = paid; }
      else row.weeklyOffHistory.push({ days, paid, effectiveFrom: today });
      row.weeklyOffHistory.sort((a: any, b: any) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    }
    await row.save();
    res.json({ data: presentStaff(row.toObject()) });
  } catch (error) { next(error); }
});

router.post("/:id/salary-revisions", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid staff id" } });
    const input = salaryRevisionSchema.parse(req.body);
    if (input.effectiveFrom < householdTodayKey()) return res.status(400).json({ error: { code: "PAST_SALARY_DATE", message: "Salary revisions must take effect today or later" } });
    const staff = await Staff.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!staff) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Staff member not found" } });
    if (staff.salaryHistory.some((item: { effectiveFrom: string }) => item.effectiveFrom === input.effectiveFrom)) return res.status(409).json({ error: { code: "SALARY_DATE_EXISTS", message: "A salary is already configured for this effective date" } });
    staff.salaryHistory.push(input);
    staff.salaryHistory.sort((a: { effectiveFrom: string }, b: { effectiveFrom: string }) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    await staff.save();
    res.status(201).json({ data: presentStaff(staff.toObject()) });
  } catch (error) { next(error); }
});

export async function migrateLegacyAttendance(householdId: string, month: string, staffRows: any[]) {
  const start = `${month}-01`, end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const legacy = await LedgerEntry.find({ householdId, type: "attendance", date: { $gte: new Date(`${start}T00:00:00.000Z`), $lte: new Date(`${end}T23:59:59.999Z`) }, status: { $in: ["present", "absent"] } }).lean();
  const names = new Map<string, any[]>();
  for (const staff of staffRows) {
    const key = staff.name.trim().toLowerCase();
    names.set(key, [...(names.get(key) || []), staff]);
  }
  const grouped = new Map<string, Array<{ entry: any; staffId: any; date: string }>>();
  for (const entry of legacy) {
    const matches = names.get(entry.name.trim().toLowerCase()) || [];
    if (matches.length !== 1) continue;
    const date = householdTodayKey(new Date(entry.date));
    const key = `${String(matches[0]._id)}:${date}`;
    grouped.set(key, [...(grouped.get(key) || []), { entry, staffId: matches[0]._id, date }]);
  }
  for (const records of grouped.values()) {
    if (records.length !== 1) continue;
    const { entry, staffId, date } = records[0];
    await Attendance.updateOne(
      { householdId, staffId, date },
      { $setOnInsert: { householdId, staffId, date, status: entry.status, reason: "", sourceLedgerEntryId: entry._id } },
      { upsert: true }
    );
  }
}

export default router;
