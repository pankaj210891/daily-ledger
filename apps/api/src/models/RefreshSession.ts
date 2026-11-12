import mongoose, { Schema } from "mongoose";

const refreshSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
  replacedBySessionId: { type: Schema.Types.ObjectId, ref: "RefreshSession", default: null },
  userAgent: { type: String, maxlength: 300 },
  ipAddress: { type: String, maxlength: 80 }
}, { timestamps: true });

export const RefreshSession = mongoose.models.RefreshSession || mongoose.model("RefreshSession", refreshSessionSchema);