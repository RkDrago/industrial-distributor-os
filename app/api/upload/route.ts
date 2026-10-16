import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/auth";
import { fail, isSameOrigin, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/**
 * Product image upload.
 *
 * Administrator only — an open upload endpoint lets anyone write to the
 * distributor's Cloudinary account and burn paid quota.
 */
export async function POST(req: Request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(req)) return fail("Request blocked: cross-site uploads are not allowed.", 403);

  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return fail(
        "Image uploads are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to enable them.",
        503
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Choose an image file to upload.", 400);
    if (!ALLOWED_TYPES.has(file.type)) return fail("Upload a JPG, PNG, WebP or AVIF image.", 415);
    if (file.size > MAX_BYTES) return fail("Images must be under 8 MB.", 413);

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "norgez/products" },
        (error, response) => (error ? reject(error) : resolve(response))
      );
      stream.end(buffer);
    });

    return NextResponse.json(
      { ok: true, url: result.secure_url, publicId: result.public_id },
      { status: 201, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return serverError("api/upload:POST", error);
  }
}
