import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("🔥 ANALYZE API BODY RECEIVED");

    const {
      description,
      category,
      location,
      photo,
    } = body;

    if (!description) {
      return NextResponse.json(
        {
          error: "Problem description is required.",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are CivicPulse AI, an AI system that analyzes citizen infrastructure reports in India.

Analyze this citizen infrastructure report using BOTH the written description and the uploaded image when an image is provided.

Citizen Report:
"${description}"

Citizen Selected Category:
"${category || "Not specified"}"

Reported Location:
"${location || "Not specified"}"

Rules:
- Detect the language.
- Classify the infrastructure issue.
- Determine severity: Low, Medium, High, or Critical.
- Identify duration if mentioned.
- Summarize the issue.
- Explain the severity.
- Suggest a practical government infrastructure action.
- Do not invent facts.
- Use visible evidence from the image when available.
- Do not assume something that cannot be clearly determined from the image.
- If information is unknown, return "Not specified".
`;

    // ==========================================
    // GEMINI INPUT
    // ==========================================

    const inputParts: any[] = [
      {
        type: "text",
        text: prompt,
      },
    ];

    // ==========================================
    // ADD IMAGE
    // ==========================================

    if (photo) {
      const match = photo.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );

      if (!match) {
        return NextResponse.json(
          {
            error: "Invalid image format.",
          },
          { status: 400 }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2];

      inputParts.push({
        type: "image",
        data: base64Data,
        mime_type: mimeType,
      });

      console.log(
        "📷 IMAGE ATTACHED TO GEMINI REQUEST"
      );
    }

    // ==========================================
    // CALL GEMINI
    // ==========================================

    console.log(
      photo
        ? "🤖 Calling Gemini with TEXT + IMAGE..."
        : "🤖 Calling Gemini with TEXT..."
    );

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",

      input: inputParts,

      response_format: {
        type: "text",
        mime_type: "application/json",

        schema: {
          type: "object",

          properties: {
            language: {
              type: "string",
            },

            category: {
              type: "string",
            },

            issue: {
              type: "string",
            },

            severity: {
              type: "string",
              enum: [
                "Low",
                "Medium",
                "High",
                "Critical",
              ],
            },

            duration: {
              type: "string",
            },

            summary: {
              type: "string",
            },

            severity_reason: {
              type: "string",
            },

            recommended_action: {
              type: "string",
            },

            visual_evidence: {
                type: "string",
            },
          },

          required: [
            "language",
            "category",
            "issue",
            "severity",
            "duration",
            "summary",
            "severity_reason",
            "recommended_action",
            "visual_evidence",
          ],
        },
      },
    });

    console.log(
      "🤖 GEMINI RESPONSE RECEIVED"
    );

    const result = JSON.parse(
      interaction.output_text
    );

    console.log(
      "✅ GEMINI ANALYSIS SUCCESS"
    );

    return NextResponse.json(result);

  } catch (error) {

    console.error(
      "❌ GEMINI ANALYSIS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze the citizen report.",
      },
      { status: 500 }
    );
  }
}