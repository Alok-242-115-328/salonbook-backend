import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { connectDB } from "./db";
import { env } from "./env";
import { errorHandler, notFound } from "./utils/http";
import { serviceRouter } from "./routes/services";
import { appointmentRouter } from "./routes/appointments";
import { paymentRouter, stripeWebhookHandler } from "./routes/payments";
import { userRouter } from "./routes/users";
import { profileRouter } from "./routes/profile";
import { uploadRouter } from "./routes/uploads";
import { sessionRouter } from "./routes/session";
import { adminRouter } from "./routes/admin";
import { transactionRouter } from "./routes/transactions";

export const app = express();

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.CLIENT_ORIGINS.includes(origin.replace(/\/+$/, ""))) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS."));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-upload-purpose"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/", (_req, res) =>
  res.json({
    success: true,
    name: "SalonBook API",
    message: "SalonBook API is running.",
    health: "/api/health",
    docs: [
      "/api/auth/*",
      "/api/services",
      "/api/appointments",
      "/api/payments/create-checkout",
      "/api/users",
      "/api/transactions",
    ],
  }),
);

app.get("/api/health", (_req, res) =>
  res.json({
    success: true,
    message: "SalonBook API is running.",
    dbConnected: mongoose.connection.readyState === 1,
  }),
);
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json({ limit: "2mb" }));
app.use("/api/session", sessionRouter);
app.use("/api/services", serviceRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/users", userRouter);
app.use("/api/profile", profileRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/admin", adminRouter);
app.use("/api/transactions", transactionRouter);

app.use(notFound);
app.use(errorHandler);

export async function startServer() {
  app.listen(env.PORT, () => {
    console.log(`SalonBook API running on ${env.SERVER_URL} (port ${env.PORT})`);
  });
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully.");
  } catch (error) {
    console.error("MongoDB connection failed. API is online but data routes are unavailable:", error);
  }
}
