import { Schema, model, type InferSchemaType } from "mongoose";

const serviceSchema = new Schema(
  {
    serviceName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0.01 },
    duration: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

serviceSchema.virtual("id").get(function () {
  return this._id.toString();
});

export type ServiceDocument = InferSchemaType<typeof serviceSchema> & { _id: string; id: string };
export const Service = model("Service", serviceSchema);
