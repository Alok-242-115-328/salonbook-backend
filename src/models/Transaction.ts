import { Schema, model, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    customerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "usd" },
    stripeSessionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["paid", "failed"], default: "paid" },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

transactionSchema.virtual("id").get(function () {
  return this._id.toString();
});

export type TransactionDocument = InferSchemaType<typeof transactionSchema> & {
  _id: string;
  id: string;
};
export const Transaction = model("Transaction", transactionSchema);
