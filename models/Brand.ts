import mongoose, { Schema, Model } from "mongoose";
const BrandSchema = new Schema({name:{type:String,required:true},slug:{type:String,required:true,unique:true},logo:String},{timestamps:true});
export const Brand = (mongoose.models.Brand || mongoose.model("Brand",BrandSchema)) as Model<any>;