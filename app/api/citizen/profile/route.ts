import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../../firebaseAdmin";

type ProfileInput = {
  fullName?: unknown;
  email?: unknown;
  dateOfBirth?: unknown;
  gender?: unknown;
  city?: unknown;
  state?: unknown;
};

function getAuthenticatedUid(request: Request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication required");
  }

  return adminAuth.verifyIdToken(authorization.substring(7));
}

function validateProfile(input: ProfileInput) {
  const fields = [
    "fullName",
    "email",
    "dateOfBirth",
    "gender",
    "city",
    "state",
  ] as const;
  const values = {} as Record<(typeof fields)[number], string>;

  for (const field of fields) {
    const value = input[field];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`A valid ${field} is required`);
    }

    values[field] = value.trim();
  }

  const dateOfBirth = values.dateOfBirth;
  const parsedDate = new Date(`${dateOfBirth}T00:00:00`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate > new Date()
  ) {
    throw new Error("A valid date of birth is required");
  }

  return {
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    dateOfBirth,
    gender: values.gender,
    city: values.city,
    state: values.state,
  };
}

export async function GET(request: Request) {
  try {
    const decodedToken = await getAuthenticatedUid(request);
    const profile = await adminDb.collection("users").doc(decodedToken.uid).get();

    return NextResponse.json({
      profile: profile.exists ? { uid: decodedToken.uid, ...profile.data() } : null,
    });
  } catch (error) {
    console.error("Unable to load citizen profile:", error);
    return NextResponse.json(
      { error: "Unable to load your profile" },
      { status: 401 }
    );
  }
}

async function saveProfile(request: Request) {
  try {
    const decodedToken = await getAuthenticatedUid(request);
    const profile = validateProfile((await request.json()) as ProfileInput);
    const profileRef = adminDb.collection("users").doc(decodedToken.uid);
    const existingProfile = await profileRef.get();
    const existingCreatedAt = existingProfile.get("createdAt");

    await profileRef.set(
      {
        uid: decodedToken.uid,
        ...profile,
        email: decodedToken.email || profile.email,
        createdAt: existingProfile.exists
          ? existingCreatedAt || FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to save citizen profile:", error);
    const message = error instanceof Error ? error.message : "Unable to save your profile";
    const status = message === "Authentication required" ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  return saveProfile(request);
}

export async function PUT(request: Request) {
  return saveProfile(request);
}
