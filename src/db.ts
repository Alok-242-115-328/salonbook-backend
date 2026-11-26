import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { env } from "./env";

const client = new MongoClient(env.MONGODB_URI);
const databaseName =
  env.MONGODB_URI.split("?")[0].split("/").filter(Boolean).pop() || "salonbook";

export const rawDb = client.db(databaseName);

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(env.MONGODB_URI);
}
