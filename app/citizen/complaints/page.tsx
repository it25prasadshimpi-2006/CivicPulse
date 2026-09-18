"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface Complaint {
  id: string;
  description: string;
  category: string;
  location: string;
  status: string;
  complaintNumber?: string;


  department?: string;
  adminRemark?: string;

  createdAt?: {
    _seconds?: number;
    _nanoseconds?: number;
  };

  updatedAt?: {
    _seconds?: number;
    _nanoseconds?: number;
  };

  aiAnalysis?: {
    issue?: string;
    severity?: string;
    summary?: string;
  };
}

export default function MyComplaintsPage() {
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);

  // ==========================================
  // LOAD CITIZEN COMPLAINTS
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        console.log(
          "🔥 AUTH STATE:",
          user ? "LOGGED IN" : "NOT LOGGED IN"
        );


         
        if (!user) {
          if (mounted) {
            setLoading(false);
            router.push("/login");
          }

          return;
        }
        setUser(user);

        console.log("🔥 CITIZEN UID:", user.uid);

        try {
          const response = await fetch(
            `/api/citizen/complaints?userId=${encodeURIComponent(
              user.uid
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          console.log(
            "📋 API STATUS:",
            response.status
          );

          const text = await response.text();

          console.log(
            "📋 API RESPONSE:",
            text
          );

          if (!response.ok) {
            let message =
              "Failed to load complaints.";

            try {
              const errorData =
                JSON.parse(text);

              message =
                errorData.error || message;
            } catch {
              // Keep default message
            }

            throw new Error(message);
          }

          const data = JSON.parse(text);

          if (!mounted) return;

          setComplaints(
            data.complaints || []
          );

          setError("");
          setLoading(false);

          console.log(
            "✅ COMPLAINTS LOADED:",
            data.complaints?.length || 0
          );
        } catch (err) {
          console.error(
            "❌ COMPLAINT PAGE ERROR:",
            err
          );

          if (!mounted) return;

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load complaints."
          );

          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  // ==========================================
  // FORMAT SUBMITTED DATE
  // ==========================================

  const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push("/");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

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

  const formatDate = (
    createdAt: Complaint["createdAt"]
  ) => {
    if (!createdAt?._seconds) {
      return "Date unavailable";
    }

    return new Date(
      createdAt._seconds * 1000
    ).toLocaleString("en-IN");
  };

  // ==========================================
  // FORMAT LAST UPDATED DATE
  // ==========================================

  const formatUpdatedDate = (
    updatedAt: Complaint["updatedAt"]
  ) => {
    if (!updatedAt?._seconds) {
      return null;
    }

    return new Date(
      updatedAt._seconds * 1000
    ).toLocaleString("en-IN");
  };

  // ==========================================
  // STATUS STYLE
  // ==========================================

  const getStatusStyle = (
    status: string
  ) => {
    switch (status) {
      case "Resolved":
        return "bg-green-500/10 text-green-400 border-green-500/30";

      case "In Progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";

      case "Assigned":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";

      case "Under Review":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";

      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };
  const handleDeleteComplaint = async (complaint: Complaint) => {
    if (complaint.status !== "Submitted") {
      setError(
        "This complaint cannot be deleted because government action has already started."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setDeletingId(complaint.id);
      setError("");

      const token = await user.getIdToken();

      const response = await fetch(
        "/api/citizen/delete-complaint",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            complaintId: complaint.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to delete complaint."
        );
      }

      // Remove it immediately from the list
      setComplaints((current) =>
        current.filter(
          (item) => item.id !== complaint.id
        )
      );

      setDeleteTarget(null);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete complaint."
      );
    } finally {
      setDeletingId(null);
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
            📋
          </div>

          <h1 className="text-xl font-semibold">
            Loading your complaints...
          </h1>

          <p className="text-slate-500 mt-2">
            Connecting to CivicPulse database
          </p>

        </div>
      </main>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      {/* HEADER */}

      <header className="border-b border-slate-800 bg-[#050d19]">

        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>

            <h1 className="text-xl font-bold text-blue-400">
              CivicPulse AI
            </h1>

            <p className="text-xs text-slate-400">
              My Complaints
            </p>

          </div>

          <div className="flex items-center gap-4">

  <div className="text-right hidden sm:block">
    <p className="text-xs text-slate-500">
      Logged in as
    </p>

    <p className="text-sm font-semibold text-slate-200">
      {getUsername()}
    </p>
  </div>

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

      {/* CONTENT */}

      <section className="max-w-6xl mx-auto px-6 py-10">

        <div className="mb-8">

          <p className="text-blue-400 text-sm font-semibold mb-2">
            COMPLAINT TRACKING
          </p>

          <h2 className="text-3xl font-bold">
            My Complaints
          </h2>

          <p className="text-slate-400 mt-2">
            Track the status and government updates
            for your submitted infrastructure
            complaints.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl p-5 mb-6">

            <p className="font-semibold mb-1">
              Unable to load complaints
            </p>

            <p className="text-sm">
              {error}
            </p>

          </div>
        )}

        {/* EMPTY STATE */}

        {!error &&
          complaints.length === 0 && (
            <div className="bg-[#0d1b2e] border border-slate-700 rounded-2xl p-10 text-center">

              <div className="text-5xl mb-4">
                📋
              </div>

              <h3 className="text-xl font-semibold">
                No complaints yet
              </h3>

              <p className="text-slate-400 mt-2 mb-6">
                You haven't submitted any
                infrastructure complaints.
              </p>

              <button
                onClick={() =>
                  router.push("/report")
                }
                className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold"
              >
                Report an Issue
              </button>

            </div>
          )}

        {/* COMPLAINT LIST */}

        <div className="space-y-5">

          {complaints.map(
            (complaint) => (

              <div
                key={complaint.id}
                className="bg-[#0d1b2e] border border-slate-700 rounded-2xl p-6"
              >

                {/* TOP */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                        Complaint Number
                    </p>

                    <p className="font-mono text-sm font-semibold text-blue-300">
                        {complaint.complaintNumber || `CP-${complaint.id.slice(0, 12).toUpperCase()}`}
                    </p>
                    </div>

                  <span
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold w-fit ${getStatusStyle(
                      complaint.status
                    )}`}
                  >
                    {complaint.status}
                  </span>

                </div>

                {/* DETAILS */}

                <div className="mt-5 grid md:grid-cols-3 gap-4">

                  <div>

                    <p className="text-xs text-slate-500">
                      Category
                    </p>

                    <p className="mt-1">
                      {complaint.category}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Location
                    </p>

                    <p className="mt-1">
                      {complaint.location}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Submitted
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(
                        complaint.createdAt
                      )}
                    </p>

                  </div>

                </div>

                {/* AI ISSUE */}

                {complaint.aiAnalysis?.issue && (
                  <div className="mt-5">

                    <p className="text-xs text-slate-500">
                      AI Identified Issue
                    </p>

                    <p className="mt-1 font-semibold">
                      {complaint.aiAnalysis.issue}
                    </p>

                  </div>
                )}

                {/* SEVERITY */}

                {complaint.aiAnalysis?.severity && (
                  <div className="mt-4">

                    <p className="text-xs text-slate-500">
                      Severity
                    </p>

                    <p className="mt-1 text-yellow-400 font-semibold">
                      {complaint.aiAnalysis.severity}
                    </p>

                  </div>
                )}

                {/* DESCRIPTION */}

                <div className="mt-5">

                  <p className="text-xs text-slate-500">
                    Your Report
                  </p>

                  <p className="mt-1 text-slate-300">
                    {complaint.description}
                  </p>

                </div>

                {/* DEPARTMENT */}

                {complaint.department && (
                  <div className="mt-5">

                    <p className="text-xs text-slate-500">
                      Assigned Department
                    </p>

                    <p className="mt-1 text-purple-300">
                      {complaint.department}
                    </p>

                  </div>
                )}

                {/* GOVERNMENT UPDATE */}

                {complaint.adminRemark && (
                  <div className="mt-5 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">

                    <p className="text-xs text-blue-400 font-semibold">
                      GOVERNMENT UPDATE
                    </p>

                    <p className="mt-2 text-slate-300">
                      {complaint.adminRemark}
                    </p>

                    {/* LAST UPDATED */}

                    {complaint.updatedAt?._seconds && (
                      <p className="text-xs text-slate-500 mt-3">
                        Last updated:{" "}
                        {formatUpdatedDate(
                          complaint.updatedAt
                        )}
                      </p>
                    )}

                  </div>
                )}

                {/* STATUS TIMELINE */}

                <div className="mt-6 pt-5 border-t border-slate-800">

                  <p className="text-xs text-slate-500 mb-5">
                    Complaint Progress
                  </p>

                  {(() => {

                    const statuses = [
                      "Submitted",
                      "Under Review",
                      "Assigned",
                      "In Progress",
                      "Resolved",
                    ];

                    const currentStatus =
                      complaint.status ||
                      "Submitted";

                    const currentIndex =
                      statuses.indexOf(
                        currentStatus
                      );

                    return (
                      <div className="relative">

                        {statuses.map(
                          (status, index) => {

                            const isCompleted =
                              index <
                              currentIndex;

                            const isCurrent =
                              index ===
                              currentIndex;

                            return (
                              <div
                                key={status}
                                className="relative flex items-start gap-4"
                              >

                                {/* CONNECTING LINE */}

                                {index <
                                  statuses.length -
                                    1 && (
                                  <div
                                    className={`absolute left-[11px] top-7 w-[2px] h-10 ${
                                      index <
                                      currentIndex
                                        ? "bg-blue-500"
                                        : "bg-slate-700"
                                    }`}
                                  />
                                )}

                                {/* STATUS CIRCLE */}

                                <div
                                  className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    isCurrent
                                      ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/30"
                                      : isCompleted
                                      ? "bg-blue-500 border-blue-400"
                                      : "bg-slate-800 border-slate-600"
                                  }`}
                                >

                                  {isCompleted ? (
                                    <span className="text-white text-xs">
                                      ✓
                                    </span>
                                  ) : isCurrent ? (
                                    <span className="w-2 h-2 bg-white rounded-full" />
                                  ) : null}

                                </div>

                                {/* STATUS TEXT */}

                                <div className="pb-6">

                                  <p
                                    className={`text-sm font-semibold ${
                                      isCurrent
                                        ? "text-blue-400"
                                        : isCompleted
                                        ? "text-slate-300"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {status}
                                  </p>

                                  <p
                                    className={`text-xs mt-1 ${
                                      isCurrent
                                        ? "text-blue-300"
                                        : isCompleted
                                        ? "text-slate-500"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    {isCurrent
                                      ? "Current status"
                                      : isCompleted
                                      ? "Completed"
                                      : "Pending"}
                                  </p>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>
                    );

                  })()}

                </div>

                {/* DELETE COMPLAINT */}
                <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {complaint.status === "Submitted" ? (
                    <>
                      <p className="text-xs text-slate-500">
                        You can delete this complaint until government action begins.
                      </p>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(complaint)}
                        className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm font-semibold transition"
                      >
                        🗑 Delete Complaint
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      🔒 Government action has started — deletion is disabled.
                    </p>
                  )}
                </div>

              </div>
            )
          )}

        </div>

      </section>
       {/* DELETE CONFIRMATION MODAL */}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0d1b2e] p-6 shadow-2xl">

            <h3 className="text-xl font-bold text-white">
              Delete Complaint?
            </h3>

            <p className="mt-3 text-sm text-slate-400">
              Are you sure you want to delete this complaint?
            </p>

            <div className="mt-4 rounded-xl bg-[#07111f] border border-slate-800 p-4">
              <p className="text-xs text-slate-500">
                Complaint Number
              </p>

              <p className="mt-1 font-mono text-sm text-blue-300">
                {deleteTarget.complaintNumber ||
                  `CP-${deleteTarget.id.slice(0, 12).toUpperCase()}`}
              </p>
            </div>

            <p className="mt-4 text-sm text-red-400">
              ⚠️ This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleDeleteComplaint(deleteTarget)}
                disabled={deletingId === deleteTarget.id}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
              >
                {deletingId === deleteTarget.id
                  ? "Deleting..."
                  : "Yes, Delete"}
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}