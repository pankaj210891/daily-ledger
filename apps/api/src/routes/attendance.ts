import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Attendance } from "../models/Attendance.js";
import { Staff } from "../models/Staff.js";
import { requireAuth } from "../middleware/auth.js";
import { isDateKey } from "../lib/dateKeys.js";
import { migrateLegacyAttendance } from "./staff.js";

const router = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dateKey = z.string().refine(isDateKey, "Use a valid YYYY-MM-DD date");
const inputSchema = z.object({
  staffId: z.string().refine(id => mongoose.isValidObjectId(id), "Invalid staff id"),
  date: dateKey,
  status: z.enum(["present", "absent", "pto", "lop", "weekly_off", "holiday"]),
  reason: z.string().trim().max(500).optional()
}).strict().superRefine((input, ctx) => {
  if (["pto", "lop"].includes(input.status) && !input.reason?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "A reason is required for leave" });
});

router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.query.month);
    const { staffId } = req.query;
    if (staffId && (typeof staffId !== "string" || !mongoose.isValidObjectId(staffId))) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid staff id" } });
    const staffRows = await Staff.find({ householdId: req.auth!.householdId }).lean();
    await migrateLegacyAttendance(req.auth!.householdId, month, staffRows);
    const start = `${month}-01`, end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
    const records = await Attendance.find({ householdId: req.auth!.householdId, date: { $gte: start, $lte: end }, ...(staffId ? { staffId } : {}) }).sort({ date: 1 }).lean();
    res.json({ data: records });
  } catch (error) { next(error); }
});

router.put("/", async (req, res, next) => {
  try {
    const input = inputSchema.parse(req.body);
    const staff: any = await Staff.findOne({ _id: input.staffId, householdId: req.auth!.householdId }).select("joinDate endDate").lean();
    if (!staff) return res.status(404).json({ error: { code: "STAFF_NOT_FOUND", message: "Choose a staff member in this household" } });
    if (input.date < staff.joinDate || (staff.endDate && input.date > staff.endDate)) return res.status(400).json({ error: { code: "OUTSIDE_EMPLOYMENT", message: "Attendance date must be within the staff member’s employment dates" } });
    const record = await Attendance.findOneAndUpdate(
      { householdId: req.auth!.householdId, staffId: input.staffId, date: input.date },
      { $set: { status: input.status, reason: input.reason?.trim() || "" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ data: record });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid attendance id" } });
    const record = await Attendance.findOneAndDelete({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!record) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attendance record not found" } });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
