import mongoose, { Schema } from "mongoose";
const BrandSchema = new Schema({name:{type:String,required:true},slug:{type:String,required:true,unique:true},logo:String},{timestamps:true});
export const Brand = mongoose.models.Brand || mongoose.model("Brand",BrandSchema);