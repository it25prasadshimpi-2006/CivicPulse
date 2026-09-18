"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { calculatePriorityScore } from "../../lib/priority";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { logoutUser } from "../../lib/auth";
import { useRouter } from "next/navigation";

const HotspotMap = dynamic(() => import("./HotspotMap"), {
  ssr: false,
});

interface AIAnalysis {
  language?: string;
  category?: string;
  issue?: string;
  severity?: string;
  duration?: string;
  summary?: string;
  severity_reason?: string;
  recommended_action?: string;
  visual_evidence?: string;
}

interface Report {
  id: string;
  description: string;
  category: string;
  location: string;

  latitude?: number;
  longitude?: number;

  photoUrl?: string;
  aiAnalysis?: AIAnalysis;
  createdAt?: any;
  source?: string;
  complaintNumber?: string;

  userId?: string;
  userEmail?: string;
  status?: string;
  department?: string;
  adminRemark?: string;
}

interface Hotspot {
  location: string;
  category: string;
  reportCount: number;
  priorityScore: number;
  priorityLevel: string;
  severity: number;
  citizenDemand: number;
  populationAffected: number;
  infrastructureGap: number;
  investmentGap: number;
  issues: {
    id: string;
    issue: string;
    severity: string;
    duration: string;
  }[];
}

interface HotspotIntelligence {
  summary: string;
  affectedPopulation: string;
  recommendation: string;
  governmentAction: string;
  department: string;
  urgency: string;
  expectedImpact: string;
}

interface AdminProfile {
  fullName?: string;
  email?: string;
  designation?: string;
  department?: string;
  city?: string;
  state?: string;
}

interface InfrastructureBrief {
  executiveSummary: string;
  keyConcerns: string[];
  priorityAreas: string[];
  recommendedActions: string[];
}

type DashboardSection = "dashboard" | "complaints" | "priority" | "hotspots" | "brief";

function statusClass(status?: string) {
  if (status === "Resolved") return "border-green-400/40 bg-green-500/15 text-green-100";
  if (status === "In Progress") return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  if (status === "Assigned") return "border-blue-400/40 bg-blue-500/15 text-blue-100";
  if (status === "Under Review") return "border-violet-400/40 bg-violet-500/15 text-violet-100";
  return "border-slate-400/40 bg-slate-500/20 text-slate-100";
}

function formatDate(value: any) {
  if (!value) return "—";
  try {
    const seconds = value?._seconds ?? value?.seconds;
    const nanoseconds = value?._nanoseconds ?? value?.nanoseconds ?? 0;
    const date = typeof seconds === "number"
      ? new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000))
      : value?.toDate
        ? value.toDate()
        : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch { return "—"; }
}

function EvidenceModal({ report, priority, onClose }: { report: Report; priority: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#0c1628] rounded-2xl shadow-xl border border-gray-800" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0c1628] border-b border-gray-800 px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Incident Evidence</p>
            <h2 className="text-2xl font-bold text-white mt-1">{report.aiAnalysis?.issue || report.description}</h2>
            <p className="text-sm text-gray-500 mt-1">{report.location} · {formatDate(report.createdAt)}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg border border-gray-800 text-gray-500 hover:bg-[#050b18] text-xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-gray-300 mb-3">Citizen Evidence</p>
              {report.photoUrl ? (
                <img src={report.photoUrl} alt="Citizen submitted evidence" className="w-full max-h-[420px] object-contain rounded-xl border border-gray-800 bg-[#050b18]" />
              ) : (
                <div className="h-64 rounded-xl border border-dashed border-gray-700 bg-[#050b18] flex items-center justify-center text-gray-500">No photo submitted</div>
              )}
            </div>

            <div className="space-y-4">
              <InfoRow label="Category" value={report.aiAnalysis?.category || report.category} />
              <InfoRow label="Severity" value={report.aiAnalysis?.severity || "Not available"} />
              <InfoRow label="Duration" value={report.aiAnalysis?.duration || "Not available"} />
              <InfoRow label="Source" value={report.source || "Citizen report"} />
              <InfoRow label="Current status" value={report.status || "Submitted"} />
              <InfoRow label="Department" value={report.department || "Not assigned"} />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <TextPanel title="Citizen Description" text={report.description || "No description available."} />
            <TextPanel title="AI Summary" text={report.aiAnalysis?.summary || "No AI summary available."} />
            <TextPanel title="Visual Evidence" text={report.aiAnalysis?.visual_evidence || "No visual evidence analysis available."} />
            <TextPanel title="Recommended Action" text={report.aiAnalysis?.recommended_action || "No recommendation available."} />
          </div>

          <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">Priority Assessment</h3>
                <p className="text-sm text-gray-500">Transparent score based on the prototype priority model.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{priority?.score ?? "—"}<span className="text-sm font-normal text-gray-500">/100</span></p>
                <p className="text-xs text-gray-500">{priority?.level || "—"}</p>
              </div>
            </div>
            {priority?.breakdown && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <ScoreCell label="Citizen Demand" value={priority.breakdown.citizenDemand} weight="35%" />
                <ScoreCell label="Severity" value={priority.breakdown.severity} weight="20%" />
                <ScoreCell label="Population" value={priority.breakdown.populationAffected} weight="20%" />
                <ScoreCell label="Infrastructure Gap" value={priority.breakdown.infrastructureGap} weight="15%" />
                <ScoreCell label="Investment Gap" value={priority.breakdown.investmentGap} weight="10%" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageComplaintModal({ report, status, setStatus, department, setDepartment, remark, setRemark, updateComplaint, updating, message, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-2xl bg-[#0c1628] rounded-2xl shadow-xl border border-gray-800" onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Manage Complaint</p>
            <h2 className="text-xl font-bold text-white mt-1">{report.aiAnalysis?.issue || report.description}</h2>
            <div className="mt-2">
  <p className="text-xs text-gray-500">
    Complaint Number
  </p>

  <p className="text-sm font-mono font-semibold text-blue-300">
    {report.complaintNumber ||
      `CP-${report.id.slice(0, 12).toUpperCase()}`}
  </p>
</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg border border-gray-800 text-gray-500 hover:bg-[#050b18] text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <FormField label="Complaint Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-[#0c1628] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-gray-500">
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </FormField>

            <FormField label="Assign Department">
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full bg-[#0c1628] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-gray-500">
                <option value="">Select Department</option>
                <option value="Water Department">Water Department</option>
                <option value="Roads Department">Roads Department</option>
                <option value="Healthcare Department">Healthcare Department</option>
                <option value="Education Department">Education Department</option>
                <option value="Utilities Department">Utilities Department</option>
                <option value="Municipal Corporation">Municipal Corporation</option>
              </select>
            </FormField>
          </div>

          <FormField label="Admin Remark">
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={5} placeholder="Enter an update or action taken by the department..." className="w-full bg-[#0c1628] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-gray-500 resize-none" />
          </FormField>

          {message && <div className="rounded-lg border border-gray-800 bg-[#050b18] px-4 py-3 text-sm text-gray-300">{message}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} disabled={updating} className="px-4 py-2.5 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#050b18]">Cancel</button>
            <button onClick={updateComplaint} disabled={updating} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-semibold">{updating ? "Updating..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return <div className="border-b border-gray-800 pb-3"><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="text-sm font-medium text-white mt-1">{value || "—"}</p></div>;
}
function TextPanel({ title, text }: { title: string; text: string }) {
  return <div className="border border-gray-800 rounded-xl p-5"><p className="text-sm font-semibold text-gray-300">{title}</p><p className="text-sm text-gray-400 mt-2 leading-6">{text}</p></div>;
}
function ScoreCell({ label, value, weight }: { label: string; value: number; weight: string }) {
  return <div className="border border-gray-800 rounded-lg p-4"><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-white mt-1">{value}</p><p className="text-xs text-gray-500 mt-1">Weight {weight}</p></div>;
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>{children}</div>;
}

export default function DashboardPage() {
    const router = useRouter();

const handleLogout = async () => {
  try {
    setLoggingOut(true);

    await logoutUser();

    router.replace("/");
  } catch (error) {
    console.error("❌ Admin logout failed:", error);
    setLoggingOut(false);
  }
};
    

const [adminVerified, setAdminVerified] = useState(false);
const [loggingOut, setLoggingOut] = useState(false);
const [adminProfile, setAdminProfile] = useState<AdminProfile>({});
const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
const profileMenuRef = useRef<HTMLDivElement | null>(null);
const [showAllPriorityIssues, setShowAllPriorityIssues] = useState(false);
const [showAllRecentActivity, setShowAllRecentActivity] = useState(false);
const [showAllHotspots, setShowAllHotspots] = useState(false);
const [complaintStatusFilter, setComplaintStatusFilter] = useState<"Active" | "All" | "Submitted" | "Assigned" | "In Progress" | "Resolved">("Active");
const [activeSection, setActiveSection] = useState<DashboardSection>("dashboard");
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectDashboardSection = (section: DashboardSection) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
const [infrastructureBrief, setInfrastructureBrief] = useState<InfrastructureBrief | null>(null);
const [briefError, setBriefError] = useState("");
const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] =
    useState<Hotspot | null>(null);

  const [hotspotIntelligence, setHotspotIntelligence] =
    useState<HotspotIntelligence | null>(null);

  const [intelligenceLoading, setIntelligenceLoading] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    // ==========================================
  // ADMIN COMPLAINT MANAGEMENT
  // ==========================================

  const [selectedReport, setSelectedReport] =
    useState<Report | null>(null);

  const [evidenceReport, setEvidenceReport] =
    useState<Report | null>(null);

  const [adminStatus, setAdminStatus] =
    useState("Submitted");

  const [adminDepartment, setAdminDepartment] =
    useState("");

  const [adminRemark, setAdminRemark] =
    useState("");

  const [updatingComplaint, setUpdatingComplaint] =
    useState(false);

  const [updateMessage, setUpdateMessage] =
    useState("");

  useEffect(() => {
    const closeProfileMenu = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", closeProfileMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

      const updateComplaint = async () => {
    if (!selectedReport) {
      return;
    }

    try {
      setUpdatingComplaint(true);
      setUpdateMessage("");

      const user = auth.currentUser;

if (!user) {
  throw new Error("You are not logged in.");
}

const token = await user.getIdToken();

const response = await fetch(
  "/api/admin/update-complaint",
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      complaintId: selectedReport.id,
      status: adminStatus,
      department: adminDepartment,
      adminRemark: adminRemark,
    }),
  }
);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update complaint"
        );
      }

      // Update the complaint locally
      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === selectedReport.id
            ? {
                ...report,
                status: adminStatus,
                department: adminDepartment,
                adminRemark: adminRemark,
              }
            : report
        )
      );

      setSelectedReport((current) =>
        current
          ? {
              ...current,
              status: adminStatus,
              department: adminDepartment,
              adminRemark: adminRemark,
            }
          : null
      );

      setUpdateMessage(
        "✅ Complaint updated successfully."
      );

    } catch (err) {
      console.error(
        "❌ Complaint update error:",
        err
      );

      setUpdateMessage(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ Failed to update complaint."
      );

    } finally {
      setUpdatingComplaint(false);
    }
  };

    const openComplaintManager = (report: Report) => {
    setSelectedReport(report);
    setAdminStatus(report.status || "Submitted");
    setAdminDepartment(report.department || "");
    setAdminRemark(report.adminRemark || "");
    setUpdateMessage("");
  };

  // ==========================================
  // ADMIN AUTHENTICATION CHECK
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        try {
          if (!user) {
            router.replace("/login");
            return;
          }

          console.log("🔐 Checking admin access...");

          const token = await user.getIdToken();

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
            "🔐 Admin verification:",
            data
          );

          if (!data.isAdmin) {
            console.log(
              "🚫 Access denied — Citizen account"
            );

          window.location.replace("/citizen");
            return;
          }

          console.log(
            "✅ Admin access granted"
          );

          setAdminProfile({
            fullName: user.displayName || "",
            email: user.email || "",
          });

          try {
            const profileResponse = await fetch("/api/admin/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (profileResponse.ok) {
              const profileData = (await profileResponse.json()) as {
                profile: AdminProfile;
              };
              setAdminProfile(profileData.profile);
            }
          } catch (profileError) {
            console.error("Unable to load admin profile:", profileError);
          }

          setAdminVerified(true);

        } catch (error) {
          console.error(
            "❌ Admin verification failed:",
            error
          );

  window.location.replace("/citizen");
        }
      }
    );

    return () => unsubscribe();
  }, [router]);


  // ==========================================
  // LOAD DASHBOARD DATA
  // ==========================================

  useEffect(() => {
    fetchReports();
    fetchHotspots();
  }, []);

  // ==========================================
  // GENERATE GEMINI HOTSPOT INTELLIGENCE
  // ==========================================

  const generateHotspotIntelligence = async (
    hotspot: Hotspot
  ) => {
    try {
      setIntelligenceLoading(true);
      setHotspotIntelligence(null);

      const response = await fetch(
        "/api/hotspot-intelligence",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(hotspot),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to generate intelligence"
        );
      }

      setHotspotIntelligence(data.intelligence);
    } catch (err) {
      console.error(
        "Hotspot intelligence error:",
        err
      );

      setHotspotIntelligence({
        summary:
          "Unable to generate AI intelligence at this time.",
        affectedPopulation:
          "Population impact could not be determined from the available data.",
        recommendation:
          "Review the citizen reports and infrastructure indicators manually.",
        governmentAction:
          "Investigate the reported infrastructure issue and assess the service gap.",
        department:
          "Relevant local government authority",
        urgency: "Immediate",
        expectedImpact:
          "Improved response to the identified citizen infrastructure demand.",
      });
    } finally {
      setIntelligenceLoading(false);
    }
  };

  // ==========================================
  // FETCH REPORTS
  // ==========================================

  const fetchReports = async () => {
    try {
      console.log(
        "📊 Dashboard: Fetching reports..."
      );

      const response = await fetch("/api/reports");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch reports"
        );
      }

      setReports(data.reports || []);

      console.log(
        "📊 Dashboard: Reports loaded:",
        data.reports?.length || 0
      );
    } catch (err) {
      console.error(
        "📊 Dashboard ERROR:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load dashboard data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FETCH DEMAND HOTSPOTS
  // ==========================================

  const fetchHotspots = async () => {
    try {
      console.log(
        "🔥 Dashboard: Fetching demand hotspots..."
      );

      const response = await fetch(
        "/api/hotspots"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to fetch hotspots"
        );
      }

      setHotspots(data.hotspots || []);

      console.log(
        "🔥 Dashboard: Hotspots loaded:",
        data.hotspots?.length || 0
      );
    } catch (err) {
      console.error(
        "🔥 Hotspot ERROR:",
        err
      );
    }
  };

  // ==========================================
  // PRIORITY SCORE
  // ==========================================

  const getPriorityScore = (
    report: Report,
    allReports: Report[]
  ) => {
    const severityScores: Record<
      string,
      number
    > = {
      Critical: 100,
      High: 80,
      Medium: 60,
      Low: 30,
    };

    const severityScore =
      severityScores[
        report.aiAnalysis?.severity ||
          "Low"
      ] || 30;

    const similarReports =
      allReports.filter(
        (item) =>
          item.location?.toLowerCase() ===
            report.location?.toLowerCase() &&
          (
            item.aiAnalysis?.category ||
            item.category
          )
            ?.toLowerCase() ===
            (
              report.aiAnalysis?.category ||
              report.category
            )?.toLowerCase()
      ).length;

    const citizenDemand = Math.min(
      100,
      40 + similarReports * 15
    );

    // Prototype demo values.
    // These will later be replaced by
    // public government datasets.

    const populationAffected = 75;
    const infrastructureGap = 80;
    const investmentGap = 65;

    return calculatePriorityScore({
      citizenDemand,
      severity: severityScore,
      populationAffected,
      infrastructureGap,
      investmentGap,
    });
  };

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const criticalCount = reports.filter(
    (report) =>
      report.aiAnalysis?.severity ===
      "Critical"
  ).length;

  const highCount = reports.filter(
    (report) =>
      report.aiAnalysis?.severity ===
      "High"
  ).length;

  const mediumCount = reports.filter(
    (report) =>
      report.aiAnalysis?.severity ===
      "Medium"
  ).length;

  const lowCount = reports.filter(
    (report) =>
      report.aiAnalysis?.severity ===
      "Low"
  ).length;

  // ==========================================
  // CATEGORY COUNTS
  // ==========================================

  const waterCount = reports.filter(
    (report) =>
      report.category
        ?.toLowerCase()
        .includes("water") ||
      report.aiAnalysis?.category
        ?.toLowerCase()
        .includes("water")
  ).length;

  const roadCount = reports.filter(
    (report) =>
      report.category
        ?.toLowerCase()
        .includes("road") ||
      report.aiAnalysis?.category
        ?.toLowerCase()
        .includes("road")
  ).length;

  const healthcareCount = reports.filter(
    (report) =>
      report.category
        ?.toLowerCase()
        .includes("health") ||
      report.aiAnalysis?.category
        ?.toLowerCase()
        .includes("health")
  ).length;

  const educationCount = reports.filter(
    (report) =>
      report.category
        ?.toLowerCase()
        .includes("education") ||
      report.aiAnalysis?.category
        ?.toLowerCase()
        .includes("education")
  ).length;

  const utilityCount = reports.filter(
    (report) =>
      report.category
        ?.toLowerCase()
        .includes("utility") ||
      report.aiAnalysis?.category
        ?.toLowerCase()
        .includes("utility")
  ).length;

  const reportedLocationCount = new Set(
    reports
      .map((report) => report.location?.trim())
      .filter(Boolean)
  ).size;

  const priorityReports = reports
    .filter((report) => report.status !== "Resolved")
    .map((report) => ({
      report,
      priority: getPriorityScore(report, reports),
    }))
    .sort((a, b) => b.priority.score - a.priority.score)
    .slice(0, 5);

  const filteredRecentReports = reports.filter((report) => {
    const status = report.status || "Submitted";
    if (complaintStatusFilter === "All") return true;
    if (complaintStatusFilter === "Active") {
      return status === "Submitted" || status === "Assigned" || status === "In Progress";
    }
    return status === complaintStatusFilter;
  });
  const recentActivity = filteredRecentReports.slice(0, showAllRecentActivity ? 10 : 5);
  const visibleHotspots = hotspots.slice(0, showAllHotspots ? hotspots.length : 5);
  const topHotspot = hotspots[0];

  const generateInfrastructureBrief = async () => {
    const user = auth.currentUser;
    if (!user) {
      setBriefError("Your session has expired. Please sign in again.");
      return;
    }

    setIsGeneratingBrief(true);
    setBriefError("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/infrastructure-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportCounts: {
            total: reports.length,
            critical: criticalCount,
            high: highCount,
            medium: mediumCount,
            low: lowCount,
          },
          categoryCounts: {
            water: waterCount,
            roads: roadCount,
            healthcare: healthcareCount,
            education: educationCount,
            utilities: utilityCount,
          },
          statusCounts: reports.reduce<Record<string, number>>((counts, report) => {
            const status = report.status || "Submitted";
            counts[status] = (counts[status] || 0) + 1;
            return counts;
          }, {}),
          locations: Array.from(new Set(reports.map((report) => report.location?.trim()).filter(Boolean))),
          priorityReports: priorityReports.map(({ report, priority }) => ({
            complaintNumber: report.complaintNumber || `CP-${report.id.slice(0, 12).toUpperCase()}`,
            category: report.aiAnalysis?.category || report.category || "Uncategorized",
            issue: report.aiAnalysis?.issue || report.description,
            location: report.location || "Location unavailable",
            severity: report.aiAnalysis?.severity || "Not specified",
            status: report.status || "Submitted",
            priorityScore: priority.score,
            recommendedAction: report.aiAnalysis?.recommended_action || "",
          })),
          hotspots: hotspots.map((hotspot) => ({
            location: hotspot.location,
            category: hotspot.category,
            reportCount: hotspot.reportCount,
            priorityScore: hotspot.priorityScore,
            priorityLevel: hotspot.priorityLevel,
            issues: hotspot.issues.map((issue) => ({
              issue: issue.issue,
              severity: issue.severity,
              duration: issue.duration,
            })),
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate the AI infrastructure brief");
      }

      setInfrastructureBrief(data.brief);
    } catch (briefGenerationError) {
      setBriefError(
        briefGenerationError instanceof Error
          ? briefGenerationError.message
          : "Failed to generate the AI infrastructure brief"
      );
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  // ==========================================
// WAIT FOR ADMIN VERIFICATION
// ==========================================

if (!adminVerified || loading) {
  return (
    <main className="min-h-screen bg-[#050b18] text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-4">
            🔐
          </div>

          <p className="text-gray-300">
            Verifying Government Portal access...
          </p>

          <p className="text-gray-500 text-sm mt-2">
            Please wait while we verify your account.
          </p>
        </div>
      </div>



    </main>
  );
}

  return (
    
    <main className="min-h-screen bg-[#050b18] text-white px-6 py-10">
        

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

<header className="mb-8 flex flex-col gap-5 overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-[#0c1628] via-[#0e1b32] to-[#0c1628] p-6 md:flex-row md:items-center md:justify-between">

  <div>
    <p className="text-xs font-bold tracking-[0.2em] text-blue-300">CIVICPULSE AI</p>

    <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
      Government Infrastructure Command Center
    </h1>

    <p className="mt-2 max-w-2xl text-sm text-gray-400">
      AI-powered intelligence from citizen infrastructure reports
    </p>
    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> System Active
    </p>
  </div>

  <div ref={profileMenuRef} className="relative self-start">
    <button
      type="button"
      onClick={() => setIsProfileMenuOpen((open) => !open)}
      aria-expanded={isProfileMenuOpen}
      aria-haspopup="menu"
      className="flex items-center gap-3 rounded-xl border border-gray-700 bg-[#0c1628]/80 px-3 py-2 text-left transition hover:bg-[#111d32]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-lg text-blue-300">👤</span>
      <span className="hidden sm:block">
        <span className="block text-sm font-semibold text-white">{adminProfile.fullName || adminProfile.email || "Administrator"}</span>
        <span className="block text-xs text-gray-500">{adminProfile.designation || "Administrator"}</span>
      </span>
      <span className="text-xs text-gray-400">▾</span>
    </button>

    {isProfileMenuOpen && (
      <div role="menu" className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-gray-800 bg-[#0c1628] p-3 shadow-2xl">
        <div className="border-b border-gray-800 px-2 pb-3">
          <p className="font-semibold text-white">👤 {adminProfile.fullName || adminProfile.email || "Administrator"}</p>
          <p className="mt-1 text-sm text-blue-300">{adminProfile.designation || "Administrator"}</p>
          {adminProfile.department && <p className="mt-1 text-xs text-gray-500">{adminProfile.department}</p>}
          {(adminProfile.city || adminProfile.state) && <p className="mt-1 text-xs text-gray-500">{[adminProfile.city, adminProfile.state].filter(Boolean).join(", ")}</p>}
        </div>
        <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); router.push("/admin/profile"); }} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#111d32]">Profile</button>
        <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} disabled={loggingOut} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50">{loggingOut ? "Logging out..." : "Logout"}</button>
      </div>
    )}
  </div>

</header>

        {/* LOADING */}

        {(loading || !adminVerified) && (
          <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-10 text-center">

            <div className="text-4xl mb-4">
              📊
            </div>

            <p className="text-gray-300">
              Loading citizen intelligence...
            </p>

          </div>

        )}

        {/* ERROR */}

        {error && (

          <div className="bg-red-50 border border-gray-800 rounded-xl p-5 mb-6">

            <p className="text-gray-300 font-semibold">
              Dashboard Error
            </p>

            <p className="text-gray-300 mt-1">
              {error}
            </p>

          </div>

        )}

        {/* DASHBOARD */}

        {adminVerified && !loading && !error && (

          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="rounded-lg border border-gray-700 bg-[#0c1628] px-4 py-2 text-left text-sm font-semibold text-gray-200 md:hidden"
              aria-expanded={isSidebarOpen}
              aria-controls="dashboard-navigation"
            >
              Menu
            </button>

            <aside
              id="dashboard-navigation"
              className={`${isSidebarOpen ? "block" : "hidden"} w-full shrink-0 rounded-2xl border border-gray-800 bg-[#0c1628] p-3 md:sticky md:top-4 md:block md:w-52`}
            >
              <nav className="space-y-1" aria-label="Dashboard sections">
                {([
                  ["dashboard", "Dashboard"],
                  ["complaints", "Complaints"],
                  ["priority", "Priority Issues"],
                  ["hotspots", "Hotspots"],
                  ["brief", "AI Infrastructure Brief"],
                ] as const).map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => selectDashboardSection(section)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium ${activeSection === section ? "bg-blue-500/15 text-blue-200" : "text-gray-300 hover:bg-[#111d32]"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="my-3 border-t border-gray-800" />
              <div className="space-y-1">
                <button type="button" onClick={() => router.push("/admin/profile")} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-300 hover:bg-[#111d32]">Profile</button>
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50">{loggingOut ? "Logging out..." : "Logout"}</button>
              </div>
            </aside>

            <div className="min-w-0 flex-1">

            {/* KPI CARDS */}

            {activeSection === "dashboard" && <>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0c1628] to-[#0b1629] p-5 transition hover:-translate-y-0.5 hover:border-blue-400/40">

                <div className="mb-4 flex items-center justify-between"><p className="text-gray-300 text-sm font-medium">Total Citizen Reports</p><span className="text-xl">📋</span></div>

                <p className="text-4xl font-bold mt-2 text-white">
                  {reports.length}
                </p>

                <p className="text-gray-500 text-sm mt-2">
                  Live from Firestore
                </p>

              </div>


              <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#171326] to-[#0c1628] p-5 transition hover:-translate-y-0.5 hover:border-red-400/40">

                <div className="mb-4 flex items-center justify-between"><p className="text-gray-300 text-sm font-medium">Critical Issues</p><span className="text-xl">🔴</span></div>

                <p className="text-4xl font-bold mt-2 text-red-200">
                  {criticalCount}
                </p>

                <p className="text-gray-500 text-sm mt-2">
                  Require urgent attention
                </p>

              </div>


              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1c1822] to-[#0c1628] p-5 transition hover:-translate-y-0.5 hover:border-amber-400/40">

                <div className="mb-4 flex items-center justify-between"><p className="text-gray-300 text-sm font-medium">High Priority</p><span className="text-xl">⚡</span></div>

                <p className="text-4xl font-bold mt-2 text-amber-200">
                  {highCount}
                </p>

                <p className="text-gray-500 text-sm mt-2">
                  Significant infrastructure needs
                </p>

              </div>


              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#0b1c2b] to-[#0c1628] p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/40">

                <div className="mb-4 flex items-center justify-between"><p className="text-gray-300 text-sm font-medium">Locations</p><span className="text-xl">📍</span></div>

                <p className="text-4xl font-bold mt-2 text-cyan-100">
                  {reportedLocationCount}
                </p>

                <p className="text-gray-500 text-sm mt-2">
                  Reported locations
                </p>

              </div>

            </div>


            {/* AI INFRASTRUCTURE INSIGHT */}

            <div className="mb-8 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
              <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0c1628] to-[#0b1629] p-5">
                <div className="flex items-start gap-4">
                  <div>
                    <p className="text-sm font-bold text-blue-200">🤖 AI INFRASTRUCTURE INSIGHT</p>
                    {hotspotIntelligence && selectedHotspot ? (
                      <>
                        <p className="mt-3 text-lg font-semibold leading-7 text-white">{hotspotIntelligence.summary}</p>
                        <p className="mt-3 text-sm text-gray-400"><span className="font-semibold text-blue-200">Recommended action:</span> {hotspotIntelligence.recommendation}</p>
                      </>
                    ) : topHotspot ? (
                      <>
                        <p className="mt-3 text-lg font-semibold leading-7 text-white">{topHotspot.category} is the highest-priority current hotspot in {topHotspot.location}.</p>
                        <p className="mt-3 text-sm text-gray-400">Based on {topHotspot.reportCount} citizen report{topHotspot.reportCount === 1 ? "" : "s"} and the existing priority score of {topHotspot.priorityScore}/100. Select this hotspot on the map to generate a Gemini recommendation.</p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-gray-400">No hotspot intelligence is available yet. Insights will appear when citizen reports generate a hotspot.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#0b1c2b] to-[#0c1628] p-5">
                <p className="text-sm font-bold text-cyan-200">CURRENT DATA</p>
                <p className="mt-3 text-xl font-semibold text-white">{hotspots.length} demand hotspot{hotspots.length === 1 ? "" : "s"} detected</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">Hotspots group reports by their existing location and category data. No estimated trends are shown.</p>
              </section>
            </div>

            {/* PRIORITY ISSUES */}

            </>}

            {activeSection === "priority" && <>

            <section className="mb-8 rounded-2xl border border-gray-800 bg-[#0c1628] p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-red-300">🚨 PRIORITY ISSUES</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Priority infrastructure reports</h2>
                </div>
                <p className="text-sm text-gray-500">Ranked using the existing priority model</p>
              </div>

              {priorityReports.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-800 p-6 text-sm text-gray-500">No active priority complaints.</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {priorityReports.map(({ report, priority }) => (
                    <div key={report.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-blue-300">{report.complaintNumber || `CP-${report.id.slice(0, 12).toUpperCase()}`}</p>
                        <p className="mt-1 truncate font-semibold text-white">{report.aiAnalysis?.issue || report.description}</p>
                        <p className="mt-1 text-sm text-gray-500">{report.aiAnalysis?.category || report.category || "Uncategorized"} · {report.location || "Location unavailable"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200">{report.aiAnalysis?.severity || "Not specified"}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(report.status)}`}>{report.status || "Submitted"}</span>
                        <span className="text-xs text-gray-500">Priority {priority.score}</span>
                        <button type="button" onClick={() => openComplaintManager(report)} className="rounded-lg border border-blue-500/30 px-3 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10">View</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reports.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPriorityIssues((show) => !show)}
                  className="mt-5 text-sm font-semibold text-blue-300 hover:text-blue-200"
                >
                  {showAllPriorityIssues ? "Hide detailed priority issues" : "View all priority issues"} →
                </button>
              )}
            </section>

            </>}


            {/* SEVERITY OVERVIEW */}

            {activeSection === "dashboard" && <>

            <div className="mb-8 rounded-2xl border border-gray-800 bg-[#0c1628] p-6">

              <div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-2xl font-bold text-white">Issue Severity Overview</h2><p className="text-sm text-gray-500">Analyzed report counts</p></div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
                  <p className="text-sm font-semibold text-red-200">
                    Critical
                  </p>

                  <p className="text-3xl font-bold mt-2 text-white">
                    {criticalCount}
                  </p>
                </div>


                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-5">
                  <p className="text-sm font-semibold text-orange-200">
                    High
                  </p>

                  <p className="text-3xl font-bold mt-2 text-white">
                    {highCount}
                  </p>
                </div>


                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
                  <p className="text-sm font-semibold text-amber-200">
                    Medium
                  </p>

                  <p className="text-3xl font-bold mt-2 text-white">
                    {mediumCount}
                  </p>
                </div>


                <div className="rounded-xl border border-slate-600 bg-slate-500/10 p-5">
                  <p className="text-sm font-semibold text-slate-300">
                    Low
                  </p>

                  <p className="text-3xl font-bold mt-2 text-white">
                    {lowCount}
                  </p>
                </div>

              </div>

            </div>


            {/* INFRASTRUCTURE DEMAND */}

            <div className="mb-8 rounded-2xl border border-gray-800 bg-[#0c1628] p-6">

              <div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-2xl font-bold text-white">Infrastructure Demand</h2><p className="text-sm text-gray-500">Reports by category</p></div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 transition hover:border-blue-400/50">
                  <p className="text-gray-300">
                    💧 Water
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {waterCount}
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Reports
                  </p>
                </div>


                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 transition hover:border-blue-400/50">
                  <p className="text-gray-300">
                    🛣️ Roads
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {roadCount}
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Reports
                  </p>
                </div>


                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 transition hover:border-blue-400/50">
                  <p className="text-gray-300">
                    🏥 Healthcare
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {healthcareCount}
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Reports
                  </p>
                </div>


                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 transition hover:border-blue-400/50">
                  <p className="text-gray-300">
                    🎓 Education
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {educationCount}
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Reports
                  </p>
                </div>


                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 transition hover:border-blue-400/50">
                  <p className="text-gray-300">
                    ⚡ Utilities
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {utilityCount}
                  </p>

                  <p className="text-gray-500 text-sm mt-1">
                    Reports
                  </p>
                </div>

              </div>

            </div>


            {/* ==========================================
                INFRASTRUCTURE DEMAND MAP
            ========================================== */}

            </>}

            {activeSection === "hotspots" && <>
            <section className="mb-8 overflow-hidden rounded-2xl border border-gray-800 bg-[#0c1628] p-4 md:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-cyan-200">🗺️ HOTSPOT INTELLIGENCE</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Geographic demand signals</h2>
                  <p className="mt-1 text-sm text-gray-500">AI-assisted geographic view of citizen infrastructure reports</p>
                </div>
                <p className="text-sm text-gray-500">{hotspots.length} mapped hotspot{hotspots.length === 1 ? "" : "s"}</p>
              </div>

              <HotspotMap
                hotspots={hotspots}
                reports={reports}
                onSelectHotspot={(hotspot) => {
                    setSelectedHotspot(hotspot);
                }}
              />
            </section>


            {/* ==========================================
                CIVICPULSE INTELLIGENCE
            ========================================== */}

            {selectedHotspot && (

              <div id="selected-hotspot-intelligence" className="bg-[#0c1628] border border-gray-800 rounded-2xl p-6 mt-6 mb-8">

                {/* HEADER */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  <div>

                    <p className="text-gray-300 text-sm font-semibold tracking-wide">
                      CIVICPULSE INTELLIGENCE
                    </p>

                    <h2 className="text-3xl font-bold text-white mt-1">
                      {selectedHotspot.location}
                    </h2>

                    <p className="text-gray-500 mt-1 capitalize">
                      {selectedHotspot.category} Infrastructure Demand
                    </p>

                  </div>


                  <div className="text-left md:text-right">

                    <p className="text-gray-500 text-sm">
                      Priority Score
                    </p>

                    <p className="text-4xl font-bold text-gray-300">
                      {selectedHotspot.priorityScore}
                      <span className="text-lg text-gray-500">
                        /100
                      </span>
                    </p>

                    <span className="inline-block mt-1 px-3 py-1 rounded-full bg-[#111d32] text-gray-300 font-semibold text-sm">
                      {selectedHotspot.priorityLevel} Priority
                    </span>

                  </div>

                </div>


                <div className="border-t border-gray-800 my-6" />


                {/* INTELLIGENCE SIGNALS */}

                <div>

                  <h3 className="text-xl font-bold text-white mb-4">
                    📊 Infrastructure Intelligence
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

                    <div className="bg-[#050b18] rounded-xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-sm">
                        Citizen Demand
                      </p>

                      <p className="text-2xl font-bold text-white mt-1">
                        {selectedHotspot.citizenDemand}
                      </p>

                      <p className="text-xs text-gray-500">
                        /100
                      </p>
                    </div>


                    <div className="bg-[#050b18] rounded-xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-sm">
                        Severity
                      </p>

                      <p className="text-2xl font-bold text-white mt-1">
                        {selectedHotspot.severity}
                      </p>

                      <p className="text-xs text-gray-500">
                        /100
                      </p>
                    </div>


                    <div className="bg-[#050b18] rounded-xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-sm">
                        Population Affected
                      </p>

                      <p className="text-2xl font-bold text-white mt-1">
                        {selectedHotspot.populationAffected}
                      </p>

                      <p className="text-xs text-gray-500">
                        /100
                      </p>
                    </div>


                    <div className="bg-[#050b18] rounded-xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-sm">
                        Infrastructure Gap
                      </p>

                      <p className="text-2xl font-bold text-white mt-1">
                        {selectedHotspot.infrastructureGap}
                      </p>

                      <p className="text-xs text-gray-500">
                        /100
                      </p>
                    </div>


                    <div className="bg-[#050b18] rounded-xl p-4 border border-gray-800">
                      <p className="text-gray-500 text-sm">
                        Investment Gap
                      </p>

                      <p className="text-2xl font-bold text-white mt-1">
                        {selectedHotspot.investmentGap}
                      </p>

                      <p className="text-xs text-gray-500">
                        /100
                      </p>
                    </div>

                  </div>

                </div>


                {/* CITIZEN ISSUES */}

                <div className="mt-8">

                  <h3 className="text-xl font-bold text-white mb-4">
                    📢 Consolidated Citizen Issues
                  </h3>

                  <div className="space-y-3">

                    {selectedHotspot.issues.map(
                      (issue) => (

                        <div
                          key={issue.id}
                          className="bg-[#050b18] border border-gray-800 rounded-xl p-4"
                        >

                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

                            <div>

                              <p className="text-white font-semibold">
                                {issue.issue}
                              </p>

                              <p className="text-gray-500 text-sm mt-1">
                                Report duration:{" "}
                                {issue.duration}
                              </p>

                            </div>


                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${
                                issue.severity ===
                                "Critical"
                                  ? "bg-[#111d32] text-gray-300"
                                  : issue.severity ===
                                    "High"
                                  ? "bg-[#111d32] text-gray-300"
                                  : "bg-[#111d32] text-gray-300"
                              }`}
                            >
                              {issue.severity}
                            </span>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>


                {/* GEMINI AI INTELLIGENCE */}

                <div className="mt-8">

                  <h3 className="text-xl font-bold text-white mb-4">
                    🤖 Gemini AI Infrastructure Intelligence
                  </h3>


                  {intelligenceLoading ? (

                    <div className="bg-[#050b18] border border-gray-800 rounded-xl p-6">

                      <div className="flex items-center gap-3">

                        <div className="w-5 h-5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />

                        <p className="text-gray-300 font-semibold">
                          Gemini is analyzing this infrastructure hotspot...
                        </p>

                      </div>

                      <p className="text-gray-500 text-sm mt-3">
                        Analyzing citizen demand, severity,
                        infrastructure gaps and reported issues.
                      </p>

                    </div>

                  ) : hotspotIntelligence ? (

                    <div className="grid md:grid-cols-2 gap-5">

                      {/* SUMMARY */}

                      <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-300 text-sm font-semibold">
                          🔎 WHY THIS HOTSPOT MATTERS
                        </p>

                        <p className="text-gray-300 mt-3 leading-relaxed">
                          {hotspotIntelligence.summary}
                        </p>

                      </div>


                      {/* POPULATION */}

                      <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-300 text-sm font-semibold">
                          👥 POTENTIAL POPULATION IMPACT
                        </p>

                        <p className="text-gray-300 mt-3 leading-relaxed">
                          {hotspotIntelligence.affectedPopulation}
                        </p>

                      </div>


                      {/* RECOMMENDATION */}

                      <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-300 text-sm font-semibold">
                          🛠️ AI INFRASTRUCTURE RECOMMENDATION
                        </p>

                        <p className="text-gray-300 mt-3 leading-relaxed">
                          {hotspotIntelligence.recommendation}
                        </p>

                      </div>


                      {/* GOVERNMENT ACTION */}

                      <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-300 text-sm font-semibold">
                          🏛️ RECOMMENDED GOVERNMENT ACTION
                        </p>

                        <p className="text-gray-300 mt-3 leading-relaxed">
                          {hotspotIntelligence.governmentAction}
                        </p>

                      </div>


                      {/* DEPARTMENT */}

                      <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-500 text-sm font-semibold">
                          🏢 RELEVANT DEPARTMENT / AUTHORITY
                        </p>

                        <p className="text-white font-semibold mt-3">
                          {hotspotIntelligence.department}
                        </p>

                      </div>


                      {/* URGENCY */}

                      <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-500 text-sm font-semibold">
                          ⏱️ RECOMMENDED URGENCY
                        </p>

                        <p className="text-white font-semibold mt-3">
                          {hotspotIntelligence.urgency}
                        </p>

                      </div>


                      {/* EXPECTED IMPACT */}

                      <div className="md:col-span-2 bg-[#050b18] border border-gray-800 rounded-xl p-5">

                        <p className="text-gray-500 text-sm font-semibold">
                          📈 EXPECTED PUBLIC-SERVICE IMPACT
                        </p>

                        <p className="text-gray-300 mt-3 leading-relaxed">
                          {hotspotIntelligence.expectedImpact}
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="bg-[#050b18] border border-gray-800 rounded-xl p-5">

                      <p className="text-gray-500">
                        Select a hotspot and click
                        View Intelligence to generate
                        Gemini-powered infrastructure recommendations.
                      </p>

                    </div>

                  )}

                </div>


                {/* REPORT COUNT */}

                <div className="mt-6 text-sm text-gray-500">

                  Based on{" "}

                  <span className="text-gray-300 font-semibold">
                    {selectedHotspot.reportCount}
                  </span>{" "}

                  citizen report
                  {selectedHotspot.reportCount !== 1
                    ? "s"
                    : ""}{" "}
                  contributing to this infrastructure hotspot.

                </div>

              </div>

            )}


            {/* ==========================================
                DEMAND HOTSPOTS
            ========================================== */}

            <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-6 mb-8">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">

                <div>

                  <p className="text-gray-300 text-sm font-semibold">
                    CIVICPULSE INTELLIGENCE
                  </p>

                  <h2 className="text-2xl font-bold mt-1">
                    Demand Hotspots
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Areas where similar citizen
                    infrastructure demands are
                    concentrated.
                  </p>

                </div>

                <div className="text-sm text-gray-500">
                  {hotspots.length} hotspot
                  {hotspots.length !== 1
                    ? "s"
                    : ""}
                </div>

              </div>


              {hotspots.length === 0 ? (

                <div className="text-center py-10 text-gray-500">
                  No demand hotspots detected yet.
                </div>

              ) : (

                <>
                <div className="space-y-2">

                  {visibleHotspots.map(
                    (hotspot, index) => (

                      <div
                        key={`${hotspot.location}-${hotspot.category}`}
                        className="rounded-xl border border-gray-800 bg-[#050b18]/40 p-4 transition hover:border-blue-500/50"
                      >

                        {/* HEADER */}

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <div className="flex items-center gap-2">

                              <span className="text-xl">
                                🔥
                              </span>

                              <span className="text-gray-300 text-sm font-bold">
                                HOTSPOT #{index + 1}
                              </span>

                            </div>

                            <h3 className="mt-1 text-lg font-bold capitalize">
                              {hotspot.category}
                            </h3>

                            <p className="text-gray-500 mt-1">
                              📍 {hotspot.location}
                            </p>

                          </div>


                          <div className="text-center">

                            <p className="text-gray-500 text-xs">
                              PRIORITY
                            </p>

                            <p className="text-xl font-bold text-gray-300">
                              {hotspot.priorityScore}
                            </p>

                            <p className="text-gray-300 text-sm font-semibold">
                              {hotspot.priorityLevel}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Severity {hotspot.severity}
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHotspot(hotspot);
                              generateHotspotIntelligence(hotspot);
                              requestAnimationFrame(() => {
                                document
                                  .getElementById("selected-hotspot-intelligence")
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                              });
                            }}
                            className="rounded-lg border border-blue-500/30 px-3 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10"
                          >
                            View Intelligence
                          </button>
                        </div>


                        {selectedHotspot?.location === hotspot.location &&
                          selectedHotspot.category === hotspot.category && (
                          <>

                        {/* HOTSPOT STATS */}

                        <div className="grid grid-cols-3 gap-3 mt-6">

                          <div className="bg-[#0c1628] rounded-xl p-4">

                            <p className="text-gray-500 text-xs">
                              Citizen Reports
                            </p>

                            <p className="text-2xl font-bold mt-1">
                              {hotspot.reportCount}
                            </p>

                          </div>


                          <div className="bg-[#0c1628] rounded-xl p-4">

                            <p className="text-gray-500 text-xs">
                              Severity
                            </p>

                            <p className="text-2xl font-bold mt-1 text-gray-300">
                              {hotspot.severity}
                            </p>

                          </div>


                          <div className="bg-[#0c1628] rounded-xl p-4">

                            <p className="text-gray-500 text-xs">
                              Demand
                            </p>

                            <p className="text-2xl font-bold mt-1 text-gray-300">
                              {hotspot.citizenDemand}
                            </p>

                          </div>

                        </div>


                        {/* SCORE BREAKDOWN */}

                        <div className="border-t border-gray-800 mt-6 pt-5">

                          <p className="text-gray-500 text-sm font-semibold mb-4">
                            HOTSPOT INTELLIGENCE
                          </p>

                          <div className="grid grid-cols-2 gap-3">

                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Population Affected
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {hotspot.populationAffected}
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Infrastructure Gap
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {hotspot.infrastructureGap}
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Investment Gap
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {hotspot.investmentGap}
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Similar Issues
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {hotspot.issues.length}
                              </p>

                            </div>

                          </div>

                        </div>


                        {/* CONSOLIDATED DEMAND */}

                        <div className="border-t border-gray-800 mt-6 pt-5">

                          <p className="text-gray-500 text-sm font-semibold mb-3">
                            CONSOLIDATED CITIZEN DEMAND
                          </p>

                          <div className="space-y-2">

                            {hotspot.issues
                              .slice(0, 3)
                              .map((issue) => (

                                <div
                                  key={issue.id}
                                  className="flex items-center justify-between gap-3"
                                >

                                  <p className="text-gray-300 text-sm">
                                    {issue.issue}
                                  </p>

                                  <span className="text-gray-300 text-xs font-semibold whitespace-nowrap">
                                    {issue.severity}
                                  </span>

                                </div>

                              ))}

                          </div>

                        </div>

                          </>
                        )}

                      </div>

                    )
                  )}

                </div>

                {hotspots.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllHotspots((show) => !show)}
                    className="mt-5 text-sm font-semibold text-blue-300 hover:text-blue-200"
                  >
                    {showAllHotspots
                      ? "Show fewer hotspots"
                      : `View all ${hotspots.length} hotspots`} →
                  </button>
                )}

                </>
              )}

            </div>

            </>}

                        {/* ==========================================
                RECENT INCIDENTS
            ========================================== */}
            {activeSection === "complaints" && <>
            <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-gray-500">🕐 RECENT ACTIVITY</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Latest citizen report activity</h2>
                    <p className="mt-1 text-sm text-gray-500">Ordered by the existing report creation timestamps.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <label className="flex items-center gap-2">
                    <span>Complaint Status:</span>
                    <select
                      value={complaintStatusFilter}
                      onChange={(event) => {
                        setComplaintStatusFilter(event.target.value as typeof complaintStatusFilter);
                        setShowAllRecentActivity(false);
                      }}
                      className="rounded-lg border border-gray-700 bg-[#111d32] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-400"
                      aria-label="Filter recent complaints by status"
                    >
                      <option value="Active">Active</option>
                      <option value="All">All</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </label>
                  <span>{filteredRecentReports.length} complaints</span>
                </div>
              </div>

              {filteredRecentReports.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-xl">
                  No complaints match this status filter.
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full table-fixed text-left">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                        <th className="w-[42%] py-3 pr-3 font-semibold">Incident</th>
                        <th className="hidden py-3 px-3 font-semibold lg:table-cell">Category</th>
                        <th className="hidden py-3 px-3 font-semibold md:table-cell">Location</th>
                        <th className="hidden py-3 px-3 font-semibold xl:table-cell">Submitted</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 pl-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((report) => (
                        <tr key={report.id} className="border-b border-gray-800 last:border-0">
                          <td className="py-4 pr-3 align-top">
                            <p className="truncate font-semibold text-white">{report.aiAnalysis?.issue || report.description}</p>
                            <p className="mt-1 break-all text-xs text-gray-500">Complaint No:{" "}
                                <span className="font-mono text-blue-300">{report.complaintNumber ||`CP-${report.id.slice(0, 12).toUpperCase()}`}

                                </span></p>
                          </td>
                          <td className="hidden py-4 px-3 text-sm text-gray-300 lg:table-cell">{report.aiAnalysis?.category || report.category || "—"}</td>
                          <td className="hidden py-4 px-3 text-sm text-gray-400 md:table-cell">{report.location || "—"}</td>
                          <td className="hidden py-4 px-3 text-sm text-gray-500 xl:table-cell">{formatDate(report.createdAt)}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass(report.status)}`}>
                              {report.status || "Submitted"}
                            </span>
                          </td>
                          <td className="py-4 pl-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => setEvidenceReport(report)}
                                className="px-3 py-2 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#050b18] transition"
                              >
                                Evidence
                              </button>
                              <button
                                onClick={() => openComplaintManager(report)}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition"
                              >
                                Manage
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredRecentReports.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecentActivity((show) => !show)}
                  className="mt-5 text-sm font-semibold text-blue-300 hover:text-blue-200"
                >
                  {showAllRecentActivity ? "Show fewer recent reports" : "View more recent reports"} →
                </button>
              )}
            </div>

            </>}

            {/* ==========================================
                PRIORITY ISSUES
            ========================================== */}

            {activeSection === "priority" && showAllPriorityIssues && (
            <div className="bg-[#0c1628] border border-gray-800 rounded-2xl p-6">

              <div className="flex items-center justify-between mb-6">

                <div>

                  <h2 className="text-2xl font-bold">
                    Priority Infrastructure Issues
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Deterministic priority scoring based
                    on citizen demand, severity and
                    infrastructure indicators.
                  </p>

                </div>

                <span className="text-sm text-gray-500">
                  {reports.length} reports
                </span>

              </div>


              <div className="space-y-5">

                {reports
                  .filter((report) => report.status !== "Resolved")

                  .map((report) => {

                    const priority =
                      getPriorityScore(
                        report,
                        reports
                      );

                    return {
                      report,
                      priority,
                    };

                  })

                  .sort(
                    (a, b) =>
                      b.priority.score -
                      a.priority.score
                  )

                  .map(
                    ({
                      report,
                      priority,
                    }) => (

                      <div
                        key={report.id}
                        className="border border-gray-800 rounded-2xl p-6 hover:border-gray-400 transition"
                      >

                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

                          <div className="flex-1">

                            <p className="text-gray-300 text-sm font-semibold uppercase">
                              {report.aiAnalysis?.category ||
                                report.category}
                            </p>

                            <h3 className="text-2xl font-bold mt-1">
                              {report.aiAnalysis?.issue ||
                                report.description}
                            </h3>

                            <p className="text-gray-500 mt-2">
                              📍 {report.location}
                            </p>

                            <p className="text-gray-500 text-sm mt-3">
                              {report.aiAnalysis?.summary}
                            </p>

                            

                          </div>


                          <div className="text-center min-w-[160px]">

                            <p className="text-gray-500 text-sm">
                              PRIORITY SCORE
                            </p>

                            <p
                              className={`text-5xl font-bold mt-1 ${
                                priority.level ===
                                "Critical"
                                  ? "text-gray-300"
                                  : priority.level ===
                                    "High"
                                  ? "text-gray-300"
                                  : priority.level ===
                                    "Medium"
                                  ? "text-gray-300"
                                  : "text-gray-300"
                              }`}
                            >
                              {priority.score}
                            </p>

                            <p
                              className={`font-semibold mt-1 ${
                                priority.level ===
                                "Critical"
                                  ? "text-gray-300"
                                  : priority.level ===
                                    "High"
                                  ? "text-gray-300"
                                  : priority.level ===
                                    "Medium"
                                  ? "text-gray-300"
                                  : "text-gray-300"
                              }`}
                            >
                              {priority.level}
                            </p>

                          </div>

                        </div>


                        {/* SCORE BREAKDOWN */}

                        <div className="border-t border-gray-800 mt-6 pt-5">

                          <p className="text-gray-500 text-sm mb-4 font-semibold">
                            PRIORITY SCORE BREAKDOWN
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Citizen Demand
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {
                                  priority.breakdown
                                    .citizenDemand
                                }
                              </p>

                              <p className="text-gray-500 text-xs">
                                Weight 35%
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Severity
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {
                                  priority.breakdown
                                    .severity
                                }
                              </p>

                              <p className="text-gray-500 text-xs">
                                Weight 20%
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Population
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {
                                  priority.breakdown
                                    .populationAffected
                                }
                              </p>

                              <p className="text-gray-500 text-xs">
                                Weight 20%
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Infrastructure Gap
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {
                                  priority.breakdown
                                    .infrastructureGap
                                }
                              </p>

                              <p className="text-gray-500 text-xs">
                                Weight 15%
                              </p>

                            </div>


                            <div className="bg-[#0c1628] rounded-xl p-4">

                              <p className="text-gray-500 text-xs">
                                Investment Gap
                              </p>

                              <p className="text-xl font-bold mt-1">
                                {
                                  priority.breakdown
                                    .investmentGap
                                }
                              </p>

                              <p className="text-gray-500 text-xs">
                                Weight 10%
                              </p>

                            </div>

                          </div>

                        </div>


                        {/* REPORT AI RECOMMENDATION */}

                        <div className="border-t border-gray-800 mt-5 pt-5">

                          <p className="text-gray-300 text-sm font-semibold">
                            AI RECOMMENDATION
                          </p>

                          <p className="text-gray-300 mt-2">
                            {
                              report.aiAnalysis
                                ?.recommended_action
                            }
                          </p>

                        </div>


                        <p className="text-gray-500 text-xs mt-5">
                          * Population,
                          infrastructure-gap and
                          investment-gap values are
                          demo inputs for the prototype
                          and will be replaced with
                          public datasets.
                        </p>

                      </div>

                    )
                  )}

              </div>

            </div>
            )}

            {activeSection === "brief" && <section className="mt-8 rounded-2xl border border-gray-800 bg-[#0c1628] p-6 md:flex md:items-center md:justify-between md:gap-8">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-gray-500">AI INFRASTRUCTURE BRIEF</p>
                <h2 className="mt-2 text-xl font-bold text-white">Infrastructure situation summary</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Generate a concise infrastructure situation summary from current citizen reports.</p>
              </div>
              <button type="button" onClick={generateInfrastructureBrief} disabled={isGeneratingBrief} className="mt-5 shrink-0 rounded-lg border border-blue-500/30 bg-[#111d32] px-5 py-3 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0">
                {isGeneratingBrief ? "Generating brief..." : "Generate AI Infrastructure Brief"}
              </button>
              {briefError && <p className="mt-3 text-sm text-red-200 md:mt-0">{briefError} <button type="button" onClick={generateInfrastructureBrief} className="font-semibold underline hover:text-white">Retry</button></p>}
            </section>}

            </div>
          </div>

        )}

      </div>

      {/* MODALS */}
      {evidenceReport && (
        <EvidenceModal
          report={evidenceReport}
          priority={getPriorityScore(evidenceReport, reports)}
          onClose={() => setEvidenceReport(null)}
        />
      )}

      {selectedReport && (
        <ManageComplaintModal
          report={selectedReport}
          status={adminStatus}
          setStatus={setAdminStatus}
          department={adminDepartment}
          setDepartment={setAdminDepartment}
          remark={adminRemark}
          setRemark={setAdminRemark}
          updateComplaint={updateComplaint}
          updating={updatingComplaint}
          message={updateMessage}
          onClose={() => { setSelectedReport(null); setUpdateMessage(""); }}
        />
      )}

      {infrastructureBrief && (
        <InfrastructureBriefModal
          brief={infrastructureBrief}
          metrics={{ reports: reports.length, critical: criticalCount, high: highCount, hotspots: hotspots.length }}
          onClose={() => setInfrastructureBrief(null)}
        />
      )}

    </main>
  );
}

function InfrastructureBriefModal({
  brief,
  metrics,
  onClose,
}: {
  brief: InfrastructureBrief;
  metrics: { reports: number; critical: number; high: number; hotspots: number };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-800 bg-[#0c1628]" onMouseDown={(event) => event.stopPropagation()} aria-label="AI Infrastructure Brief">
        <div className="sticky top-0 flex items-start justify-between border-b border-gray-800 bg-[#0c1628] px-6 py-5">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-gray-500">CIVICPULSE AI</p>
            <h2 className="mt-1 text-2xl font-bold text-white">AI Infrastructure Brief</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-[#111d32]">Close</button>
        </div>

        <div className="space-y-6 p-6 text-gray-200">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Reports analyzed", metrics.reports],
              ["Critical issues", metrics.critical],
              ["High priority", metrics.high],
              ["Demand hotspots", metrics.hotspots],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-gray-800 bg-[#050b18] p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <BriefSection title="Executive Summary"><p className="leading-7">{brief.executiveSummary}</p></BriefSection>
          <BriefSection title="Key Concerns"><BriefList items={brief.keyConcerns} /></BriefSection>
          <BriefSection title="Priority Areas"><BriefList items={brief.priorityAreas} /></BriefSection>
          <BriefSection title="Recommended Actions"><BriefList items={brief.recommendedActions} ordered /></BriefSection>

          <p className="border-t border-gray-800 pt-4 text-xs leading-5 text-gray-500">
            Generated from current citizen reports. AI-generated decision-support information, not an official government decision.
          </p>
        </div>
      </section>
    </div>
  );
}

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="border-b border-gray-800 pb-2 text-base font-bold text-white">{title}</h3><div className="pt-3 text-sm">{children}</div></section>;
}

function BriefList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return <List className={`${ordered ? "list-decimal" : "list-disc"} space-y-2 pl-5 leading-6`}>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</List>;
}
