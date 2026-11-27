import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { rawDb } from "./db";
import { env } from "./env";

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectURI: `${env.SERVER_URL}/api/auth/callback/google`,
          prompt: "select_account" as const,
        },
      }
    : {};

function validatePassword(password: string) {
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!/[A-Z]/.test(password)) throw new Error("Password must include an uppercase letter.");
  if (!/[a-z]/.test(password)) throw new Error("Password must include a lowercase letter.");
}

export const auth = betterAuth({
 baseURL: "https://salonbook-backend-nuic.onrender.com", // আপনার Render URL
  trustedOrigins: ["https://salonbook-eight.vercel.app"], // আপনার Vercel URL

  appName: "SalonBook",
 // baseURL: env.SERVER_URL,
  secret: env.BETTER_AUTH_SECRET,
 // trustedOrigins: [...env.CLIENT_ORIGINS, env.SERVER_URL],
  database: mongodbAdapter(rawDb),

// 👇 এখানে পরিবর্তনটি করুন 👇
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
       partitioned: true,  // 👈 এই লাইনটি যোগ করুন////////////////////////////*************************************************** */
        path: "/",
    },
  },
  // 
account: {
  storeStateStrategy: "database", // 👈 কুকির বদলে ডেটাবেসে স্টেট সেভ করবে
  modelName: "account", // 👈 ডেটাবেসে অ্যাকাউন্ট মডেলের নাম
},
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: false,
    password: {
      hash: async (password: string) => {
        validatePassword(password);
        return bcrypt.hash(password, 10);
      },
      verify: async ({ password, hash }: { password: string; hash: string }) =>
        bcrypt.compare(password, hash),
    },
  },
  socialProviders: googleProvider,
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "customer", input: false },
      isBlocked: { type: "boolean", defaultValue: false, input: false },
      phone: { type: "string", required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user: Record<string, unknown>) => {
          const totalUsers = await rawDb.collection("user").countDocuments({});
          return {
            data: {
              ...user,
              role: totalUsers === 0 ? "admin" : "customer",
              isBlocked: false,
            },
          };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
});

export type AppUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "admin" | "customer";
  isBlocked: boolean;
  phone?: string | null;
};
