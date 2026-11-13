import mongoose, { Schema } from "mongoose";

const recurringExpenseSchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, trim: true, maxlength: 80, default: "General" },
  amount: { type: Number, required: true, min: 0.01 },
  dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
  startsOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endsOn: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

recurringExpenseSchema.index({ householdId: 1, isActive: 1 });
export const RecurringExpense = mongoose.models.RecurringExpense || mongoose.model("RecurringExpense", recurringExpenseSchema);
