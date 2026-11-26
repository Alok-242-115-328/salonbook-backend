import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { currentUser, requireAdmin } from "../middleware/auth";
import { rawDb } from "../db";
import { ApiError, asyncHandler } from "../utils/http";

export const userRouter = Router();

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

userRouter.get(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {};
    const users = await rawDb
      .collection("user")
      .find(filter, {
        projection: { name: 1, email: 1, image: 1, role: 1, isBlocked: 1, phone: 1, createdAt: 1 },
      })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({
      success: true,
      users: users.map((user) => ({ ...user, id: String(user._id) })),
    });
  }),
);

userRouter.get(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid user id.");
    const user = await rawDb.collection("user").findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { name: 1, email: 1, image: 1, role: 1, isBlocked: 1, phone: 1, createdAt: 1 } },
    );
    if (!user) throw new ApiError(404, "User not found.");
    res.json({ success: true, user: { ...user, id: String(user._id) } });
  }),
);

const setBlocked = (isBlocked: boolean) =>
  asyncHandler(async (req: import("express").Request, res: import("express").Response) => {
    if (!ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid user id.");
    if (currentUser(req).id === req.params.id) throw new ApiError(400, "You cannot change your own status.");
    const result = await rawDb.collection("user").findOneAndUpdate(
      { _id: new ObjectId(req.params.id), role: "customer" },
      { $set: { isBlocked } },
      { returnDocument: "after" },
    );
    if (!result) throw new ApiError(404, "Customer not found.");
    res.json({
      success: true,
      user: { ...result, id: String(result._id) },
      message: isBlocked ? "User blocked successfully." : "User unblocked successfully.",
    });
  });

userRouter.patch("/:id/block", requireAdmin, setBlocked(true));
userRouter.patch("/:id/unblock", requireAdmin, setBlocked(false));
