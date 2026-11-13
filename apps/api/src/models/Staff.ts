import mongoose, { Schema } from "mongoose";

const salaryRevisionSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }
}, { _id: true });
const weeklyOffRevisionSchema = new Schema({
  days: { type: [Number], default: [] },
  paid: { type: Boolean, required: true },
  effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }
}, { _id: true });

const staffSchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  nameKey: { type: String, required: true, trim: true, lowercase: true },
  joinDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  salaryPayDay: { type: Number, min: 1, max: 31, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
  weeklyOffDays: { type: [Number], default: [] },
  weeklyOffPaid: { type: Boolean, default: true },
  weeklyOffHistory: { type: [weeklyOffRevisionSchema], default: [] },
  salaryHistory: { type: [salaryRevisionSchema], default: [] },
  sourceLedgerEntryId: { type: Schema.Types.ObjectId, ref: "LedgerEntry" }
}, { timestamps: true });

staffSchema.index({ householdId: 1, nameKey: 1 });
staffSchema.index({ householdId: 1, sourceLedgerEntryId: 1 }, { unique: true, partialFilterExpression: { sourceLedgerEntryId: { $exists: true } } });
export const Staff = mongoose.models.Staff || mongoose.model("Staff", staffSchema);
