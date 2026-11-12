import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ScheduledDelivery } from "../models/ScheduledDelivery.js";
import { requireAuth } from "../middleware/auth.js";
import { householdTodayKey, isDateKey } from "../lib/dateKeys.js";

const router = Router();
const dateKey = z.string().refine(isDateKey, "Use a valid YYYY-MM-DD date");
const timeSlot = z.enum(["morning", "afternoon", "evening", "night"]);
const scheduleSchema = z.object({
  timeSlot,
  frequency: z.enum(["daily", "selected_weekdays", "every_x_days"]),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  everyDays: z.number().int().min(1).max(365).optional(),
  anchorDate: dateKey.optional(),
  startsOn: dateKey,
  endsOn: dateKey.optional(),
  expectedQuantity: z.number().positive().max(1000000)
}).superRefine((schedule, ctx) => {
  if (schedule.endsOn && schedule.endsOn < schedule.startsOn) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsOn"], message: "End date must be on or after the start date" });
  if (schedule.frequency === "selected_weekdays" && schedule.weekdays.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["weekdays"], message: "Choose at least one weekday" });
  if (schedule.frequency === "every_x_days" && !schedule.everyDays) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["everyDays"], message: "Set the number of days between deliveries" });
});
const schedulesSchema = z.array(scheduleSchema).max(4).superRefine((schedules, ctx) => {
  const slots = schedules.map(schedule => schedule.timeSlot);
  if (new Set(slots).size !== slots.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Configure each time slot once" });
});
const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(30),
  rate: z.number().min(0).max(100000000),
  rateEffectiveFrom: dateKey.optional(),
  schedules: schedulesSchema.default([])
}).strict();
const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  isActive: z.boolean().optional(),
  schedules: schedulesSchema.optional()
}).strict().refine(value => Object.keys(value).length > 0, "Provide at least one product field to update");
const addRateSchema = z.object({ amount: z.number().min(0).max(100000000), effectiveFrom: dateKey }).strict();

function validId(id: string) { return mongoose.isValidObjectId(id); }
function cleanSchedules(schedules: z.infer<typeof schedulesSchema>) {
  return schedules.map(({ anchorDate, ...schedule }) => ({
    ...schedule,
    ...(schedule.frequency === "every_x_days" ? { anchorDate: anchorDate || schedule.startsOn } : {})
  }));
}
function scheduleStart(schedules: z.infer<typeof schedulesSchema>) {
  return schedules.length ? schedules.reduce((earliest, schedule) => schedule.startsOn < earliest ? schedule.startsOn : earliest, schedules[0].startsOn) : householdTodayKey();
}
function presentProduct(product: any) {
  const today = householdTodayKey();
  const current = [...(product.rates || [])].filter((rate: any) => rate.effectiveFrom <= today).sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return { ...product, currentRate: current?.amount ?? null, currentRateEffectiveFrom: current?.effectiveFrom ?? null };
}
async function duplicateName(householdId: string, name: string, exceptId?: string) {
  return Boolean(await Product.findOne({ householdId, nameKey: name.trim().toLowerCase(), ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select("_id"));
}

router.use(requireAuth);
router.get("/", async (req, res, next) => {
  try {
    const products = await Product.find({ householdId: req.auth!.householdId }).sort({ isActive: -1, name: 1 }).lean();
    res.json({ data: products.map(presentProduct) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    if (await duplicateName(req.auth!.householdId, input.name)) return res.status(409).json({ error: { code: "PRODUCT_EXISTS", message: "A product with this name already exists" } });
    const product = await Product.create({
      householdId: req.auth!.householdId,
      name: input.name,
      nameKey: input.name.toLowerCase(),
      unit: input.unit,
      activeSince: scheduleStart(input.schedules),
      rates: [{ amount: input.rate, effectiveFrom: input.rateEffectiveFrom || scheduleStart(input.schedules) }],
      schedules: cleanSchedules(input.schedules)
    });
    res.status(201).json({ data: presentProduct(product.toObject()) });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid product id" } });
    const input = patchSchema.parse(req.body);
    if (input.name && await duplicateName(req.auth!.householdId, input.name, req.params.id)) return res.status(409).json({ error: { code: "PRODUCT_EXISTS", message: "A product with this name already exists" } });
    const existing = await Product.findOne({ _id: req.params.id, householdId: req.auth!.householdId }).select("isActive");
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
    const update = { ...input, ...(input.name ? { nameKey: input.name.toLowerCase() } : {}), ...(input.schedules ? { schedules: cleanSchedules(input.schedules) } : {}), ...(input.schedules && existing.isActive ? { activeSince: scheduleStart(input.schedules) } : {}), ...(input.isActive === true && !existing.isActive ? { activeSince: householdTodayKey() } : {}) };
    const product = await Product.findOneAndUpdate({ _id: req.params.id, householdId: req.auth!.householdId }, { $set: update }, { new: true, runValidators: true }).lean();
    if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
    if (input.isActive === false) {
      await ScheduledDelivery.updateMany({ householdId: req.auth!.householdId, productId: req.params.id, scheduledDate: { $gte: householdTodayKey() }, status: "pending" }, { $set: { status: "cancelled", closeReason: "Product archived" } });
    } else if (input.isActive === true) {
      await ScheduledDelivery.updateMany({ householdId: req.auth!.householdId, productId: req.params.id, scheduledDate: { $gte: householdTodayKey() }, status: "cancelled", closeReason: "Product archived" }, { $set: { status: "pending", closeReason: "" } });
    }
    res.json({ data: presentProduct(product) });
  } catch (error) { next(error); }
});

router.post("/:id/rates", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid product id" } });
    const input = addRateSchema.parse(req.body);
    if (input.effectiveFrom < householdTodayKey()) return res.status(400).json({ error: { code: "PAST_RATE_DATE", message: "New rates must take effect today or later" } });
    const product = await Product.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
    if (product.rates.some((rate: { effectiveFrom: string }) => rate.effectiveFrom === input.effectiveFrom)) return res.status(409).json({ error: { code: "RATE_DATE_EXISTS", message: "A rate is already set for this effective date" } });
    product.rates.push(input);
    product.rates.sort((a: { effectiveFrom: string }, b: { effectiveFrom: string }) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    await product.save();
    res.status(201).json({ data: presentProduct(product.toObject()) });
  } catch (error) { next(error); }
});

export default router;
