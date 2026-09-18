"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logoutUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface CitizenProfile {
  fullName?: string;
}

export default function CitizenDashboard() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // ==========================================
  // AUTH CHECK + ROLE PROTECTION
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        try {
          // No logged-in user
          if (!user) {
            router.replace("/login?role=citizen");
            return;
          }

          console.log("🔐 Checking Citizen Portal access...");

          // Get Firebase ID token
          const token = await user.getIdToken();

          // Check whether this account is an admin
          const response = await fetch(
            "/api/auth/check-admin",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await response.json();

          console.log(
            "🔐 Citizen portal role check:",
            data
          );

          // Admin accounts cannot access Citizen Portal

          if (data.isAdmin) {
            console.log("🚫 Admin account cannot access Citizen Portal");
            window.location.replace("/dashboard");
            return;
        }

          // Normal citizen account
          console.log(
            "✅ Citizen access granted"
          );

          setEmail(user.email || "");
          setFullName(user.displayName || user.email || "Citizen");

          try {
            const profileResponse = await fetch(
              "/api/citizen/profile",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (profileResponse.ok) {
              const profileData = (await profileResponse.json()) as {
                profile: CitizenProfile | null;
              };

              if (profileData.profile?.fullName) {
                setFullName(profileData.profile.fullName);
              }
            }
          } catch (profileError) {
            console.error("Unable to load citizen profile:", profileError);
          }

          setLoading(false);

        } catch (error) {
          console.error(
            "❌ Citizen role verification failed:",
            error
          );

          router.replace("/login?role=citizen");
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await logoutUser();

      router.replace("/");

    } catch (error) {
      console.error(
        "❌ Logout failed:",
        error
      );

      setLoggingOut(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">
            👤
          </div>

          <p className="text-slate-300 font-semibold">
            Verifying Citizen Portal...
          </p>

          <p className="text-slate-500 text-sm mt-2">
            Checking your account access
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // CITIZEN DASHBOARD
  // ==========================================

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      {/* HEADER */}

      <header className="border-b border-slate-800 bg-[#050d19]">

        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          {/* BRAND */}

          <div>
            <h1 className="text-xl font-bold text-blue-400">
              CivicPulse AI
            </h1>

            <p className="text-xs text-slate-400">
              Citizen Portal
            </p>
          </div>

          {/* ACCOUNT + LOGOUT */}

          <div className="flex items-center gap-5">

            <div className="text-right">

              <p className="text-sm text-slate-300">
                {fullName || email || "Citizen"}
              </p>

              <p className="text-xs text-green-400">
                ● Citizen Account
              </p>

            </div>

            <button
              type="button"
              onClick={() => router.push("/citizen/profile")}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-blue-400 hover:bg-slate-800 transition"
            >
              Profile
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-50 transition text-sm font-semibold"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <section className="max-w-6xl mx-auto px-6 py-10">

        {/* INTRO */}

        <div className="mb-10">

          <p className="text-blue-400 text-sm font-semibold mb-2">
            CITIZEN DASHBOARD
          </p>

          <h2 className="text-3xl font-bold">
            Welcome to CivicPulse 👋
          </h2>

          <p className="text-slate-400 mt-2 max-w-2xl">
            Report infrastructure problems, track your complaints,
            and help authorities understand where development is needed.
          </p>

        </div>

        {/* ACTION CARDS */}

        <div className="grid md:grid-cols-2 gap-6">

          {/* REPORT */}

          <button
            onClick={() =>
              router.push("/report")
            }
            className="text-left bg-[#0d1b2e] border border-slate-700 rounded-2xl p-7 hover:border-blue-500 transition"
          >

            <div className="text-3xl mb-4">
              📝
            </div>

            <h3 className="text-xl font-bold">
              Report an Issue
            </h3>

            <p className="text-slate-400 mt-2">
              Report problems related to roads, water,
              healthcare, education, utilities and other
              public infrastructure.
            </p>

            <span className="inline-block mt-5 text-blue-400 font-semibold">
              Submit Complaint →
            </span>

          </button>

          {/* MY COMPLAINTS */}

          <button
            onClick={() =>
              router.push(
                "/citizen/complaints"
              )
            }
            className="text-left bg-[#0d1b2e] border border-slate-700 rounded-2xl p-7 hover:border-blue-500 transition"
          >

            <div className="text-3xl mb-4">
              📋
            </div>

            <h3 className="text-xl font-bold">
              My Complaints
            </h3>

            <p className="text-slate-400 mt-2">
              View your submitted complaints and track
              their current status and government updates.
            </p>

            <span className="inline-block mt-5 text-blue-400 font-semibold">
              Track Complaints →
            </span>

          </button>

        </div>

        {/* STATUS FLOW */}

        <div className="mt-10 bg-[#0d1b2e] border border-slate-700 rounded-2xl p-7">

          <h3 className="text-lg font-bold mb-6">
            Complaint Process
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

            {[
              "Submitted",
              "Under Review",
              "Assigned",
              "In Progress",
              "Resolved",
            ].map(
              (status, index) => (

                <div
                  key={status}
                  className="text-center"
                >

                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-600 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <p className="text-sm text-slate-300 mt-3">
                    {status}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </section>

    </main>
  );
}
