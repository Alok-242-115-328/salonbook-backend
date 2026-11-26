import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { currentUser, requireCustomer } from "../middleware/auth";
import { Appointment } from "../models/Appointment";
import { Transaction } from "../models/Transaction";
import { env } from "../env";
import { ApiError, asyncHandler } from "../utils/http";

export const paymentRouter = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY || "sk_test_placeholder");

type CheckoutSessionParams = Stripe.Checkout.SessionCreateParams & {
  managed_payments?: { enabled: boolean };
};

paymentRouter.post(
  "/create-checkout",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const { appointmentId } = z.object({ appointmentId: z.string().min(1) }).parse(req.body);
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      customerId: currentUser(req).id,
    }).populate("serviceId", "serviceName");

    if (!appointment) throw new ApiError(404, "Appointment not found.");
    if (appointment.status !== "confirmed") throw new ApiError(400, "Only confirmed appointments can be paid.");
    if (appointment.paymentStatus === "paid") throw new ApiError(400, "This appointment is already paid.");
    if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, "Stripe is not configured on the server.");

    const service = appointment.serviceId as unknown as { serviceName?: string };
    const sessionParams: CheckoutSessionParams = {
      mode: "payment",
      customer_email: currentUser(req).email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: env.PAYMENT_CURRENCY,
            unit_amount: Math.round(appointment.servicePrice * 100),
            product_data: {
              name: service?.serviceName || "SalonBook appointment",
              description: `Appointment ${appointment.appointmentDate} at ${appointment.timeSlot}`,
            },
          },
        },
      ],
      metadata: {
        appointmentId: String(appointment._id),
        customerId: appointment.customerId,
      },
      payment_intent_data: {
        metadata: {
          appointmentId: String(appointment._id),
          customerId: appointment.customerId,
        },
      },
      managed_payments: { enabled: false },
      success_url: `${env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (error) {
      const stripeError = error as { statusCode?: number; message?: string };
      const status =
        stripeError.statusCode && stripeError.statusCode >= 400 && stripeError.statusCode < 500
          ? stripeError.statusCode
          : 500;
      const message = stripeError.message || "Unable to create Stripe Checkout session.";
      if (status >= 500) console.error("[SalonBook API] create-checkout failed:", error);
      return res.status(status).json({ success: false, error: message, message });
    }

    appointment.stripeSessionId = session.id;
    await appointment.save();

    res.json({ success: true, url: session.url, sessionId: session.id });
  }),
);

paymentRouter.get(
  "/verify-session",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const { session_id: sessionId } = z.object({ session_id: z.string().min(1) }).parse(req.query);
    let appointment = await Appointment.findOne({
      stripeSessionId: sessionId,
      customerId: currentUser(req).id,
    });

    if (!appointment) {
      try {
        const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
        const appointmentId = stripeSession.metadata?.appointmentId;
        if (appointmentId) {
          appointment = await Appointment.findOne({
            _id: appointmentId,
            customerId: currentUser(req).id,
          });
        }
      } catch {
        appointment = null;
      }
    }

    res.json({
      success: true,
      paid: appointment?.paymentStatus === "paid",
      paymentStatus: appointment?.paymentStatus ?? "unpaid",
    });
  }),
);

export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(503, "STRIPE_WEBHOOK_SECRET is not configured. Run the Stripe CLI webhook listener.");
  }
  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) throw new ApiError(400, "Missing Stripe signature.");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new ApiError(400, "Invalid Stripe webhook signature.");
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointmentId;
    const appointment = await Appointment.findOne({
      $or: [{ stripeSessionId: session.id }, ...(appointmentId ? [{ _id: appointmentId }] : [])],
    });

    const expectedAmount = Math.round(Number(appointment?.servicePrice) * 100);
    const amountMatches =
      Number.isFinite(expectedAmount) && expectedAmount > 0 && session.amount_total === expectedAmount;
    const currencyMatches =
      (session.currency ?? "").toLowerCase() === env.PAYMENT_CURRENCY.toLowerCase();

    if (
      appointment &&
      session.payment_status === "paid" &&
      appointment.status === "confirmed" &&
      appointment.paymentStatus === "unpaid" &&
      amountMatches &&
      currencyMatches
    ) {
      await Appointment.updateOne(
        { _id: appointment._id, paymentStatus: "unpaid" },
        { $set: { paymentStatus: "paid", stripeSessionId: session.id } },
      );
      await Transaction.updateOne(
        { stripeSessionId: session.id },
        {
          $setOnInsert: {
            appointmentId: appointment._id,
            customerId: appointment.customerId,
            amount: (session.amount_total ?? 0) / 100,
            currency: session.currency ?? env.PAYMENT_CURRENCY,
            stripeSessionId: session.id,
            status: "paid",
          },
        },
        { upsert: true },
      );
    } else {
      console.warn(`Ignored Stripe session ${session.id}: payment details did not match the appointment.`);
    }
  }

  res.json({ received: true });
});
