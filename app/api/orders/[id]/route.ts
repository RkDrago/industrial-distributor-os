import { NextResponse } from "next/server"; import { connectDB } from "@/lib/db"; import { Order } from "@/models/Order";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const allowed=["new","pending","confirmed","shipped","delivered","cancelled"];
export async function PATCH(req:Request,{params}:{params:{id:string}}){try{await connectDB();const b=await req.json();if(!allowed.includes(b.orderStatus))return NextResponse.json({error:"Invalid status"},{status:400});const o=await Order.findByIdAndUpdate(params.id,{orderStatus:b.orderStatus},{new:true});if(!o)return NextResponse.json({error:"Order not found"},{status:404});return NextResponse.json(o)}catch(e){return NextResponse.json({error:"Could not update order"},{status:500})}}