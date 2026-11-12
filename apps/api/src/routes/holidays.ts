import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { HouseholdHoliday } from "../models/HouseholdHoliday.js";
import { requireAuth } from "../middleware/auth.js";
import { isDateKey } from "../lib/dateKeys.js";

const router = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dateKey = z.string().refine(isDateKey, "Use a valid YYYY-MM-DD date");
const holidaySchema = z.object({ date: dateKey, name: z.string().trim().min(1).max(120) }).strict();

router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.query.month);
    const rows = await HouseholdHoliday.find({ householdId: req.auth!.householdId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: 1 }).lean();
    res.json({ data: rows });
  } catch (error) { next(error); }
});
router.put("/", async (req, res, next) => {
  try {
    const input = holidaySchema.parse(req.body);
    const row = await HouseholdHoliday.findOneAndUpdate(
      { householdId: req.auth!.householdId, date: input.date },
      { $set: { name: input.name } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ data: row });
  } catch (error) { next(error); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid holiday id" } });
    const row = await HouseholdHoliday.findOneAndDelete({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!row) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Holiday not found" } });
    res.status(204).end();
  } catch (error) { next(error); }
});
export default router;
