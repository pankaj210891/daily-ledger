import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_NAME: z.string().default("dl_refresh"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional()
});
export const env = schema.parse(process.env);
