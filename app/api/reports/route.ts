import { NextResponse } from "next/server";
import { adminDb } from "../../../firebaseAdmin";

export async function GET() {
  try {
    console.log("📊 SERVER: Fetching citizen reports...");

    const snapshot = await adminDb
      .collection("citizen_reports")
      .orderBy("createdAt", "desc")
      .get();

    const reports = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,

        // Use saved complaint number if available.
        // For older complaints, generate one from the Firestore ID.
        complaintNumber:
          data.complaintNumber ||
          `CP-${doc.id.slice(0, 12).toUpperCase()}`,

        ...data,
      };
    });

    console.log("📊 SERVER: Reports fetched:", reports.length);

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("📊 SERVER: Reports ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch reports",
      },
      { status: 500 }
    );
  }
}