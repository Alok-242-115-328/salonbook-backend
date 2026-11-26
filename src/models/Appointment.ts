import { Schema, model, type InferSchemaType } from "mongoose";

const appointmentSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    customerId: { type: String, required: true, index: true },
    appointmentDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    message: { type: String, default: "" },
    servicePrice: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    stripeSessionId: { type: String, index: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

appointmentSchema.virtual("id").get(function () {
  return this._id.toString();
});
appointmentSchema.index({ serviceId: 1, appointmentDate: 1, timeSlot: 1, status: 1 });

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema> & {
  _id: string;
  id: string;
};
export const Appointment = model("Appointment", appointmentSchema);
