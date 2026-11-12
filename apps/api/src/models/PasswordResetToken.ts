import mongoose, { Schema } from "mongoose";

const passwordResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

export const PasswordResetToken = mongoose.models.PasswordResetToken || mongoose.model("PasswordResetToken", passwordResetTokenSchema);
