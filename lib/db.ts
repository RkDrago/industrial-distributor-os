import mongoose from "mongoose";
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Please define MONGODB_URI in .env.local");
let cached = (global as any).mongoose || {conn:null,promise:null};
export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(uri).then(m => m);
  cached.conn = await cached.promise; (global as any).mongoose = cached; return cached.conn;
}