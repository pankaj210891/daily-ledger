import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ScheduledDelivery } from "../models/ScheduledDelivery.js";
import { requireAuth } from "../middleware/auth.js";
import { addDays, daysBetween, isDateKey } from "../lib/dateKeys.js";

const router = Router();
const dateKey = z.string().refine(isDateKey, "Use a valid YYYY-MM-DD date");
const rangeSchema = z.object({ from: dateKey, to: dateKey }).refine(value => value.from <= value.to, "Start date must be on or before end date");
const recordSchema = z.object({ quantity: z.number().positive().max(1000000), actualDate: dateKey, notes: z.string().trim().max(1000).optional() }).strict();
const patchRecordSchema = z.object({ quantity: z.number().positive().max(1000000).optional(), actualDate: dateKey.optional(), notes: z.string().trim().max(1000).optional() }).strict().refine(value => Object.keys(value).length > 0, "Provide a delivery field to update");
const closeSchema = z.object({ reason: z.string().trim().max(500).optional() }).strict().default({});
function validId(id: string) { return mongoose.isValidObjectId(id); }
function scheduledOn(schedule: any, date: string) {
  if (date < schedule.startsOn || (schedule.endsOn && date > schedule.endsOn)) return false;
  if (schedule.frequency === "daily") return true;
  if (schedule.frequency === "selected_weekdays") return schedule.weekdays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay());
  const anchor = schedule.anchorDate || schedule.startsOn;
  const offset = daysBetween(anchor, date);
  return offset >= 0 && offset % schedule.everyDays === 0;
}

export async function generateScheduledDeliveries(householdId: string, from: string, to: string) {
  const productList = await Product.find({ householdId, isActive: true }).lean();
  const operations: mongoose.AnyBulkWriteOperation[] = [];
  for (const product of productList) {
    for (const schedule of product.schedules) {
      for (let date = from; date <= to; date = addDays(date, 1)) {
        if (date < product.activeSince || !scheduledOn(schedule, date)) continue;
        operations.push({ updateOne: {
          filter: { householdId, productId: product._id, scheduledDate: date, timeSlot: schedule.timeSlot },
          update: { $setOnInsert: {
            householdId, productId: product._id, scheduleId: schedule._id, scheduledDate: date,
            timeSlot: schedule.timeSlot, productName: product.name, unit: product.unit,
            expectedQuantity: schedule.expectedQuantity, deliveredQuantity: 0, status: "pending", deliveryRecords: []
          } }, upsert: true
        } });
      }
    }
  }
  if (operations.length) await ScheduledDelivery.bulkWrite(operations, { ordered: false });
  return ScheduledDelivery.find({ householdId, scheduledDate: { $gte: from, $lte: to } })
    .sort({ scheduledDate: 1, timeSlot: 1, productName: 1 }).lean();
}

function updateStatus(entry: any) {
  entry.deliveredQuantity = entry.deliveryRecords.reduce((sum: number, record: any) => sum + record.quantity, 0);
  if (["cancelled", "skipped", "zero_consumption"].includes(entry.status)) return;
  if (entry.deliveredQuantity <= 0) entry.status = "pending";
  else if (entry.deliveredQuantity + 1e-9 >= entry.expectedQuantity) entry.status = "fully_delivered";
  else entry.status = "partially_delivered";
}
function versionConflict(error: unknown) { return error instanceof mongoose.Error.VersionError; }

router.use(requireAuth);
router.post("/generate", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.body);
    if (daysBetween(from, to) > 92) return res.status(400).json({ error: { code: "DATE_RANGE_TOO_LARGE", message: "Generate no more than 93 days at a time" } });
    const items = await generateScheduledDeliveries(req.auth!.householdId, from, to);
    res.json({ data: { items, count: items.length } });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse({ from: req.query.from, to: req.query.to });
    if (daysBetween(from, to) > 92) return res.status(400).json({ error: { code: "DATE_RANGE_TOO_LARGE", message: "List no more than 93 days at a time" } });
    const items = await ScheduledDelivery.find({ householdId: req.auth!.householdId, scheduledDate: { $gte: from, $lte: to } }).sort({ scheduledDate: 1, timeSlot: 1, productName: 1 }).lean();
    res.json({ data: items });
  } catch (error) { next(error); }
});

router.post("/:id/deliveries", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid scheduled delivery id" } });
    const input = recordSchema.parse(req.body);
    const entry = await ScheduledDelivery.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!entry) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Scheduled delivery not found" } });
    if (!["pending", "partially_delivered"].includes(entry.status)) return res.status(409).json({ error: { code: "DELIVERY_CLOSED", message: "This scheduled delivery is already closed" } });
    if (entry.deliveredQuantity + input.quantity > entry.expectedQuantity + 1e-9) return res.status(409).json({ error: { code: "QUANTITY_EXCEEDS_EXPECTED", message: "Delivered quantity cannot exceed the outstanding quantity" } });
    entry.deliveryRecords.push({ ...input, notes: input.notes || "" });
    updateStatus(entry);
    await entry.save();
    res.status(201).json({ data: entry });
  } catch (error) {
    if (versionConflict(error)) return res.status(409).json({ error: { code: "DELIVERY_CHANGED", message: "This delivery changed in another request. Reload it and try again." } });
    next(error);
  }
});

router.patch("/:id/deliveries/:recordId", async (req, res, next) => {
  try {
    if (!validId(req.params.id) || !validId(req.params.recordId)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid delivery id" } });
    const input = patchRecordSchema.parse(req.body);
    const entry = await ScheduledDelivery.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!entry) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Scheduled delivery not found" } });
    const record = entry.deliveryRecords.id(req.params.recordId);
    if (!record) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Delivery record not found" } });
    const nextTotal = entry.deliveredQuantity - record.quantity + (input.quantity ?? record.quantity);
    if (nextTotal > entry.expectedQuantity + 1e-9) return res.status(409).json({ error: { code: "QUANTITY_EXCEEDS_EXPECTED", message: "Delivered quantity cannot exceed the outstanding quantity" } });
    if (input.quantity !== undefined) record.quantity = input.quantity;
    if (input.actualDate !== undefined) record.actualDate = input.actualDate;
    if (input.notes !== undefined) record.notes = input.notes;
    updateStatus(entry);
    await entry.save();
    res.json({ data: entry });
  } catch (error) {
    if (versionConflict(error)) return res.status(409).json({ error: { code: "DELIVERY_CHANGED", message: "This delivery changed in another request. Reload it and try again." } });
    next(error);
  }
});

router.delete("/:id/deliveries/:recordId", async (req, res, next) => {
  try {
    if (!validId(req.params.id) || !validId(req.params.recordId)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid delivery id" } });
    const entry = await ScheduledDelivery.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!entry) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Scheduled delivery not found" } });
    const record = entry.deliveryRecords.id(req.params.recordId);
    if (!record) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Delivery record not found" } });
    record.deleteOne();
    updateStatus(entry);
    await entry.save();
    res.json({ data: entry });
  } catch (error) {
    if (versionConflict(error)) return res.status(409).json({ error: { code: "DELIVERY_CHANGED", message: "This delivery changed in another request. Reload it and try again." } });
    next(error);
  }
});

router.post("/:id/:action", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid scheduled delivery id" } });
    if (!["zero-consumption", "skip", "cancel"].includes(req.params.action)) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
    const { reason } = closeSchema.parse(req.body ?? {});
    const entry = await ScheduledDelivery.findOne({ _id: req.params.id, householdId: req.auth!.householdId });
    if (!entry) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Scheduled delivery not found" } });
    if (req.params.action === "zero-consumption") {
      if (entry.status !== "pending" || entry.deliveryRecords.length) return res.status(409).json({ error: { code: "DELIVERY_ALREADY_STARTED", message: "Zero consumption can only be recorded before any quantity is delivered" } });
      entry.status = "zero_consumption";
    } else {
      if (!["pending", "partially_delivered"].includes(entry.status)) return res.status(409).json({ error: { code: "DELIVERY_ALREADY_CLOSED", message: "This scheduled delivery is already closed" } });
      entry.status = req.params.action === "skip" ? "skipped" : "cancelled";
    }
    entry.closeReason = reason || "";
    await entry.save();
    res.json({ data: entry });
  } catch (error) {
    if (versionConflict(error)) return res.status(409).json({ error: { code: "DELIVERY_CHANGED", message: "This delivery changed in another request. Reload it and try again." } });
    next(error);
  }
});

export default router;
