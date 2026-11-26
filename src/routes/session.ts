import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { findUserById } from "../middleware/auth";
import { ApiError, asyncHandler } from "../utils/http";
import { signToken } from "../utils/jwt";

export const sessionRouter = Router();

sessionRouter.post(
  "/token",
  asyncHandler(async (req, res) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) throw new ApiError(401, "Please sign in to continue.");
    const user =
      (await findUserById(session.user.id)) ??
      ({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        role: "customer",
        isBlocked: false,
      } as const);
    if (user.isBlocked) throw new ApiError(403, "Your account has been blocked.");
    res.json({
      success: true,
      token: signToken({ id: user.id, role: user.role, email: user.email }),
      user,
    });
  }),
);
