import mongoose, { Schema } from "mongoose";

const deliveryRecordSchema = new Schema({
  quantity: { type: Number, required: true, min: Number.EPSILON },
  actualDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  notes: { type: String, trim: true, maxlength: 1000, default: "" }
}, { timestamps: true });

const scheduledDeliverySchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  scheduleId: { type: Schema.Types.ObjectId, required: true },
  scheduledDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  timeSlot: { type: String, enum: ["morning", "afternoon", "evening", "night"], required: true },
  productName: { type: String, required: true, trim: true, maxlength: 120 },
  unit: { type: String, required: true, trim: true, maxlength: 30 },
  expectedQuantity: { type: Number, required: true, min: Number.EPSILON },
  deliveredQuantity: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["pending", "partially_delivered", "fully_delivered", "cancelled", "skipped", "zero_consumption"], default: "pending", index: true },
  closeReason: { type: String, trim: true, maxlength: 500, default: "" },
  deliveryRecords: { type: [deliveryRecordSchema], default: [] }
}, { timestamps: true, optimisticConcurrency: true });

scheduledDeliverySchema.index({ householdId: 1, scheduledDate: 1, timeSlot: 1 });
scheduledDeliverySchema.index({ householdId: 1, productId: 1, scheduledDate: 1, timeSlot: 1 }, { unique: true });
export const ScheduledDelivery = mongoose.models.ScheduledDelivery || mongoose.model("ScheduledDelivery", scheduledDeliverySchema);
