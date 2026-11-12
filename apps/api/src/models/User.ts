import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  role: { type: String, enum: ["owner"], default: "owner" },
  emailVerifiedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);