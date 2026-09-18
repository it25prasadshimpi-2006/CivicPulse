"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logoutUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

type AdminProfile = {
  fullName: string;
  email: string;
  designation: string;
  department: string;
  city: string;
  state: string;
  role: "admin";
};

const emptyProfile: AdminProfile = {
  fullName: "",
  email: "",
  designation: "",
  department: "",
  city: "",
  state: "",
  role: "admin",
};

function hasSavedProfile(profile: Partial<AdminProfile>) {
  return [
    profile.fullName,
    profile.designation,
    profile.department,
    profile.city,
    profile.state,
  ].every((value) => typeof value === "string" && value.trim().length > 0);
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login?role=admin");
        return;
      }

      setUser(currentUser);

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          router.replace("/dashboard");
          return;
        }

        const data = (await response.json()) as { profile: Partial<AdminProfile> };
        if (active) {
          const loadedProfile: AdminProfile = {
            ...emptyProfile,
            email: currentUser.email || "",
            ...data.profile,
            role: "admin",
          };
          setProfile(loadedProfile);
          setIsEditing(!hasSavedProfile(loadedProfile));
        }
      } catch (error) {
        console.error("Unable to load admin profile:", error);
        if (active) setMessage("Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const updateField = (
    field: "fullName" | "designation" | "department" | "city" | "state",
    value: string
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          designation: profile.designation,
          department: profile.department,
          city: profile.city,
          state: profile.state,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your profile");

      setMessage("Profile saved successfully.");
      setIsEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  if (loading) {
    return <main className="min-h-screen bg-[#050b18] text-white flex items-center justify-center">Loading administrator profile...</main>;
  }

  return (
    <main className="min-h-screen bg-[#050b18] text-white">
      <header className="border-b border-gray-800 bg-[#0c1628]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-300">CIVICPULSE AI</p>
            <p className="text-xs text-gray-500">Administrator Profile</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/dashboard")} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-blue-300 hover:bg-[#111d32]">Dashboard</button>
            <button type="button" onClick={handleLogout} className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">Logout</button>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-sm font-semibold text-blue-300">ADMINISTRATOR PROFILE</p>
        <h1 className="mt-2 text-3xl font-bold">Your government account</h1>
        <p className="mt-2 text-gray-500">Profile fields are scoped to your authenticated administrator account. Your role and password cannot be edited here.</p>

        <div className="mt-8 rounded-2xl border border-gray-800 bg-[#0c1628] p-6 md:p-7">
          {isEditing ? (
            <form onSubmit={handleSave}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm text-gray-300">Full Name<input required value={profile.fullName} onChange={(event) => updateField("fullName", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-gray-300">Email<input disabled value={profile.email} className="mt-2 w-full rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 text-gray-500" /></label>
                <label className="text-sm text-gray-300">Designation<input required value={profile.designation} onChange={(event) => updateField("designation", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-gray-300">Department<input required value={profile.department} onChange={(event) => updateField("department", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-gray-300">City<input required value={profile.city} onChange={(event) => updateField("city", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 outline-none focus:border-blue-500" /></label>
                <label className="text-sm text-gray-300">State<input required value={profile.state} onChange={(event) => updateField("state", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 outline-none focus:border-blue-500" /></label>
                <div className="text-sm text-gray-300">Role<div className="mt-2 rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 text-gray-500">Administrator</div></div>
              </div>
              {message && <p className="mt-5 text-sm text-blue-300">{message}</p>}
              <button type="submit" disabled={saving} className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Saving..." : hasSavedProfile(profile) ? "Save Changes" : "Save Profile"}</button>
            </form>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {[["Full Name", profile.fullName], ["Email", profile.email], ["Designation", profile.designation], ["Department", profile.department], ["City", profile.city], ["State", profile.state], ["Role", "Administrator"]].map(([label, value]) => (
                  <div key={label} className="text-sm text-gray-300"><p>{label}</p><p className="mt-2 rounded-lg border border-gray-700 bg-[#050b18] px-4 py-3 text-gray-200">{value}</p></div>
                ))}
              </div>
              {message && <p className="mt-5 text-sm text-blue-300">{message}</p>}
              <button type="button" onClick={() => { setMessage(""); setIsEditing(true); }} className="mt-6 rounded-lg border border-blue-500/30 px-6 py-3 font-semibold text-blue-300 hover:bg-[#111d32]">Edit Profile</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
