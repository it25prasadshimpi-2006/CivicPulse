"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type ProfileForm = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  state: string;
};

const emptyProfile: ProfileForm = {
  fullName: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  city: "",
  state: "",
};

function getAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;

  const [year, month, day] = dateOfBirth.split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!birthdayHasPassed) age -= 1;
  return age >= 0 ? age : null;
}

export default function CitizenProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const age = useMemo(() => getAge(profile.dateOfBirth), [profile.dateOfBirth]);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login?role=citizen");
        return;
      }

      setUser(currentUser);
      const fallbackProfile = {
        ...emptyProfile,
        fullName: currentUser.displayName || "",
        email: currentUser.email || "",
      };

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/citizen/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Unable to load your profile");
        }

        const data = (await response.json()) as { profile: Partial<ProfileForm> | null };
        if (active && data.profile) {
          setProfile({ ...fallbackProfile, ...data.profile });
        } else if (active) {
          setProfile(fallbackProfile);
          setMessage("Complete your profile to keep your citizen details up to date.");
        }
      } catch (error) {
        console.error("Unable to load citizen profile:", error);
        if (active) {
          setProfile(fallbackProfile);
          setMessage("Your profile could not be loaded. You can still complete it below.");
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/citizen/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save your profile");
      }

      setMessage("Profile saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <p className="text-slate-300">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-slate-800 bg-[#050d19]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-blue-400">CivicPulse AI</h1>
            <p className="text-xs text-slate-400">Citizen Profile</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/citizen")}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-blue-400 hover:bg-slate-800 transition"
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

      <section className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-blue-400 text-sm font-semibold mb-2">CITIZEN PROFILE</p>
        <h2 className="text-3xl font-bold">Your profile</h2>
        <p className="text-slate-400 mt-2">Keep your citizen details current. Your password is never shown or stored here.</p>

        <form onSubmit={handleSave} className="mt-8 bg-[#0d1b2e] border border-slate-700 rounded-2xl p-6 md:p-7">
          <div className="grid md:grid-cols-2 gap-5">
            <label className="text-sm text-slate-300">
              Full Name
              <input value={profile.fullName} onChange={(event) => updateField("fullName", event.target.value)} required className="mt-2 w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-300">
              Email
              <input value={profile.email} type="email" disabled className="mt-2 w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 text-slate-400" />
            </label>
            <label className="text-sm text-slate-300">
              Date of Birth
              <input value={profile.dateOfBirth} type="date" onChange={(event) => updateField("dateOfBirth", event.target.value)} required className="mt-2 w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500" />
            </label>
            <div className="text-sm text-slate-300">
              Age
              <div className="mt-2 px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 text-slate-200">
                {age === null ? "Add your date of birth" : `${age} years`}
              </div>
            </div>
            <label className="text-sm text-slate-300">
              Gender
              <select value={profile.gender} onChange={(event) => updateField("gender", event.target.value)} required className="mt-2 w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500">
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              City
              <input value={profile.city} onChange={(event) => updateField("city", event.target.value)} required className="mt-2 w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              State
              <input value={profile.state} onChange={(event) => updateField("state", event.target.value)} required className="mt-2 w-full px-4 py-3 rounded-lg bg-[#07111f] border border-slate-700 outline-none focus:border-blue-500" />
            </label>
          </div>

          {message && <p className="mt-5 text-sm text-blue-300">{message}</p>}

          <button type="submit" disabled={saving} className="mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold transition">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
