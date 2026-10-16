import mongoose, { Schema, Model } from "mongoose";

/**
 * Server-authoritative order document.
 * Every monetary value and every line item price is recomputed on the server
 * from the Product collection before this document is written — client totals
 * are never trusted.
 */
const AddressSchema = new Schema(
  {
    label: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    customerEmail: String,
    contactName: String,
    contactPhone: String,
    companyName: String,
    gstin: String,
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        title: String,
        sku: String,
        hsnCode: String,
        unit: String,
        qty: Number,
        price: Number,
        gstPercent: Number,
        gst: Number,
        lineTotal: Number,
        image: String,
      },
    ],
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,
    subtotal: Number,
    gstTotal: Number,
    deliveryCharge: { type: Number, default: 0 },
    grandTotal: Number,
    paymentMethod: { type: String, default: "enquiry" },
    paymentStatus: {
      type: String,
      enum: ["not_applicable", "pending", "paid", "failed", "refunded"],
      default: "not_applicable",
    },
    orderStatus: {
      type: String,
      enum: ["new", "pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "new",
    },
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        by: String,
        note: String,
      },
    ],
    trackingNumber: String,
    courier: String,
    notes: String,
    adminNote: String,
  },
  { timestamps: true }
);

export const Order = (mongoose.models.Order || mongoose.model("Order", OrderSchema)) as Model<any>;
