import mongoose, { Schema, Model } from "mongoose";
const BookingSchema = new Schema({serviceType:String,customerName:String,email:String,phone:String,companyName:String,date:String,slot:String,notes:String,status:{type:String,default:"booked"}},{timestamps:true});
export const Booking = (mongoose.models.Booking || mongoose.model("Booking",BookingSchema)) as Model<any>;