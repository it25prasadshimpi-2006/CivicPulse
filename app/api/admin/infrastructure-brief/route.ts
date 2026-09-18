import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { adminAuth, adminDb } from "../../../../firebaseAdmin";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_TIMEOUT_MS = 30_000;
const GEMINI_MODEL = "gemini-3.6-flash";

type BriefResponse = {
  executiveSummary: string;
  keyConcerns: string[];
  priorityAreas: string[];
  recommendedActions: string[];
};

function isBriefResponse(value: unknown): value is BriefResponse {
  if (!value || typeof value !== "object") return false;

  const brief = value as Record<string, unknown>;

  return (
    typeof brief.executiveSummary === "string" &&
    [brief.keyConcerns, brief.priorityAreas, brief.recommendedActions].every(
      (items) =>
        Array.isArray(items) &&
        items.every((item) => typeof item === "string")
    )
  );
}

function isGeminiTimeout(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const requestError = error as {
    code?: string;
    message?: string;
    name?: string;
    cause?: {
      code?: string;
      message?: string;
    };
  };

  const hasTimeoutMessage = (message?: string) => {
    const normalized = message?.toLowerCase() ?? "";

    return (
      normalized.includes("timeout") ||
      normalized.includes("deadline exceeded") ||
      normalized.includes("deadline expired")
    );
  };

  return (
    requestError.code === "UND_ERR_HEADERS_TIMEOUT" ||
    requestError.name === "AbortError" ||
    hasTimeoutMessage(requestError.message) ||
    requestError.cause?.code === "UND_ERR_HEADERS_TIMEOUT" ||
    hasTimeoutMessage(requestError.cause?.message)
  );
}

function isGeminiUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const apiError = error as {
    status?: number;
    message?: string;
  };

  const message = apiError.message?.toLowerCase() ?? "";

  return (
    apiError.status === 429 ||
    apiError.status === 503 ||
    apiError.status === 504 ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable")
  );
}

async function generateBriefWithGemini(prompt: string) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, GEMINI_TIMEOUT_MS);

  try {
    return await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        abortSignal: controller.signal,
        httpOptions: {
          timeout: GEMINI_TIMEOUT_MS,
          retryOptions: {
            attempts: 1,
          },
        },
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Local fallback.
 *
 * This uses ONLY the structured data already calculated by the dashboard.
 * It does not call another AI service and does not modify Firestore.
 */
function generateFallbackBrief(
  dashboardData: Record<string, any>
): BriefResponse {
  const reportCounts = dashboardData.reportCounts ?? {};
  const categoryCounts = dashboardData.categoryCounts ?? {};
  const locations: string[] = Array.isArray(dashboardData.locations)
    ? dashboardData.locations.filter(
        (location: unknown): location is string =>
          typeof location === "string" && location.trim().length > 0
      )
    : [];

  const priorityReports: Array<Record<string, any>> = Array.isArray(
    dashboardData.priorityReports
  )
    ? dashboardData.priorityReports
    : [];

  const hotspots: Array<Record<string, any>> = Array.isArray(
    dashboardData.hotspots
  )
    ? dashboardData.hotspots
    : [];

  const keyConcerns: string[] = [];

  const categoryLabels: Array<[string, string]> = [
    ["water", "Water"],
    ["roads", "Roads"],
    ["healthcare", "Healthcare"],
    ["education", "Education"],
    ["utilities", "Utilities"],
  ];

  const activeCategories = categoryLabels
    .filter(([key]) => Number(categoryCounts[key] ?? 0) > 0)
    .map(([, label]) => label);

  if (activeCategories.length > 0) {
    keyConcerns.push(
      `Citizen infrastructure reports currently cover ${activeCategories.join(
        ", "
      )} services.`
    );
  }

  const criticalCount = Number(reportCounts.critical ?? 0);
  const highCount = Number(reportCounts.high ?? 0);

  if (criticalCount > 0) {
    keyConcerns.push(
      "Critical-severity citizen reports require urgent administrative review."
    );
  }

  if (highCount > 0) {
    keyConcerns.push(
      "High-severity citizen reports require appropriate departmental follow-up."
    );
  }

  if (hotspots.length > 0) {
    keyConcerns.push(
      "Current demand hotspots indicate locations where infrastructure reports are concentrated."
    );
  }

  if (keyConcerns.length === 0) {
    keyConcerns.push(
      "Current citizen infrastructure reports should be reviewed for appropriate departmental action."
    );
  }

  const priorityAreas: string[] = [];

  // Use the exact locations already supplied by the dashboard.
  if (hotspots.length > 0) {
    for (const hotspot of hotspots) {
      if (
        typeof hotspot.location === "string" &&
        hotspot.location.trim() &&
        !priorityAreas.includes(hotspot.location.trim())
      ) {
        priorityAreas.push(hotspot.location.trim());
      }
    }
  }

  if (priorityAreas.length === 0) {
    for (const location of locations) {
      if (!priorityAreas.includes(location)) {
        priorityAreas.push(location);
      }
    }
  }

  if (priorityAreas.length === 0) {
    priorityAreas.push("Current reported infrastructure areas");
  }

  const recommendedActions: string[] = [];

  if (priorityReports.length > 0) {
    recommendedActions.push(
      "Review the highest-priority active citizen reports and coordinate the responsible departments for field verification."
    );
  }

  if (hotspots.length > 0) {
    recommendedActions.push(
      "Review the identified demand hotspots and coordinate local infrastructure response for the affected areas."
    );
  }

  if (criticalCount > 0 || highCount > 0) {
    recommendedActions.push(
      "Prioritize administrative review of critical and high-severity reports and document departmental action."
    );
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push(
      "Review current citizen reports and assign appropriate departmental follow-up."
    );
  }

  return {
    executiveSummary:
      "Current citizen infrastructure data indicates areas requiring administrative review, geographic attention, and coordinated departmental follow-up.",

    keyConcerns,

    priorityAreas,

    recommendedActions,
  };
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(
      authorization.substring(7)
    );

    const profileSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (
      !profileSnapshot.exists ||
      profileSnapshot.get("role") !== "admin"
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const dashboardData = await request.json();

    if (!dashboardData || typeof dashboardData !== "object") {
      return NextResponse.json(
        { error: "Current dashboard data is required" },
        { status: 400 }
      );
    }

    const prompt = `
You are CivicPulse AI. Create concise decision-support content for an Indian
government infrastructure administrator using ONLY the structured current
dashboard data below.

CURRENT DASHBOARD DATA:
${JSON.stringify(dashboardData, null, 2)}

Rules:
- Use only the supplied data.
- Do not invent facts.
- Do not calculate new numeric totals.
- Do not invent locations, categories, populations, budgets, trends, or statuses.
- Recommendations must be practical and grounded in the supplied citizen
  infrastructure reports and hotspots.
- This is decision-support information, not an official government decision.

Return ONLY valid JSON in this exact structure:
{
  "executiveSummary": "Concise narrative.",
  "keyConcerns": ["Concern grounded in supplied data"],
  "priorityAreas": ["Only supplied locations/categories"],
  "recommendedActions": ["Practical action grounded in supplied data"]
}
`;

    /*
     * First attempt: Gemini.
     */
    try {
      const response = await generateBriefWithGemini(prompt);

      const text = (response.text || "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const brief: unknown = JSON.parse(text);

      if (!isBriefResponse(brief)) {
        throw new Error("Gemini returned an invalid brief format");
      }

      console.log(
        "INFRASTRUCTURE BRIEF: Generated successfully with Gemini"
      );

      return NextResponse.json({
        success: true,
        brief,
        source: "gemini",
      });
    } catch (geminiError) {
      /*
       * Gemini is currently returning 503/high-demand for this project.
       * Instead of making the user wait or showing an error, use the
       * deterministic local fallback based on the exact dashboard data.
       */
      if (
        isGeminiUnavailable(geminiError) ||
        isGeminiTimeout(geminiError)
      ) {
        console.warn(
          "INFRASTRUCTURE BRIEF: Gemini unavailable. Using dashboard-data fallback."
        );

        const fallbackBrief = generateFallbackBrief(
          dashboardData as Record<string, any>
        );

        return NextResponse.json({
          success: true,
          brief: fallbackBrief,
          source: "dashboard-fallback",
          notice:
            "Gemini is temporarily unavailable. The brief was generated from current dashboard data.",
        });
      }

      throw geminiError;
    }
  } catch (error) {
    console.error("INFRASTRUCTURE BRIEF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to generate the AI infrastructure brief. Please retry.",
      },
      { status: 500 }
    );
  }
}