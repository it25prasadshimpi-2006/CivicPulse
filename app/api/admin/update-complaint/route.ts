import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../firebaseAdmin";

export async function PATCH(request: Request) {
  try {
    // ==========================================
    // 1. VERIFY ADMIN AUTHENTICATION
    // ==========================================

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const idToken = authorization.substring(7);

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;

    console.log(
      "🔐 ADMIN UPDATE: Authenticated user:",
      uid
    );

    // ==========================================
    // 2. CHECK ADMIN ROLE
    // ==========================================

    const userDoc = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "User account not found",
        },
        { status: 403 }
      );
    }

    const userData = userDoc.data();

    if (userData?.role !== "admin") {
      console.log(
        "🚫 ADMIN UPDATE: Access denied"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      );
    }

    console.log(
      "✅ ADMIN UPDATE: Admin verified"
    );

    // ==========================================
    // 3. READ UPDATE REQUEST
    // ==========================================

    const body = await request.json();

    const {
      complaintId,
      status,
      department,
      adminRemark,
    } = body;

    if (!complaintId) {
      return NextResponse.json(
        {
          success: false,
          error: "Complaint ID is required",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. VALIDATE STATUS
    // ==========================================

    const allowedStatuses = [
      "Submitted",
      "Under Review",
      "Assigned",
      "In Progress",
      "Resolved",
    ];

    if (
      status &&
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid complaint status",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. FIND COMPLAINT
    // ==========================================

    console.log(
      "🛠️ ADMIN: Updating complaint:",
      complaintId
    );

    const complaintRef = adminDb
      .collection("citizen_reports")
      .doc(complaintId);

    const complaintDoc =
      await complaintRef.get();

    if (!complaintDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Complaint not found",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // 6. PREPARE UPDATE
    // ==========================================

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (department !== undefined) {
      updateData.department = department;
    }

    if (adminRemark !== undefined) {
      updateData.adminRemark = adminRemark;
    }

    // ==========================================
    // 7. UPDATE FIRESTORE
    // ==========================================

    await complaintRef.update(updateData);

    console.log(
      "✅ ADMIN: Complaint updated successfully"
    );

    // ==========================================
    // 8. RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,
      message: "Complaint updated successfully",
      complaintId,
      updatedFields: updateData,
    });

  } catch (error) {
    console.error(
      "❌ ADMIN UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update complaint",
      },
      { status: 500 }
    );
  }
}