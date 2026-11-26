import jwt from "jsonwebtoken";
import { env } from "../env";

export type TokenUser = {
  id: string;
  role: "admin" | "customer";
  email: string;
};

export function signToken(user: TokenUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenUser | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") return null;
    const role = decoded.role === "admin" ? "admin" : "customer";
    return { id: String(decoded.id), role, email: String(decoded.email ?? "") };
  } catch {
    return null;
  }
}
