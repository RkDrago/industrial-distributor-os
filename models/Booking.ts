import mongoose, { Schema, Model } from "mongoose";

const BookingSchema = new Schema(
  {
    bookingNumber: { type: String, unique: true, sparse: true },
    serviceType: String,
    customerName: String,
    email: String,
    phone: String,
    companyName: String,
    date: String,
    slot: String,
    notes: String,
    status: {
      type: String,
      enum: ["booked", "confirmed", "completed", "cancelled"],
      default: "booked",
    },
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        by: String,
        note: String,
      },
    ],
    adminNote: String,
  },
  { timestamps: true }
);

export const Booking = (mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema)) as Model<any>;
