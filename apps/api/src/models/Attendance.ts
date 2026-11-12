import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ["present", "absent", "pto", "lop", "weekly_off", "holiday"], required: true },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  sourceLedgerEntryId: { type: Schema.Types.ObjectId, ref: "LedgerEntry" }
}, { timestamps: true });

attendanceSchema.index({ householdId: 1, staffId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ householdId: 1, date: 1 });
attendanceSchema.index({ householdId: 1, sourceLedgerEntryId: 1 }, { unique: true, partialFilterExpression: { sourceLedgerEntryId: { $exists: true } } });
export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
