import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";


console.log("☁️ CLOUDINARY CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("☁️ CLOUDINARY API KEY LOADED:", !!process.env.CLOUDINARY_API_KEY);
console.log("☁️ CLOUDINARY SECRET LOADED:", !!process.env.CLOUDINARY_API_SECRET);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { image } = body;

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          error: "Image is required.",
        },
        { status: 400 }
      );
    }

    console.log("📷 Uploading image to Cloudinary...");

    const result = await cloudinary.uploader.upload(image, {
      folder: "civicpulse/reports",
      resource_type: "image",
    });

    console.log(
      "✅ Cloudinary upload successful:",
      result.secure_url
    );

    return NextResponse.json({
      success: true,
      imageUrl: result.secure_url,
    });

  } catch (error) {
    console.error(
      "❌ CLOUDINARY UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload image.",
      },
      { status: 500 }
    );
  }
}