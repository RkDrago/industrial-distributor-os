import mongoose, { Schema, Model } from "mongoose";

const InquirySchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    guestName: String,
    guestEmail: { type: String, required: true },
    guestPhone: String,
    guestCompany: String,
    guestGstin: String,
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productTitle: String,
    productSku: String,
    quantity: { type: Number, default: 1 },
    message: String,
    inquiryNumber: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["new", "contacted", "quoted", "closed"],
      default: "new",
    },
    quoteAmount: Number,
    adminNote: String,
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        by: String,
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export const Inquiry = (mongoose.models.Inquiry ||
  mongoose.model("Inquiry", InquirySchema)) as Model<any>;
