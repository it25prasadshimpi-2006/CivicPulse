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
    } = body;

    if (!description || !category || !location || !aiAnalysis) {
      return NextResponse.json(
        {
          error: "Missing required report data",
        },
        {
          status: 400,
        }
      );
    }

    console.log("🔥 SERVER: Saving report to Firestore...");

    const docRef = await adminDb
      .collection("citizen_reports")
      .add({
        description,
        category,
        location,
        aiAnalysis,
        createdAt: new Date(),
        source: "citizen_web_report",
      });

    console.log(
      "🔥 SERVER: Firestore SUCCESS:",
      docRef.id
    );

    return NextResponse.json({
      success: true,
      documentId: docRef.id,
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
      {
        status: 500,
      }
    );
  }
}