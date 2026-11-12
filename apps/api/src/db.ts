import mongoose from "mongoose";
import { env } from "./config.js";

let connection: Promise<typeof mongoose> | undefined;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connection) {
    connection = mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}