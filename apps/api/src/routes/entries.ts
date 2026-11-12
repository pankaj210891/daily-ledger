import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { LedgerEntry } from "../models/LedgerEntry.js";

const router = Router();
const types = ["delivery", "product", "expense", "bill", "staff", "attendance", "salary"] as const;
const statuses = ["recorded", "pending", "paid", "upcoming", "present", "absent"] as const;
const inputSchema = z.object({
  type: z.enum(types), name: z.string().trim().min(1).max(120), category: z.string().trim().max(80).optional(),
  amount: z.coerce.number().min(0).optional(), quantity: z.coerce.number().min(0).optional(), unit: z.string().trim().max(30).optional(),
  date: z.coerce.date().optional(), dueDate: z.coerce.date().optional(), status: z.enum(statuses).optional(), notes: z.string().trim().max(1000).optional()
}).strict();
const idOk = (id: string) => mongoose.isValidObjectId(id);

router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    const type = req.query.type ? z.enum(types).safeParse(req.query.type) : undefined;
    if (type && !type.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Unknown entry type" } });
    const rows = await LedgerEntry.find({ householdId: req.auth!.householdId, ...(type?.success ? { type: type.data } : {}) }).sort({ date: -1, createdAt: -1 }).limit(500).lean();
    res.json({ data: rows });
  } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const input = inputSchema.parse(req.body);
    const row = await LedgerEntry.create({ ...input, householdId: req.auth!.householdId });
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});
router.patch("/:id", async (req, res, next) => {
  try {
    if (!idOk(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid entry id" } });
    const input = inputSchema.partial().omit({ type: true }).parse(req.body);
    const row = await LedgerEntry.findOneAndUpdate({ _id: req.params.id, householdId: req.auth!.householdId }, { $set: input }, { new: true, runValidators: true });
    if (!row) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Entry not found" } });
    res.json({ data: row });
  } catch (e) { next(e); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    if (!idOk(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid entry id" } });
    const row = await LedgerEntry.findOneAndDelete({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!row) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Entry not found" } });
    res.status(204).end();
  } catch (e) { next(e); }
});
export default router;
