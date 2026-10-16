// Run with: node scripts/seed.mjs (after .env.local is configured)
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({path:".env.local"});
const uri=process.env.MONGODB_URI;if(!uri)throw new Error("MONGODB_URI missing in .env.local");
await mongoose.connect(uri);
const schema=new mongoose.Schema({title:String,slug:String,sku:String,hsnCode:String,description:String,images:[String],stock:Number,moq:Number,price:{mrp:Number,distributorPrice:Number,bulkSlabs:[{minQty:Number,price:Number}]},gstPercent:Number,isActive:Boolean},{timestamps:true});
const Product=mongoose.models.Product||mongoose.model("Product",schema);
const samples=[
{title:"Industrial Safety Helmet",slug:"industrial-safety-helmet",sku:"PPE-1001",hsnCode:"650610",description:"Lightweight protective helmet for industrial work environments.",images:["https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80"],stock:450,moq:10,price:{mrp:420,distributorPrice:320,bulkSlabs:[{minQty:50,price:295},{minQty:100,price:275}]},gstPercent:18,isActive:true},
{title:"Professional Power Drill",slug:"professional-power-drill",sku:"TLS-2004",hsnCode:"846721",description:"Durable high-performance drill for maintenance and workshop teams.",images:["https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80"],stock:120,moq:5,price:{mrp:3900,distributorPrice:3250,bulkSlabs:[{minQty:20,price:3050}]},gstPercent:18,isActive:true},
{title:"Electrical Control Components Kit",slug:"electrical-control-components-kit",sku:"ELC-3102",hsnCode:"853690",description:"A practical assortment of electrical control and connection components.",images:["https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80"],stock:85,moq:3,price:{mrp:5600,distributorPrice:4750,bulkSlabs:[{minQty:10,price:4450}]},gstPercent:18,isActive:true},
{title:"Warehouse Storage Crate",slug:"warehouse-storage-crate",sku:"WH-4020",hsnCode:"392310",description:"Stackable heavy-duty crate for inventory handling and storage.",images:["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80"],stock:600,moq:25,price:{mrp:260,distributorPrice:195,bulkSlabs:[{minQty:100,price:175}]},gstPercent:18,isActive:true}
];
for(const p of samples)await Product.updateOne({sku:p.sku},{$set:p},{upsert:true});
console.log(`Seeded ${samples.length} demo products.`);await mongoose.disconnect();