import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../firebaseAdmin";

export async function DELETE(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { complaintId } = await request.json();

    if (typeof complaintId !== "string" || !complaintId.trim()) {
      return NextResponse.json({ success: false, error: "A valid complaint ID is required" }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(authorization.substring(7));
    const complaintRef = adminDb.collection("citizen_reports").doc(complaintId);
    const complaintSnapshot = await complaintRef.get();

    if (!complaintSnapshot.exists) {
      return NextResponse.json({ success: false, error: "Complaint not found" }, { status: 404 });
    }

    const complaint = complaintSnapshot.data();

    if (complaint?.userId !== decodedToken.uid) {
      return NextResponse.json({ success: false, error: "You can only delete your own complaints" }, { status: 403 });
    }

    if ((complaint.status || "Submitted") !== "Submitted") {
      return NextResponse.json(
        { success: false, error: "This complaint can no longer be deleted because government action has started" },
        { status: 409 }
      );
    }

    await complaintRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CITIZEN COMPLAINT DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Unable to delete the complaint. Please retry." },
      { status: 500 }
    );
  }
}
