import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config.js";

export interface AuthUser { userId: string; householdId: string; role: "owner" }
declare global { namespace Express { interface Request { auth?: AuthUser } } }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || typeof payload.householdId !== "string" || payload.role !== "owner") throw new Error("Invalid claims");
    req.auth = { userId: payload.sub, householdId: payload.householdId, role: "owner" };
    next();
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Session is invalid or expired" } });
  }
}