import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/auth";
import { rawDb } from "../db";
import { env } from "../env";
import { ApiError, asyncHandler } from "../utils/http";

export const adminRouter = Router();

adminRouter.post(
  "/promote",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.ADMIN_PIN) throw new ApiError(503, "Admin PIN setup is not enabled.");
    const { pin } = z.object({ pin: z.string().min(1) }).parse(req.body);
    const supplied = Buffer.from(pin);
    const expected = Buffer.from(env.ADMIN_PIN);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new ApiError(403, "Invalid admin PIN.");
    }
    const id = currentUser(req).id;
    if (!ObjectId.isValid(id)) throw new ApiError(400, "Invalid user id.");
    const user = await rawDb.collection("user").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role: "admin" } },
      { returnDocument: "after" },
    );
    if (!user) throw new ApiError(404, "User not found.");
    res.json({ success: true, message: "Admin access granted.", role: user.role });
  }),
);
