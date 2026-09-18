import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../firebaseAdmin";

export async function GET(request: Request) {
  try {
    // --------------------------------
    // GET FIREBASE ID TOKEN
    // --------------------------------

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          isAdmin: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization.substring(7);

    // --------------------------------
    // VERIFY FIREBASE USER
    // --------------------------------

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;

    console.log(
      "🔐 ADMIN CHECK: User:",
      uid
    );

    // --------------------------------
    // CHECK USER ROLE
    // --------------------------------

    const userDoc = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        isAdmin: false,
      });
    }

    const userData = userDoc.data();

    const isAdmin =
      userData?.role === "admin";

    console.log(
      "🔐 ADMIN CHECK:",
      isAdmin ? "ADMIN" : "CITIZEN"
    );

    return NextResponse.json({
      success: true,
      isAdmin,
    });

  } catch (error) {
    console.error(
      "❌ ADMIN CHECK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        isAdmin: false,
        error: "Invalid or expired authentication",
      },
      { status: 401 }
    );
  }
}