import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { RecurringExpense } from "../models/RecurringExpense.js";
import { householdTodayKey, isDateKey } from "../lib/dateKeys.js";

const router = Router();
const date = z.string().refine(isDateKey, "Use a valid YYYY-MM-DD date");
const inputSchema = z.object({
  name: z.string().trim().min(1).max(120), category: z.string().trim().max(80).optional(),
  amount: z.coerce.number().finite().min(0.01), dayOfMonth: z.coerce.number().int().min(1).max(31),
  startsOn: date, endsOn: date.nullable().optional(), notes: z.string().trim().max(1000).optional(), isActive: z.boolean().optional()
}).strict();
const idOk = (id: string) => mongoose.isValidObjectId(id);
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const policies = await RecurringExpense.find({ householdId: req.auth!.householdId }).sort({ isActive: -1, name: 1 }).lean();
    res.json({ data: policies });
  } catch (error) { next(error); }
});
router.post("/", async (req, res, next) => {
  try {
    const input = inputSchema.refine(value => !value.endsOn || value.endsOn >= value.startsOn, { message: "End date must be on or after start date", path: ["endsOn"] }).parse(req.body);
    const policy = await RecurringExpense.create({ ...input, householdId: req.auth!.householdId });
    res.status(201).json({ data: policy });
  } catch (error) { next(error); }
});
router.patch("/:id", async (req, res, next) => {
  try {
    if (!idOk(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid policy id" } });
    const input = inputSchema.partial().parse(req.body);
    const existing = await RecurringExpense.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Recurring expense policy not found" } });
    const merged = { startsOn: input.startsOn ?? existing.startsOn, endsOn: input.endsOn === undefined ? existing.endsOn : input.endsOn };
    if (merged.endsOn && merged.endsOn < merged.startsOn) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "End date must be on or after start date" } });
    Object.assign(existing, input);
    await existing.save();
    res.json({ data: existing });
  } catch (error) { next(error); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    if (!idOk(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid policy id" } });
    const policy = await RecurringExpense.findOneAndDelete({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!policy) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Recurring expense policy not found" } });
    res.status(204).end();
  } catch (error) { next(error); }
});
router.post("/generate", async (req, res, next) => {
  try {
    const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(req.body.month);
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const from = `${month}-01`, to = `${month}-${String(lastDay).padStart(2, "0")}`;
    const today = householdTodayKey();
    const householdId = req.auth!.householdId;
    const policies = await RecurringExpense.find({ householdId, isActive: true, startsOn: { $lte: to }, $or: [{ endsOn: { $exists: false } }, { endsOn: null }, { endsOn: { $gte: from } }] }).lean();
    const occurrences = [];
    for (const policy of policies) {
      const day = Math.min(policy.dayOfMonth, lastDay);
      const occurrenceDate = `${month}-${String(day).padStart(2, "0")}`;
      if (occurrenceDate < policy.startsOn || (policy.endsOn && occurrenceDate > policy.endsOn)) continue;
      const recurrenceKey = `${policy._id}:${month}`;
      const status = occurrenceDate <= today ? "pending" : "upcoming";
      const entry = await LedgerEntry.findOneAndUpdate(
        { householdId, recurrenceKey },
        { $setOnInsert: { householdId, type: "expense", name: policy.name, category: policy.category, amount: policy.amount, date: new Date(`${occurrenceDate}T00:00:00.000Z`), status, notes: policy.notes, recurringExpenseId: policy._id, recurrenceKey } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      if (!entry || Array.isArray(entry)) continue;
      if (status === "pending" && entry?.status === "upcoming") {
        await LedgerEntry.updateOne({ _id: entry._id, householdId, status: "upcoming" }, { $set: { status: "pending" } });
        entry.status = "pending";
      }
      occurrences.push(entry);
    }
    res.json({ data: { month, occurrences, count: occurrences.length } });
  } catch (error) { next(error); }
});

export default router;
