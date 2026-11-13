import { Router } from "express";
import { z } from "zod";
import { SalaryStatement } from "../models/SalaryStatement.js";
import { Staff } from "../models/Staff.js";
import { requireAuth } from "../middleware/auth.js";
import {
  calculateMonth,
  presentStatement,
} from "../services/salaryCalculations.js";

const router = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  });
const transactionSchema = z
  .object({
    month: monthSchema,
    kind: z.enum(["advance", "payment", "adjustment"]),
    amount: z
      .number()
      .finite()
      .min(-100000000)
      .max(100000000)
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
        "Amount must be in paise increments",
      ),
    date: dateSchema,
    note: z.string().trim().max(500).optional().default(""),
    reason: z.string().trim().max(500).optional().default(""),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.kind !== "adjustment" && input.amount <= 0)
      ctx.addIssue({
        code: "custom",
        message: "Amount must be greater than zero",
      });
    if (input.kind === "adjustment" && input.amount === 0)
      ctx.addIssue({
        code: "custom",
        message: "Adjustment must change the balance",
      });
    if (input.kind === "adjustment" && !input.reason.trim())
      ctx.addIssue({
        code: "custom",
        message: "A reason is required for adjustments",
      });
  });
router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.query.month),
      calculation = await calculateMonth(req.auth!.householdId, month);
    const stored = await SalaryStatement.find({
      householdId: req.auth!.householdId,
      month,
    }).lean();
    const byStaff = new Map(
      stored.map((record: any) => [String(record.staffId), record]),
    );
    const statements = calculation.statements.map((line: any) =>
      presentStatement(line, byStaff.get(line.staffId)),
    );
    res.json({ data: { ...calculation, statements } });
  } catch (error) {
    next(error);
  }
});

router.post("/:staffId/finalize", async (req, res, next) => {
  try {
    const staffId = idSchema.parse(req.params.staffId),
      month = monthSchema.parse(req.body?.month);
    const calculation: any = await calculateMonth(req.auth!.householdId, month);
    const current = calculation.statements.find(
      (line: any) => line.staffId === staffId,
    );
    if (!current)
      return res.status(404).json({
        error: {
          code: "STAFF_MONTH_NOT_FOUND",
          message:
            "No salary calculation exists for this staff member and month",
        },
      });
    if (current.counts.pendingAttendance > 0)
      return res.status(400).json({
        error: {
          code: "ATTENDANCE_PENDING",
          message:
            "Future attendance is still pending. Finalize this statement after the month ends.",
        },
      });
    let record = await SalaryStatement.findOne({
      householdId: req.auth!.householdId,
      staffId,
      month,
    });
    if (record?.finalizedAt)
      return res.status(409).json({
        error: {
          code: "ALREADY_FINALIZED",
          message: "This salary statement is already finalized",
        },
      });
    if (!record)
      record = new SalaryStatement({
        householdId: req.auth!.householdId,
        staffId,
        month,
      });
    record.snapshot = current;
    record.finalizedAt = new Date();
    await record.save();
    res.json({ data: presentStatement(current, record.toObject()) });
  } catch (error) {
    next(error);
  }
});

router.post("/:staffId/transactions", async (req, res, next) => {
  try {
    const staffId = idSchema.parse(req.params.staffId),
      input = transactionSchema.parse(req.body),
      month = input.month;
    const { month: _month, ...transaction } = input;
    const staff = await Staff.findOne({
      _id: staffId,
      householdId: req.auth!.householdId,
    });
    if (!staff)
      return res.status(404).json({
        error: { code: "STAFF_NOT_FOUND", message: "Staff member not found" },
      });
    const current = await SalaryStatement.findOne({
      householdId: req.auth!.householdId,
      staffId,
      month,
      finalizedAt: { $ne: null },
    });
    if (current && input.kind !== "adjustment") {
      const amountDue = presentStatement(
        current.snapshot,
        current.toObject(),
      ).amountDue;
      if (input.amount > amountDue)
        return res.status(400).json({
          error: {
            code: "AMOUNT_EXCEEDS_BALANCE",
            message: "Amount cannot exceed the remaining salary balance",
          },
        });
    }
    const record = current
      ? await SalaryStatement.findOneAndUpdate(
          { _id: current._id, finalizedAt: { $ne: null } },
          { $push: { transactions: transaction } },
          { new: true },
        )
      : null;
    if (!record)
      return res.status(409).json({
        error: {
          code: "STATEMENT_NOT_FINALIZED",
          message:
            "Finalize the salary statement before recording advances, payments, or adjustments",
        },
      });
    res
      .status(201)
      .json({ data: presentStatement(record.snapshot, record.toObject()) });
  } catch (error) {
    next(error);
  }
});

export default router;
