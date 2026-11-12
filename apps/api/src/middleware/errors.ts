import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.issues[0]?.message || "Invalid data" } });
  if (typeof err === "object" && err && "code" in err && (err as {code: unknown}).code === 11000) return res.status(409).json({ error: { code: "DUPLICATE_RECORD", message: "A record with these details already exists" } });
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid data" } });
  if (err instanceof mongoose.Error) return res.status(400).json({ error: { code: "DATABASE_ERROR", message: "Unable to process request" } });
  const status = typeof err === "object" && err && "status" in err ? Number((err as {status: unknown}).status) : 500;
  const message = status >= 500 ? "Internal server error" : (err as Error).message;
  if (status >= 500) console.error(err);
  res.status(status || 500).json({ error: { code: "INTERNAL_ERROR", message } });
}
