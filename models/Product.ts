import mongoose, { Schema, Model } from "mongoose";

const ProductSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true },
    hsnCode: String,
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    type: { type: String, default: "product" },
    description: String,
    shortDescription: String,
    specifications: [{ key: String, value: String }],
    images: [String],
    stock: { type: Number, default: 0 },
    moq: { type: Number, default: 1 },
    unit: { type: String, default: "per piece" },
    price: {
      mrp: { type: Number, default: 0 },
      distributorPrice: { type: Number, default: 0 },
      bulkSlabs: [{ minQty: Number, price: Number }],
    },
    gstPercent: { type: Number, default: 18 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ title: "text", sku: "text", hsnCode: "text", description: "text" });

export const Product = (mongoose.models.Product ||
  mongoose.model("Product", ProductSchema)) as Model<any>;
