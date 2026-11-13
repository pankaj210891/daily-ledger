import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["advance", "payment", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    reason: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

const salaryStatementSchema = new Schema(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    snapshot: { type: Schema.Types.Mixed, default: null },
    finalizedAt: { type: Date, default: null },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true },
);

salaryStatementSchema.index(
  { householdId: 1, staffId: 1, month: 1 },
  { unique: true },
);
export const SalaryStatement =
  mongoose.models.SalaryStatement ||
  mongoose.model("SalaryStatement", salaryStatementSchema);
