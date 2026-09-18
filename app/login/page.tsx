"use client";

import { useState } from "react";
import { loginUser, registerUser } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Portal selected on the landing page
  const selectedRole =
    searchParams.get("role") === "admin"
      ? "admin"
      : "citizen";

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // HANDLE LOGIN / REGISTER
  // ==========================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      // ========================================
      // REGISTER
      // ========================================

      if (isRegister) {
        // Only citizens can register themselves
        if (selectedRole === "admin") {
          setMessage(
            "Government accounts can only be created by an administrator."
          );

          setLoading(false);
          return;
        }

        const registration = await registerUser(
          email,
          password
        );

        const token = await registration.user.getIdToken();
        const profileResponse = await fetch(
          "/api/citizen/profile",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fullName,
              email: registration.user.email || email,
              dateOfBirth,
              gender,
              city,
              state,
            }),
          }
        );

        if (!profileResponse.ok) {
          const profileError = await profileResponse.json().catch(() => ({}));
          throw new Error(profileError.error || "Unable to save your profile.");
        }

        setMessage(
          "Citizen account created successfully! 🎉"
        );

        router.replace("/citizen");

        return;
      }

      // ========================================
      // LOGIN
      // ========================================

      const result = await loginUser(
        email,
        password
      );

      const user = result.user;

      console.log(
        "🔐 LOGIN USER:",
        user.uid
      );

      // ========================================
      // GET FIREBASE ID TOKEN
      // ========================================

      const token =
        await user.getIdToken();

      // ========================================
      // CHECK ADMIN ROLE USING SECURE API
      // ========================================

      const response = await fetch(
        "/api/auth/check-admin",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      console.log(
        "🔐 ROLE CHECK:",
        data
      );

      // ========================================
      // GOVERNMENT PORTAL
      // ========================================

      if (selectedRole === "admin") {

        if (!data.isAdmin) {

          console.log(
            "🚫 CITIZEN BLOCKED FROM GOVERNMENT PORTAL"
          );

          setMessage(
            "Access denied. This account is not a government administrator account."
          );

          await auth.signOut();

          return;
        }

        console.log(
          "✅ ADMIN LOGIN SUCCESS"
        );

        router.replace("/dashboard");

        return;
      }

      // ========================================
      // CITIZEN PORTAL
      // ========================================

      if (selectedRole === "citizen") {

        if (data.isAdmin) {

          console.log(
            "🚫 ADMIN BLOCKED FROM CITIZEN PORTAL"
          );

          setMessage(
            "Access denied. Government administrator accounts cannot access the citizen portal."
          );

          await auth.signOut();

          return;
        }

        console.log(
          "✅ CITIZEN LOGIN SUCCESS"
        );

        router.replace("/citizen");

        return;
      }

    } catch (error: any) {

      console.error(
        "❌ LOGIN ERROR:",
        error
      );

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setMessage(
          "This email is already registered."
        );

      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        setMessage(
          "Please enter a valid email."
        );

      } else if (
        error.code ===
        "auth/weak-password"
      ) {
        setMessage(
          "Password must be at least 6 characters."
        );

      } else if (
        error.code ===
          "auth/invalid-credential" ||
        error.code ===
          "auth/wrong-password"
      ) {
        setMessage(
          "Invalid email or password."
        );

      } else {
        setMessage(
          `Firebase error: ${
            error.code || "unknown"
          } - ${
            error.message ||
            "Unknown error"
          }`
        );
      }

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        {/* HEADER */}

        <div className="text-center mb-8">

          <div className="text-4xl mb-3">
            {selectedRole === "admin"
              ? "🏛️"
              : "👤"}
          </div>

          <h1 className="text-3xl font-bold">
            CivicPulse AI
          </h1>

          <p className="text-blue-400 mt-2 font-semibold">
            {selectedRole === "admin"
              ? "Government Portal"
              : "Citizen Portal"}
          </p>

          <p className="text-slate-400 mt-2">
            {isRegister
              ? "Create your citizen account"
              : selectedRole === "admin"
              ? "Login to the government administration portal"
              : "Login to your citizen account"}
          </p>

        </div>

        {/* LOGIN CARD */}

        <div className="bg-[#0d1b2e] border border-slate-700 rounded-2xl p-7 shadow-xl">

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* EMAIL */}

            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
              />

            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Gender
                  </label>

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    City
                  </label>

                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    State
                  </label>

                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* PASSWORD */}

            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500"
              />

            </div>

            {/* MESSAGE */}

            {message && (
              <div
                className={`text-sm text-center rounded-lg p-3 ${
                  message.includes("denied")
                    ? "text-red-300 bg-red-500/10 border border-red-500/20"
                    : "text-blue-300 bg-blue-500/10 border border-blue-500/20"
                }`}
              >
                {message}
              </div>
            )}

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold transition"
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Citizen Account"
                : selectedRole === "admin"
                ? "Government Login"
                : "Citizen Login"}
            </button>

          </form>

          {/* REGISTER */}

          {selectedRole === "citizen" && (
            <div className="mt-6 text-center text-sm text-slate-400">

              {isRegister
                ? "Already have an account?"
                : "Don't have an account?"}

              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setMessage("");
                }}
                className="ml-2 text-blue-400 hover:text-blue-300 font-semibold"
              >
                {isRegister
                  ? "Login"
                  : "Register"}
              </button>

            </div>
          )}

          {/* BACK */}

          <div className="mt-5 text-center">

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              ← Back to Portal Selection
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}
