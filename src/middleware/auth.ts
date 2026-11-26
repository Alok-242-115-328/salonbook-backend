import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { ObjectId } from "mongodb";
import { auth, type AppUser } from "../auth";
import { rawDb } from "../db";
import { ApiError } from "../utils/http";
import { verifyToken } from "../utils/jwt";

type AuthedRequest = Request & { authUser?: AppUser };

export const currentUser = (req: Request): AppUser => {
  const user = (req as AuthedRequest).authUser;
  if (!user) throw new ApiError(401, "Authentication required.");
  return user;
};

function sanitize(user: Record<string, unknown>): AppUser {
  return {
    id: String(user._id ?? user.id ?? ""),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    image: (user.image as string | null | undefined) ?? null,
    role: user.role === "admin" ? "admin" : "customer",
    isBlocked: Boolean(user.isBlocked),
    phone: (user.phone as string | null | undefined) ?? null,
  };
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const filter = ObjectId.isValid(id)
    ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
    : { _id: id };
  const user = await rawDb.collection("user").findOne(filter as never);
  return user ? sanitize(user as Record<string, unknown>) : null;
}

async function resolveUser(req: Request): Promise<AppUser | null> {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    const tokenUser = verifyToken(bearer);
    if (!tokenUser) return null;
    return findUserById(tokenUser.id);
  }

  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) return null;
  return (await findUserById(session.user.id)) ?? sanitize(session.user as Record<string, unknown>);
}

export const optionalAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (user) (req as AuthedRequest).authUser = user;
  next();
});

export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  if (user.isBlocked) throw new ApiError(403, "Your account has been blocked.");
  (req as AuthedRequest).authUser = user;
  next();
});

const assertRole = (role: AppUser["role"]): RequestHandler => (_req, _res, next) => {
  if (currentUser(_req).role !== role) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  next();
};

export const requireAdmin: RequestHandler[] = [requireAuth, assertRole("admin")];
export const requireCustomer: RequestHandler[] = [requireAuth, assertRole("customer")];

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
