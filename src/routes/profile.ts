import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { currentUser, requireAuth } from "../middleware/auth";
import { rawDb } from "../db";
import { ApiError, asyncHandler } from "../utils/http";

export const profileRouter = Router();

profileRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ success: true, user: currentUser(req) });
  }),
);

profileRouter.patch(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2, "Name is too short.").optional(),
        image: z.string().trim().url("Enter a valid image URL.").optional(),
        phone: z.string().trim().max(30, "Phone number is too long.").optional(),
      })
      .strict()
      .parse(req.body);

    const id = currentUser(req).id;
    if (!ObjectId.isValid(id)) throw new ApiError(400, "Invalid user id.");
    const user = await rawDb.collection("user").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: "after" },
    );
    if (!user) throw new ApiError(404, "User not found.");
    res.json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        role: user.role,
        isBlocked: Boolean(user.isBlocked),
        phone: user.phone ?? null,
      },
      message: "Profile updated successfully.",
    });
  }),
);
