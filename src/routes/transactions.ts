import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../middleware/auth";
import { Transaction } from "../models/Transaction";
import { rawDb } from "../db";
import { asyncHandler } from "../utils/http";

export const transactionRouter = Router();

transactionRouter.get(
  "/",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      // ✅ Nested populate ঠিক করার সঠিক নিয়ম:
      .populate({
        path: "appointmentId",
        select: "appointmentDate timeSlot status serviceId",
        populate: {
          path: "serviceId",
          select: "serviceName"
        }
      })
      .lean();

    const ids = [...new Set(transactions.map((item) => item.customerId))]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const users = ids.length
      ? await rawDb
          .collection("user")
          .find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, image: 1 } })
          .toArray()
      : [];
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    res.json({
      success: true,
      transactions: transactions.map((item) => ({
        ...item,
        id: String(item._id),
        customer: userMap.get(item.customerId) ?? null,
      })),
    });
  }),
);