import { Router } from "express";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { currentUser, requireAdmin, requireAuth, requireCustomer } from "../middleware/auth";
import { Appointment } from "../models/Appointment";
import { Service } from "../models/Service";
import { rawDb } from "../db";
import { ApiError, asyncHandler } from "../utils/http";
import { TIME_SLOTS } from "../utils/constants";

export const appointmentRouter = Router();

const bookingSchema = z.object({
  serviceId: z.string().trim().min(1, "Service is required."),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid appointment date."),
  timeSlot: z.string().refine((slot) => (TIME_SLOTS as readonly string[]).includes(slot), "Choose a valid time slot."),
  message: z.string().trim().max(1000, "Message is too long.").optional().default(""),
});

const populateService = (query: any) =>
  query.populate("serviceId", "serviceName category image duration price status");

async function withCustomers(appointments: any[]) {
  const ids = [...new Set(appointments.map((item) => String(item.customerId)))]
    .filter((id) => isValidObjectId(id))
    .map((id) => new Types.ObjectId(id));
  const users = ids.length
    ? await rawDb
        .collection("user")
        .find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, image: 1 } })
        .toArray()
    : [];
  const map = new Map(users.map((user) => [String(user._id), user]));
  return appointments.map((item) => ({
    ...item,
    id: String(item._id),
    customer: map.get(String(item.customerId)) ?? null,
  }));
}

appointmentRouter.post(
  "/",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const data = bookingSchema.parse(req.body);
    if (!isValidObjectId(data.serviceId)) throw new ApiError(400, "Invalid service id.");
    if (data.appointmentDate < new Date().toISOString().slice(0, 10)) {
      throw new ApiError(400, "Appointment date cannot be in the past.");
    }

    const service = await Service.findById(data.serviceId);
    if (!service || service.status !== "active") {
      throw new ApiError(400, "This service is not available for booking.");
    }

    const conflict = await Appointment.findOne({
      serviceId: data.serviceId,
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot,
      status: { $in: ["pending", "confirmed"] },
    });
    if (conflict) throw new ApiError(409, "This date and time slot is already booked. Please choose another slot.");

    const appointment = await Appointment.create({
      serviceId: data.serviceId,
      customerId: currentUser(req).id,
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot,
      message: data.message,
      servicePrice: service.price,
      status: "pending",
      paymentStatus: "unpaid",
    });
    await appointment.populate("serviceId", "serviceName category image duration price status");
    res.status(201).json({ success: true, appointment, message: "Appointment request submitted successfully." });
  }),
);

appointmentRouter.get(
  "/mine",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const appointments = await populateService(
      Appointment.find({ customerId: currentUser(req).id }).sort({ createdAt: -1 }),
    );
    res.json({ success: true, appointments });
  }),
);

appointmentRouter.get(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const filter: Record<string, unknown> = {};
    if (search) filter.customerId = search;
    const appointments = await populateService(Appointment.find(filter).sort({ createdAt: -1 }).lean());
    res.json({ success: true, appointments: await withCustomers(appointments) });
  }),
);

appointmentRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid appointment id.");
    const user = currentUser(req);
    const appointment = await populateService(Appointment.findById(req.params.id).lean());
    if (!appointment) throw new ApiError(404, "Appointment not found.");
    if (user.role !== "admin" && String(appointment.customerId) !== user.id) {
      throw new ApiError(403, "You cannot view this appointment.");
    }
    const [decorated] = await withCustomers([appointment]);
    res.json({ success: true, appointment: decorated });
  }),
);

appointmentRouter.patch(
  "/:id/cancel",
  requireCustomer,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid appointment id.");
    const appointment = await Appointment.findOne({ _id: req.params.id, customerId: currentUser(req).id });
    if (!appointment) throw new ApiError(404, "Appointment not found.");
    if (appointment.status !== "pending") {
      throw new ApiError(400, "Only pending appointments can be cancelled.");
    }
    appointment.status = "cancelled";
    await appointment.save();
    res.json({ success: true, appointment, message: "Appointment request cancelled." });
  }),
);

appointmentRouter.patch(
  "/:id/confirm",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid appointment id.");
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) throw new ApiError(404, "Appointment not found.");
    if (appointment.status !== "pending") throw new ApiError(400, "Only pending appointments can be confirmed.");
    const conflict = await Appointment.findOne({
      serviceId: appointment.serviceId,
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      status: { $in: ["pending", "confirmed"] },
      _id: { $ne: appointment._id },
    });
    if (conflict) throw new ApiError(409, "Another active appointment already uses this slot.");
    appointment.status = "confirmed";
    await appointment.save();
    res.json({ success: true, appointment, message: "Appointment confirmed." });
  }),
);

appointmentRouter.patch(
  "/:id/admin-cancel",
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid appointment id.");
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) throw new ApiError(404, "Appointment not found.");
    if (!["pending", "confirmed"].includes(appointment.status)) {
      throw new ApiError(400, "This appointment can no longer be cancelled.");
    }
    appointment.status = "cancelled";
    await appointment.save();
    res.json({ success: true, appointment, message: "Appointment cancelled." });
  }),
);
