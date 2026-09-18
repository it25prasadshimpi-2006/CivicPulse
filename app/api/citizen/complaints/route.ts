import { NextResponse } from "next/server";
import { adminDb } from "../../../../firebaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing user ID",
        },
        { status: 400 }
      );
    }

    console.log(
      "📋 Fetching complaints for citizen:",
      userId
    );

    const snapshot = await adminDb
      .collection("citizen_reports")
      .where("userId", "==", userId)
      .get();

    const complaints = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,

          description: data.description || "",
          category: data.category || "",
          location: data.location || "",

          aiAnalysis: data.aiAnalysis || {},

          status: data.status || "Submitted",

          department: data.department || "",
          adminRemark: data.adminRemark || "",

          // Submitted timestamp
          createdAt: data.createdAt
            ? {
                _seconds: data.createdAt.seconds,
                _nanoseconds:
                  data.createdAt.nanoseconds,
              }
            : null,

          // Government/admin update timestamp
          updatedAt: data.updatedAt
            ? {
                _seconds: data.updatedAt.seconds,
                _nanoseconds:
                  data.updatedAt.nanoseconds,
              }
            : null,
        };
      })
      .sort((a: any, b: any) => {
        const aTime =
          a.createdAt?._seconds || 0;

        const bTime =
          b.createdAt?._seconds || 0;

        return bTime - aTime;
      });

    console.log(
      "✅ Complaints returned:",
      complaints.length
    );

    return NextResponse.json({
      success: true,
      complaints,
    });

  } catch (error) {
    console.error(
      "❌ CITIZEN COMPLAINTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch complaints",
      },
      { status: 500 }
    );
  }
}