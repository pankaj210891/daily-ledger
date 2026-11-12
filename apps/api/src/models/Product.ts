import mongoose, { Schema } from "mongoose";

const rateSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }
}, { _id: true });

const scheduleSchema = new Schema({
  timeSlot: { type: String, enum: ["morning", "afternoon", "evening", "night"], required: true },
  frequency: { type: String, enum: ["daily", "selected_weekdays", "every_x_days"], required: true },
  weekdays: { type: [Number], default: [] },
  everyDays: { type: Number, min: 1, max: 365 },
  anchorDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  startsOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endsOn: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  expectedQuantity: { type: Number, required: true, min: Number.EPSILON }
}, { _id: true });

const productSchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  nameKey: { type: String, required: true, trim: true, lowercase: true },
  unit: { type: String, required: true, trim: true, maxlength: 30 },
  isActive: { type: Boolean, default: true, index: true },
  activeSince: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  rates: { type: [rateSchema], default: [] },
  schedules: { type: [scheduleSchema], default: [] }
}, { timestamps: true });

productSchema.index({ householdId: 1, nameKey: 1 }, { unique: true });
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
