import { Router } from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { ScheduledDelivery } from "../models/ScheduledDelivery.js";
import { requireAuth } from "../middleware/auth.js";
import { generateScheduledDeliveries } from "./scheduledDeliveries.js";
import { isDateKey, monthBounds } from "../lib/dateKeys.js";

const router = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

async function buildBill(householdId: string, month: string) {
  const { from, to } = monthBounds(month);
  const scheduled = await ScheduledDelivery.find({ householdId, scheduledDate: { $gte: from, $lte: to } })
    .sort({ scheduledDate: 1, timeSlot: 1, productName: 1 }).lean();
  const productIds = [...new Set(scheduled.map(item => String(item.productId)))];
  const products = await Product.find({ householdId, _id: { $in: productIds } }).lean();
  const productById = new Map<string, any>(products.map((product: any) => [String(product._id), product]));
  const groups = new Map<string, any>();
  let totalAmount = 0, totalOutstandingEstimate = 0, unpricedLines = 0;

  for (const item of scheduled) {
    const product = productById.get(String(item.productId));
    const rate = product?.rates.filter((value: any) => value.effectiveFrom <= item.scheduledDate).sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
    const deliveredQuantity = item.deliveredQuantity;
    const openStatus = item.status === "pending" || item.status === "partially_delivered";
    const outstandingQuantity = openStatus ? Math.max(0, item.expectedQuantity - deliveredQuantity) : 0;
    const closedQuantity = openStatus ? 0 : Math.max(0, item.expectedQuantity - deliveredQuantity);
    const deliveredAmount = rate ? deliveredQuantity * rate.amount : null;
    const outstandingAmount = rate ? outstandingQuantity * rate.amount : null;
    if (!rate) unpricedLines += 1;
    else {
      totalAmount += deliveredAmount || 0;
      totalOutstandingEstimate += outstandingAmount || 0;
    }
    const key = String(item.productId);
    const group = groups.get(key) || {
      productId: key, productName: item.productName, unit: item.unit,
      expectedQuantity: 0, deliveredQuantity: 0, outstandingQuantity: 0, closedQuantity: 0,
      deliveredAmount: 0, outstandingAmount: 0, unpricedLines: 0, lines: []
    };
    group.expectedQuantity += item.expectedQuantity;
    group.deliveredQuantity += deliveredQuantity;
    group.outstandingQuantity += outstandingQuantity;
    group.closedQuantity += closedQuantity;
    if (deliveredAmount === null) group.unpricedLines += 1;
    else group.deliveredAmount += deliveredAmount;
    if (outstandingAmount !== null) group.outstandingAmount += outstandingAmount;
    group.lines.push({
      scheduledDeliveryId: String(item._id), scheduledDate: item.scheduledDate,
      timeSlot: item.timeSlot, expectedQuantity: item.expectedQuantity,
      deliveredQuantity, outstandingQuantity, closedQuantity, unit: item.unit,
      rate: rate?.amount ?? null, rateEffectiveFrom: rate?.effectiveFrom ?? null,
      deliveredAmount, outstandingAmount, status: item.status, closeReason: item.closeReason,
      records: item.deliveryRecords.map((record: any) => ({ id: String(record._id), quantity: record.quantity, actualDate: record.actualDate, notes: record.notes }))
    });
    groups.set(key, group);
  }

  return {
    month, from, to,
    products: [...groups.values()],
    totals: {
      scheduledCount: scheduled.length,
      deliveredQuantityByProduct: [...groups.values()].map(group => ({ productId: group.productId, productName: group.productName, unit: group.unit, quantity: group.deliveredQuantity })),
      outstandingQuantityByProduct: [...groups.values()].map(group => ({ productId: group.productId, productName: group.productName, unit: group.unit, quantity: group.outstandingQuantity })),
      closedQuantityByProduct: [...groups.values()].map(group => ({ productId: group.productId, productName: group.productName, unit: group.unit, quantity: group.closedQuantity })),
      totalAmount, totalOutstandingEstimate, unpricedLines
    }
  };
}

router.use(requireAuth);
router.post("/prepare", async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.body?.month);
    const { from, to } = monthBounds(month);
    if (!isDateKey(from) || !isDateKey(to)) return res.status(400).json({ error: { code: "INVALID_MONTH", message: "Choose a valid billing month" } });
    await generateScheduledDeliveries(req.auth!.householdId, from, to);
    res.json({ data: await buildBill(req.auth!.householdId, month) });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.query.month);
    const { from, to } = monthBounds(month);
    if (!isDateKey(from) || !isDateKey(to)) return res.status(400).json({ error: { code: "INVALID_MONTH", message: "Choose a valid billing month" } });
    res.json({ data: await buildBill(req.auth!.householdId, month) });
  } catch (error) { next(error); }
});

export default router;
