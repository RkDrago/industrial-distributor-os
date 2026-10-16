import mongoose, { Schema, Model } from "mongoose";

/**
 * Small internal key/value store for operational state and settings.
 *
 *   key = "notifications"  -> { lastSeenAt }
 *   key = "commerce"       -> { deliveryCharge, freeDeliveryThreshold, lowStockThreshold }
 *
 * Kept separate from business collections so administrative settings never
 * require a migration of existing documents.
 */
const AdminStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    lastSeenAt: { type: Date, default: null },
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const AdminState = (mongoose.models.AdminState ||
  mongoose.model("AdminState", AdminStateSchema)) as Model<any>;

export const DEFAULT_SETTINGS = {
  deliveryCharge: 0,
  freeDeliveryThreshold: 0,
  lowStockThreshold: 10,
};
