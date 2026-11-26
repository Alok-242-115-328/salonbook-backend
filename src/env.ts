import "dotenv/config";

const value = (key: string, fallback = "") => process.env[key]?.trim() || fallback;
const cleanUrl = (url: string) => url.replace(/\/+$/, "");

const CLIENT_ORIGINS = [
  ...new Set(
    value("CLIENT_URL", "http://localhost:3000")
      .split(",")
      .map((origin) => cleanUrl(origin.trim()))
      .filter(Boolean),
  ),
];

export const env = {
  NODE_ENV: value("NODE_ENV", "development"),
  PORT: Number(value("PORT", "5000")) || 5000,
  MONGODB_URI: value("MONGODB_URI", "mongodb://127.0.0.1:27017/salonbook"),
  CLIENT_URL: CLIENT_ORIGINS[0] || "http://localhost:3000",
  CLIENT_ORIGINS,
  SERVER_URL: cleanUrl(value("SERVER_URL", "http://localhost:5000")),
  BETTER_AUTH_SECRET: value("BETTER_AUTH_SECRET", "local-development-secret-change-me"),
  JWT_SECRET: value("JWT_SECRET", "local-development-jwt-secret-change-me"),
  GOOGLE_CLIENT_ID: value("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: value("GOOGLE_CLIENT_SECRET"),
  STRIPE_SECRET_KEY: value("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: value("STRIPE_WEBHOOK_SECRET"),
  PAYMENT_CURRENCY: value("PAYMENT_CURRENCY", "usd"),
  IMGBB_API_KEY: value("IMGBB_API_KEY"),
  ADMIN_PIN: value("ADMIN_PIN"),
};

export const isProduction = env.NODE_ENV === "production";
