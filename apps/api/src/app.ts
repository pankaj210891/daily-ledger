import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { env } from "./config.js";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import healthRoutes from "./routes/health.js";
import entryRoutes from "./routes/entries.js";
import productRoutes from "./routes/products.js";
import scheduledDeliveryRoutes from "./routes/scheduledDeliveries.js";
import billRoutes from "./routes/bills.js";
import staffRoutes from "./routes/staff.js";
import attendanceRoutes from "./routes/attendance.js";
import salaryRoutes from "./routes/salaries.js";
import holidayRoutes from "./routes/holidays.js";
import recurringExpenseRoutes from "./routes/recurringExpenses.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigins = new Set([env.WEB_ORIGIN, ...(env.NODE_ENV === "development" ? ["http://localhost:5173", "http://127.0.0.1:5173"] : [])]);
function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}
function isDevelopmentWebOrigin(origin: string) {
  if (env.NODE_ENV !== "development") return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && url.port === "5173" && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || isPrivateIpv4(url.hostname));
  } catch { return false; }
}
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin) || isDevelopmentWebOrigin(origin)), credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"] }));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.use(async (_req, _res, next) => { try { await connectDB(); next(); } catch (e) { next(e); } });
if (env.NODE_ENV === "development") {
  app.use("/api/v1/auth", authRoutes);
} else {
  app.use("/api/v1/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }), authRoutes);
}
app.use("/api/v1/entries", entryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/scheduled-deliveries", scheduledDeliveryRoutes);
app.use("/api/v1/bills", billRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/salaries", salaryRoutes);
app.use("/api/v1/holidays", holidayRoutes);
app.use("/api/v1/recurring-expenses", recurringExpenseRoutes);
app.use("/api/v1/health", healthRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
