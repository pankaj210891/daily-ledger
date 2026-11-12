import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Household } from "../models/Household.js";
import { RefreshSession } from "../models/RefreshSession.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { env } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../email.js";

const router = Router();
const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  householdName: z.string().trim().min(2).max(80).optional()
});
const signinSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const passwordResetRequestSchema = z.object({ email: z.string().trim().email().max(254) });
const passwordResetSchema = z.object({ token: z.string().min(32).max(200), password: z.string().min(12).max(128) });

function accessToken(user: { _id: unknown; householdId: unknown; role: string }) {
  return jwt.sign({ householdId: String(user.householdId), role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id), expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"], issuer: "daily-ledger"
  });
}
function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }
function cookieOptions() {
  return { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const,
    path: "/api/v1/auth", maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000 };
}
async function createRefreshToken(user: any, req: any) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const session = await RefreshSession.create({
    userId: user._id, householdId: user.householdId, tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000),
    userAgent: req.get("user-agent")?.slice(0, 300), ipAddress: req.ip
  });
  return `${session.id}.${raw}`;
}
async function issueSession(user: any, req: any, res: any) {
  res.cookie(env.COOKIE_NAME, await createRefreshToken(user, req), cookieOptions());
  return accessToken(user);
}
async function issueMobileSession(user: any, req: any) {
  return { accessToken: accessToken(user), refreshToken: await createRefreshToken(user, req) };
}
async function rotateMobileSession(value: string, req: any) {
  if (!value.includes(".")) return null;
  const [sessionId, raw] = value.split(".", 2);
  if (!/^[a-f\d]{24}$/i.test(sessionId)) return null;
  const session = await RefreshSession.findById(sessionId).select("+tokenHash");
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.tokenHash !== hashToken(raw)) return null;
  session.revokedAt = new Date();
  await session.save();
  const user = await User.findOne({ _id: session.userId, isActive: true });
  return user ? { user, ...await issueMobileSession(user, req) } : null;
}

router.post("/signup", async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const email = input.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "Unable to create account with these details" } });
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const household = await Household.create({ name: input.householdName || `${input.name}'s household`, ownerId: new (await import("mongoose")).default.Types.ObjectId() });
    // Use the same generated owner id for the user and household.
    const ownerId = household.ownerId;
    const user = await User.create({ _id: ownerId, name: input.name, email, passwordHash, householdId: household._id, role: "owner" });
    const token = await issueSession(user, req, res);
    res.status(201).json({ data: { accessToken: token, user: { id: user.id, name: user.name, email: user.email, householdId: String(household.id) } } });
  } catch (e) { next(e); }
});

router.post("/signin", async (req, res, next) => {
  try {
    const input = signinSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase(), isActive: true }).select("+passwordHash");
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    const token = await issueSession(user, req, res);
    res.json({ data: { accessToken: token, user: { id: user.id, name: user.name, email: user.email, householdId: String(user.householdId) } } });
  } catch (e) { next(e); }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select("_id");

    if (user) {
      if (env.NODE_ENV === "production" && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) {
        console.error("Password reset email is not configured; set RESEND_API_KEY and EMAIL_FROM.");
      } else {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
        await PasswordResetToken.create({ userId: user._id, tokenHash: hashToken(rawToken), expiresAt });
        const resetUrl = new URL("/", env.WEB_ORIGIN);
        resetUrl.searchParams.set("resetToken", rawToken);
        try {
          await sendPasswordResetEmail(email.toLowerCase(), resetUrl.toString());
        } catch (error) {
          await PasswordResetToken.deleteMany({ userId: user._id, tokenHash: hashToken(rawToken) });
          console.error("Unable to send password reset email.", error);
        }
      }
    }

    res.json({ data: { message: "If an active account exists for that email, a password reset link has been sent." } });
  } catch (e) { next(e); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const input = passwordResetSchema.parse(req.body);
    const now = new Date();
    const resetToken = await PasswordResetToken.findOneAndUpdate(
      { tokenHash: hashToken(input.token), usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
      { new: true }
    );
    if (!resetToken) return res.status(400).json({ error: { code: "INVALID_RESET_TOKEN", message: "This password reset link is invalid or has expired. Request a new one." } });

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const updated = await User.updateOne({ _id: resetToken.userId, isActive: true }, { $set: { passwordHash } });
    if (!updated.modifiedCount) return res.status(400).json({ error: { code: "INVALID_RESET_TOKEN", message: "This password reset link is invalid or has expired. Request a new one." } });
    await PasswordResetToken.deleteMany({ userId: resetToken.userId });
    await RefreshSession.updateMany({ userId: resetToken.userId, revokedAt: null }, { $set: { revokedAt: now } });
    res.json({ data: { message: "Password updated. Sign in with your new password." } });
  } catch (e) { next(e); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const value = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    if (!value || !value.includes(".")) return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Sign in again" } });
    const [sessionId, raw] = value.split(".", 2);
    const session = await RefreshSession.findById(sessionId).select("+tokenHash");
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.tokenHash !== hashToken(raw)) {
      res.clearCookie(env.COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
      return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Sign in again" } });
    }
    session.revokedAt = new Date();
    await session.save();
    const user = await User.findOne({ _id: session.userId, isActive: true });
    if (!user) return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Sign in again" } });
    const token = await issueSession(user, req, res);
    res.json({ data: { accessToken: token } });
  } catch (e) { next(e); }
});

router.post("/signout", async (req, res, next) => {
  try {
    const value = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    if (value?.includes(".")) {
      const [sessionId, raw] = value.split(".", 2);
      await RefreshSession.updateOne({ _id: sessionId, tokenHash: hashToken(raw), revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
    res.clearCookie(env.COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  } catch (e) { next(e); }
});

// Native clients keep rotated refresh credentials in the platform keychain/keystore,
// rather than relying on browser cookie storage inside a mobile networking stack.
router.post("/mobile/signup", async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const email = input.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "Unable to create account with these details" } });
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const household = await Household.create({ name: input.householdName || `${input.name}'s household`, ownerId: new (await import("mongoose")).default.Types.ObjectId() });
    const user = await User.create({ _id: household.ownerId, name: input.name, email, passwordHash, householdId: household._id, role: "owner" });
    const tokens = await issueMobileSession(user, req);
    res.status(201).json({ data: { ...tokens, user: { id: user.id, name: user.name, email: user.email, householdId: String(household.id) } } });
  } catch (e) { next(e); }
});

router.post("/mobile/signin", async (req, res, next) => {
  try {
    const input = signinSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase(), isActive: true }).select("+passwordHash");
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } });
    const tokens = await issueMobileSession(user, req);
    res.json({ data: { ...tokens, user: { id: user.id, name: user.name, email: user.email, householdId: String(user.householdId) } } });
  } catch (e) { next(e); }
});

router.post("/mobile/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(10).max(500) }).parse(req.body);
    const result = await rotateMobileSession(refreshToken, req);
    if (!result) return res.status(401).json({ error: { code: "INVALID_SESSION", message: "Sign in again" } });
    res.json({ data: { accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (e) { next(e); }
});

router.post("/mobile/signout", async (req, res, next) => {
  try {
    const value = z.string().min(10).max(500).safeParse(req.body?.refreshToken);
    if (value.success && value.data.includes(".")) {
      const [sessionId, raw] = value.data.split(".", 2);
      if (/^[a-f\d]{24}$/i.test(sessionId)) await RefreshSession.updateOne({ _id: sessionId, tokenHash: hashToken(raw), revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId).select("name email householdId role");
    if (!user) return res.status(401).json({ error: { code: "USER_NOT_FOUND", message: "Account unavailable" } });
    res.json({ data: { id: user.id, name: user.name, email: user.email, householdId: String(user.householdId), role: user.role } });
  } catch (e) { next(e); }
});
export default router;
