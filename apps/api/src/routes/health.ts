import { Router } from "express";
import mongoose from "mongoose";
const router = Router();
router.get("/", (_req, res) => res.json({ status: "ok", service: "daily-ledger-api", database: mongoose.connection.readyState === 1 ? "connected" : "not-connected" }));
export default router;