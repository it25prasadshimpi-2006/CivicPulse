import { NextResponse } from "next/server";
import { adminDb } from "../../../firebaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      description,
      category,
      location,
      aiAnalysis,
      photoUrl,
      userId,
      userEmail,
    } = body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !description ||
      !category ||
      !location ||
      !aiAnalysis ||
      !userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required report data or user ID",
        },
        { status: 400 }
      );
    }

    console.log("🔥 SERVER: Saving report to Firestore...");
    console.log("🔥 USER ID:", userId);
    console.log("🔥 USER EMAIL:", userEmail);

    if (photoUrl) {
      console.log("📷 CLOUDINARY PHOTO URL RECEIVED");
    } else {
      console.log("ℹ️ No photo URL provided");
    }

    // ==========================================
    // CREATE UNIQUE FIRESTORE DOCUMENT
    // ==========================================

    const docRef = adminDb
      .collection("citizen_reports")
      .doc();

    // ==========================================
    // GENERATE PERMANENT COMPLAINT NUMBER
    // ==========================================
    //
    // Firestore generates a unique document ID.
    // We use that unique ID to create the citizen-facing
    // complaint number.
    //
    // Example:
    // Firestore ID: XYMazMX1sY6MBs2IKnUh
    //
    // Complaint Number:
    // CP-XYMAZMX1SY6MB
    //
    // This number is stored permanently in Firestore.
    // ==========================================

    const complaintNumber =
      `CP-${docRef.id.slice(0, 12).toUpperCase()}`;

    console.log(
      "🎫 COMPLAINT NUMBER:",
      complaintNumber
    );

    // ==========================================
    // SAVE COMPLAINT
    // ==========================================

    await docRef.set({
      description,
      category,
      location,
      aiAnalysis,

      // 📷 Cloudinary evidence photo
      photoUrl: photoUrl || "",

      // 👤 Citizen identity
      userId,
      userEmail: userEmail || "",

      // 🎫 Complaint identification
      complaintNumber,

      // Complaint tracking
      status: "Submitted",
      department: "",
      adminRemark: "",

      // Metadata
      createdAt: new Date(),
      source: "citizen_web_report",
    });

    console.log(
      "🔥 SERVER: Firestore SUCCESS:",
      docRef.id
    );

    console.log(
      "🎫 SERVER: Complaint Number:",
      complaintNumber
    );

    // ==========================================
    // RETURN BOTH IDS
    // ==========================================

    return NextResponse.json({
      success: true,

      // Internal Firestore ID
      documentId: docRef.id,

      // Citizen-facing complaint number
      complaintNumber,
    });

  } catch (error) {
    console.error(
      "🔥 SERVER: Firestore ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save report",
      },
      { status: 500 }
    );
  }
}