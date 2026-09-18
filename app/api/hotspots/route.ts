import { NextResponse } from "next/server";
import { adminDb } from "../../../firebaseAdmin";
import { calculatePriorityScore } from "../../../lib/priority";

export async function GET() {
  try {
    console.log("🔥 HOTSPOTS: Fetching reports...");

    const snapshot = await adminDb
      .collection("citizen_reports")
      .get();

    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ==========================================
    // GROUP REPORTS BY LOCATION + CATEGORY
    // ==========================================

    const groups: Record<string, any> = {};

    reports.forEach((report: any) => {
      const location = report.location || "Unknown";
      const category =
        report.aiAnalysis?.category ||
        report.category ||
        "Unknown";

      const key =
        `${location.toLowerCase()}_${category.toLowerCase()}`;

      if (!groups[key]) {
        groups[key] = {
          location,
          category,
          reports: [],
          severities: [],
        };
      }

      groups[key].reports.push(report);

      if (report.aiAnalysis?.severity) {
        groups[key].severities.push(
          report.aiAnalysis.severity
        );
      }
    });

    // ==========================================
    // CONVERT GROUPS INTO HOTSPOTS
    // ==========================================

    const severityScores: Record<string, number> = {
      Critical: 100,
      High: 80,
      Medium: 60,
      Low: 30,
    };

    const hotspots = Object.values(groups).map(
      (group: any) => {

        const reportCount = group.reports.length;

        // Citizen demand increases as more
        // similar reports appear.
        const citizenDemand = Math.min(
          100,
          40 + reportCount * 15
        );

        // Use the highest severity found
        // within the hotspot.
        const severity = Math.max(
          ...group.severities.map(
            (value: string) =>
              severityScores[value] || 30
          ),
          30
        );

        // Prototype values.
        // These will later come from public datasets.
        const populationAffected = Math.min(
          100,
          50 + reportCount * 10
        );

        const infrastructureGap = 80;

        const investmentGap = 65;

        const priority = calculatePriorityScore({
          citizenDemand,
          severity,
          populationAffected,
          infrastructureGap,
          investmentGap,
        });

        const issues = group.reports.map(
          (report: any) => ({
            id: report.id,
            issue:
              report.aiAnalysis?.issue ||
              report.description,
            severity:
              report.aiAnalysis?.severity ||
              "Not specified",
            duration:
              report.aiAnalysis?.duration ||
              "Not specified",
          })
        );

        return {
          location: group.location,
          category: group.category,
          reportCount,
          priorityScore: priority.score,
          priorityLevel: priority.level,
          severity,
          citizenDemand,
          populationAffected,
          infrastructureGap,
          investmentGap,
          issues,
        };
      }
    );

    // Highest-priority hotspots first
    hotspots.sort(
      (a: any, b: any) =>
        b.priorityScore - a.priorityScore
    );

    console.log(
      "🔥 HOTSPOTS: Generated:",
      hotspots.length
    );

    return NextResponse.json({
      success: true,
      hotspots,
    });

  } catch (error) {
    console.error(
      "🔥 HOTSPOTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate hotspots",
      },
      { status: 500 }
    );
  }
}