import mongoose, { Schema } from "mongoose";

const ledgerEntrySchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  type: { type: String, enum: ["delivery", "product", "expense", "bill", "staff", "attendance", "salary"], required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, trim: true, maxlength: 80, default: "General" },
  amount: { type: Number, min: 0, default: 0 },
  quantity: { type: Number, min: 0, default: 0 },
  unit: { type: String, trim: true, maxlength: 30, default: "" },
  date: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },
  status: { type: String, enum: ["recorded", "pending", "paid", "upcoming", "present", "absent"], default: "recorded" },
  notes: { type: String, trim: true, maxlength: 1000, default: "" }
}, { timestamps: true });

ledgerEntrySchema.index({ householdId: 1, type: 1, date: -1 });
export const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", ledgerEntrySchema);
