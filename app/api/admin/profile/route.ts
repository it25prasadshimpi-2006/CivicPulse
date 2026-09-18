import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../../firebaseAdmin";

type AdminProfileInput = {
  fullName?: unknown;
  designation?: unknown;
  department?: unknown;
  city?: unknown;
  state?: unknown;
};

async function getAuthorizedAdmin(request: Request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication required");
  }

  const decodedToken = await adminAuth.verifyIdToken(authorization.substring(7));
  const profileRef = adminDb.collection("users").doc(decodedToken.uid);
  const profileSnapshot = await profileRef.get();

  if (!profileSnapshot.exists || profileSnapshot.get("role") !== "admin") {
    throw new Error("Admin access required");
  }

  return { decodedToken, profileRef, profileSnapshot };
}

function validateProfile(input: AdminProfileInput) {
  const fields = ["fullName", "designation", "department", "city", "state"] as const;
  const values = {} as Record<(typeof fields)[number], string>;

  for (const field of fields) {
    const value = input[field];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`A valid ${field} is required`);
    }

    values[field] = value.trim();
  }

  return values;
}

export async function GET(request: Request) {
  try {
    const { decodedToken, profileSnapshot } = await getAuthorizedAdmin(request);

    return NextResponse.json({
      profile: {
        uid: decodedToken.uid,
        ...profileSnapshot.data(),
        email: decodedToken.email || profileSnapshot.get("email") || "",
      },
    });
  } catch (error) {
    console.error("Unable to load admin profile:", error);
    const message = error instanceof Error ? error.message : "Unable to load profile";
    const status = message === "Authentication required" ? 401 : 403;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const { decodedToken, profileRef, profileSnapshot } = await getAuthorizedAdmin(request);
    const profile = validateProfile((await request.json()) as AdminProfileInput);
    const existingCreatedAt = profileSnapshot.get("createdAt");

    await profileRef.set(
      {
        uid: decodedToken.uid,
        ...profile,
        email: decodedToken.email || profileSnapshot.get("email") || "",
        createdAt: existingCreatedAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to save admin profile:", error);
    const message = error instanceof Error ? error.message : "Unable to save profile";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Admin access required"
        ? 403
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
