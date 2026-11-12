import mongoose, { Schema } from "mongoose";

const householdSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  timezone: { type: String, default: "Asia/Kolkata" },
  currency: { type: String, default: "INR", immutable: true }
}, { timestamps: true });

export const Household = mongoose.models.Household || mongoose.model("Household", householdSchema);