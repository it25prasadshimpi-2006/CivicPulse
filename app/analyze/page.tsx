"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface Report {
  description: string;
  category: string;
  location: string;
  photo?: string;
}

interface Analysis {
  language: string;
  category: string;
  issue: string;
  severity: string;
  duration: string;
  summary: string;
  severity_reason: string;
  recommended_action: string;
  visual_evidence: string;
}

export default function AnalyzePage() {
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusMessage, setStatusMessage] = useState(
    "Registering your complaint..."
  );

  const [submitted, setSubmitted] = useState(false);
  const [complaintNumber, setComplaintNumber] = useState("");

  // ==========================================
  // AUTH + LOAD REPORT
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      setUser(currentUser);
    });

    const savedReport = localStorage.getItem("civicpulse_report");

    if (savedReport) {
      try {
        setReport(JSON.parse(savedReport));
      } catch (err) {
        console.error("Invalid saved report:", err);
        setError("Unable to load your complaint.");
        setLoading(false);
      }
    } else {
      setError("No complaint found. Please submit a complaint first.");
      setLoading(false);
    }

    return () => unsubscribe();
  }, [router]);

  // ==========================================
  // AUTOMATICALLY PROCESS COMPLAINT
  // ==========================================

  useEffect(() => {
    if (!report || !user || submitted) return;

    submitComplaint(report, user);
  }, [report, user]);

  // ==========================================
  // SUBMIT COMPLAINT
  // Gemini works in background
  // ==========================================

  const submitComplaint = async (
    currentReport: Report,
    currentUser: User
  ) => {
    try {
      setLoading(true);
      setError("");

      // ==========================================
      // STEP 1: GEMINI ANALYSIS
      // ==========================================

      setStatusMessage("🤖 Understanding your complaint with AI...");

      console.log("🤖 Sending complaint to Gemini...");
      console.log("📷 Photo exists:", !!currentReport.photo);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: currentReport.description,
          category: currentReport.category,
          location: currentReport.location,
          photo: currentReport.photo || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed");
      }

      console.log("🤖 Gemini analysis completed");

      setAnalysis(data);

      // ==========================================
      // STEP 2: UPLOAD PHOTO
      // ==========================================

      let photoUrl = "";

      if (currentReport.photo) {
        setStatusMessage("📷 Securely uploading your evidence...");

        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: currentReport.photo,
          }),
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error || "Failed to upload evidence photo"
          );
        }

        photoUrl = uploadData.imageUrl;

        console.log("✅ Photo uploaded successfully");
      }

      // ==========================================
      // STEP 3: SAVE COMPLAINT
      // ==========================================

      setStatusMessage("📋 Registering your complaint...");

      const saveResponse = await fetch("/api/save-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: currentReport.description,
          category: currentReport.category,
          location: currentReport.location,
          aiAnalysis: data,

          // Cloudinary image
          photoUrl: photoUrl,

          // Citizen identity
          userId: currentUser.uid,
          userEmail: currentUser.email || "",
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          saveData.error || "Failed to register complaint"
        );
      }

      console.log("✅ Complaint registered:", saveData);

      // ==========================================
      // STEP 4: GET COMPLAINT NUMBER
      // ==========================================

      const generatedComplaintNumber =
        saveData.complaintNumber ||
        `CP-${String(saveData.documentId || "").slice(0, 8).toUpperCase()}`;

      setComplaintNumber(generatedComplaintNumber);

      setSubmitted(true);
      setLoading(false);

      setStatusMessage("Your complaint has been successfully registered.");

      // Remove temporary report from localStorage
      localStorage.removeItem("civicpulse_report");
    } catch (err) {
      console.error("❌ COMPLAINT SUBMISSION ERROR:", err);

      setLoading(false);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong while registering your complaint.");
      }
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ==========================================
  // DISPLAY USERNAME
  // ==========================================

  const getUsername = () => {
    if (!user) return "Citizen";

    if (user.displayName) {
      return user.displayName;
    }

    if (user.email) {
      return user.email.split("@")[0];
    }

    return "Citizen";
  };

  // ==========================================
  // NO REPORT / ERROR
  // ==========================================

  if (!report && error) {
    return (
      <main className="min-h-screen bg-[#050b18] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-5">⚠️</div>

          <h1 className="text-2xl font-bold mb-3">
            No Complaint Found
          </h1>

          <p className="text-gray-400 mb-6">
            {error}
          </p>

          <button
            type="button"
            onClick={() => router.push("/citizen")}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold"
          >
            Go to Citizen Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!report || !user) {
    return (
      <main className="min-h-screen bg-[#050b18] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>

          <p className="text-gray-400">
            Preparing your complaint...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#050b18] text-white">

      {/* ========================================
          HEADER
      ======================================== */}

      <header className="border-b border-gray-800 bg-[#07101f]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* LOGO */}
          <div>
            <h1 className="text-xl font-bold text-blue-400">
              CivicPulse AI
            </h1>

            <p className="text-xs text-gray-500">
              Citizen Complaint Portal
            </p>
          </div>

          {/* USER + LOGOUT */}
          <div className="flex items-center gap-4">

            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">
                Logged in as
              </p>

              <p className="text-sm font-semibold text-gray-200">
                {getUsername()}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/citizen")}
              className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-blue-400 hover:bg-gray-800 transition"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg border border-red-900 text-sm text-red-400 hover:bg-red-950 transition"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* ========================================
          CONTENT
      ======================================== */}

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* PAGE TITLE */}

        <div className="mb-8">

          <p className="text-blue-400 font-semibold mb-2">
            CIVICPULSE AI
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {submitted
              ? "Complaint Registered"
              : "Submitting Your Complaint"}
          </h1>

          <p className="text-gray-400">
            {submitted
              ? "Your complaint has been successfully submitted to CivicPulse."
              : "Please wait while we securely process and register your complaint."}
          </p>

        </div>

        {/* ========================================
            SUCCESS STATE
        ======================================== */}

        {submitted && (
          <div className="space-y-6">

            {/* SUCCESS CARD */}

            <div className="bg-[#0c1628] border border-green-900 rounded-2xl p-8 text-center">

              <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-green-950 border border-green-800 flex items-center justify-center text-3xl">
                ✓
              </div>

              <h2 className="text-2xl font-bold text-green-400 mb-3">
                Complaint Submitted Successfully
              </h2>

              <p className="text-gray-400 mb-7">
                Your complaint has been registered. Keep your complaint
                number for tracking its status.
              </p>

              {/* COMPLAINT NUMBER */}

              <div className="bg-[#081120] border border-blue-900 rounded-xl p-5 max-w-md mx-auto">

                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Complaint Number
                </p>

                <p className="text-2xl md:text-3xl font-mono font-bold text-blue-400 tracking-wider">
                  {complaintNumber}
                </p>

              </div>

            </div>

            {/* COMPLAINT SUMMARY */}

            <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-6">

              <h2 className="text-lg font-semibold mb-5">
                Complaint Details
              </h2>

              <div className="space-y-5">

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Problem
                  </p>

                  <p className="text-gray-200">
                    {report.description}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Category
                    </p>

                    <p className="text-gray-200">
                      {report.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Location
                    </p>

                    <p className="text-gray-200">
                      {report.location}
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">

              <button
                type="button"
                onClick={() => router.push("/citizen/complaints")}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-semibold transition"
              >
                Track Complaint →
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="border border-gray-700 hover:bg-gray-800 px-8 py-3 rounded-xl font-semibold transition"
              >
                Logout
              </button>

            </div>

            <p className="text-center text-xs text-gray-600 pt-2">
              Powered by Google Gemini AI • CivicPulse
            </p>

          </div>
        )}

        {/* ========================================
            PROCESSING STATE
        ======================================== */}

        {!submitted && loading && (

          <div className="space-y-6">

            {/* PROCESSING CARD */}

            <div className="bg-[#0c1628] border border-blue-900 rounded-2xl p-8">

              <div className="flex flex-col items-center text-center">

                <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin mb-6"></div>

                <h2 className="text-xl font-semibold mb-3">
                  Registering Your Complaint
                </h2>

                <p className="text-gray-400 mb-6">
                  {statusMessage}
                </p>

                {/* PROGRESS STEPS */}

                <div className="w-full max-w-md space-y-3 text-left">

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-950 text-green-400 flex items-center justify-center text-sm">
                      ✓
                    </div>

                    <span className="text-sm text-gray-300">
                      Complaint received
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center text-sm animate-pulse">
                      •
                    </div>

                    <span className="text-sm text-gray-300">
                      AI processing and classification
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center text-sm">
                      3
                    </div>

                    <span className="text-sm text-gray-500">
                      Complaint registration
                    </span>
                  </div>

                </div>

              </div>

            </div>

            {/* COMPLAINT PREVIEW */}

            <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-6">

              <h2 className="text-lg font-semibold mb-5">
                Your Complaint
              </h2>

              <div className="space-y-4">

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Problem
                  </p>

                  <p className="text-gray-200">
                    {report.description}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Category
                    </p>

                    <p className="text-gray-200">
                      {report.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Location
                    </p>

                    <p className="text-gray-200">
                      {report.location}
                    </p>
                  </div>

                </div>

                {report.photo && (
                  <div className="pt-2">

                    <p className="text-xs text-gray-500 mb-2">
                      Evidence Photo
                    </p>

                    <img
                      src={report.photo}
                      alt="Citizen uploaded evidence"
                      className="w-full max-h-72 object-contain rounded-xl border border-gray-800 bg-black"
                    />

                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* ========================================
            ERROR
        ======================================== */}

        {error && !submitted && (

          <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl p-5">

            <p className="font-semibold mb-2">
              Unable to Register Complaint
            </p>

            <p className="text-sm">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-900 hover:bg-red-800 px-5 py-2 rounded-lg text-sm font-semibold"
            >
              Try Again
            </button>

          </div>

        )}

      </div>

    </main>
  );
}