import { Router, type Request } from "express";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { currentUser, optionalAuth, requireAdmin } from "../middleware/auth";
import { Service } from "../models/Service";
import { ApiError, asyncHandler } from "../utils/http";

export const serviceRouter = Router();

const createSchema = z.object({
  serviceName: z.string().trim().min(2, "Service name is too short."),
  category: z.string().trim().min(2, "Category is required."),
  description: z.string().trim().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  duration: z.coerce.number().int().positive("Duration must be a positive number."),
  image: z.string().trim().url("A service image URL is required."),
  status: z.enum(["active", "inactive"]).default("active"),
});

const updateSchema = createSchema.partial();

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

serviceRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const includeAll = req.query.all === "true";
    if (includeAll && currentUser(req).role !== "admin") {
      throw new ApiError(403, "Admin access required.");
    }
    const query: Record<string, unknown> = includeAll ? {} : { status: "active" };
    const search = String(req.query.search ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    if (search) query.serviceName = { $regex: escapeRegex(search), $options: "i" };
    if (category && category !== "all") query.category = category;

    const sort = String(req.query.sort ?? "");
    const priceSort = sort === "price_asc" ? 1 : sort === "price_desc" ? -1 : 0;
    const services = await Service.find(query).sort(
      priceSort ? { price: priceSort } : { createdAt: -1 },
    );
    res.json({ success: true, services });
  }),
);

serviceRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid service id.");
    const user = (req as Request & { authUser?: { role?: string } }).authUser;
    const query = user?.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, status: "active" };
    const service = await Service.findOne(query);
    if (!service) throw new ApiError(404, "Service not found or no longer available.");
    res.json({ success: true, service });
  }),
);

serviceRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const service = await Service.create(data);
    res.status(201).json({ success: true, service, message: "Service created successfully." });
  }),
);

serviceRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid service id.");
    const data = updateSchema.parse(req.body);
    const service = await Service.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!service) throw new ApiError(404, "Service not found.");
    res.json({ success: true, service, message: "Service updated successfully." });
  }),
);

serviceRouter.patch(
  "/:id/status",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid service id.");
    const status = z.enum(["active", "inactive"]).parse(req.body.status);
    const service = await Service.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!service) throw new ApiError(404, "Service not found.");
    res.json({
      success: true,
      service,
      message: status === "active" ? "Service activated." : "Service deactivated.",
    });
  }),
);

serviceRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid service id.");
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) throw new ApiError(404, "Service not found.");
    res.json({ success: true, message: "Service deleted successfully." });
  }),
);
