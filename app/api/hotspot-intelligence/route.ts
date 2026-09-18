import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_TIMEOUT_MS = 30_000;
const GEMINI_MODEL = "gemini-3.6-flash";

function isTemporarilyUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const apiError = error as {
    status?: number;
    message?: string;
  };

  return (
    apiError.status === 503 ||
    apiError.message?.toLowerCase().includes("high demand") === true
  );
}

function isRateLimited(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const apiError = error as {
    status?: number;
    message?: string;
  };

  return (
    apiError.status === 429 ||
    apiError.message?.toLowerCase().includes("quota") === true
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

async function generateHotspotIntelligence(prompt: string) {
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
  } catch (error) {
    if (controller.signal.aborted || isGeminiTimeout(error)) {
      console.error(
        "HOTSPOT INTELLIGENCE: Gemini request timed out"
      );
      throw new Error("GEMINI_REQUEST_TIMEOUT");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const hotspot = await request.json();

    if (!hotspot || typeof hotspot !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Hotspot data is required.",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are CivicPulse AI, an infrastructure intelligence system for government
decision-makers in India.

Analyze the following citizen infrastructure hotspot.

HOTSPOT:
Location: ${hotspot.location}
Category: ${hotspot.category}
Citizen Reports: ${hotspot.reportCount}
Priority Score: ${hotspot.priorityScore}/100
Priority Level: ${hotspot.priorityLevel}
Severity: ${hotspot.severity}/100
Citizen Demand: ${hotspot.citizenDemand}/100
Population Affected: ${hotspot.populationAffected}/100
Infrastructure Gap: ${hotspot.infrastructureGap}/100
Investment Gap: ${hotspot.investmentGap}/100

CITIZEN ISSUES:
${JSON.stringify(hotspot.issues, null, 2)}

Generate practical infrastructure intelligence for a government dashboard.

Return ONLY valid JSON in this exact structure:

{
  "summary": "A concise explanation of the infrastructure problem and why it matters.",
  "affectedPopulation": "Explain who may be affected based only on the available evidence.",
  "recommendation": "The recommended infrastructure intervention.",
  "governmentAction": "A practical action government authorities can take.",
  "department": "The most relevant government department or authority.",
  "urgency": "Immediate, Short-term, or Medium-term",
  "expectedImpact": "Expected public-service impact if the intervention is implemented."
}

Rules:
- Do not invent exact population numbers.
- Do not invent government budgets.
- Do not claim facts that are not supported by the provided data.
- Keep recommendations practical and suitable for Indian local government.
- Use clear professional language.
`;

    let response;

    try {
      response = await generateHotspotIntelligence(prompt);
    } catch (error) {
      if (!isTemporarilyUnavailable(error)) {
        throw error;
      }

      console.warn(
        "HOTSPOT INTELLIGENCE: Gemini temporarily unavailable, retrying once"
      );

      try {
        response = await generateHotspotIntelligence(prompt);
      } catch (retryError) {
        throw retryError;
      }
    }

    const text = response.text || "";

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const intelligence = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      intelligence,
    });
  } catch (error) {
    console.error("HOTSPOT INTELLIGENCE ERROR:", error);

    const temporarilyUnavailable = isTemporarilyUnavailable(error);
    const rateLimited = isRateLimited(error);
    const timedOut = isGeminiTimeout(error);

    if (timedOut) {
      return NextResponse.json(
        {
          success: false,
          error: "AI service took too long to respond. Please retry.",
        },
        { status: 504 }
      );
    }

    if (temporarilyUnavailable) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI service is temporarily busy. Please retry in a moment.",
        },
        { status: 503 }
      );
    }

    if (rateLimited) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI service request limit has been reached. Please retry shortly.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to generate hotspot intelligence. Please retry.",
      },
      { status: 500 }
    );
  }
}