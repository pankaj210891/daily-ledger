import mongoose, { Schema } from "mongoose";

const householdHolidaySchema = new Schema({
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  name: { type: String, required: true, trim: true, maxlength: 120 }
}, { timestamps: true });

householdHolidaySchema.index({ householdId: 1, date: 1 }, { unique: true });
export const HouseholdHoliday = mongoose.models.HouseholdHoliday || mongoose.model("HouseholdHoliday", householdHolidaySchema);
