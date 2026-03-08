import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { buildingName, riskIndex, riskDescription, hazardData, vulnerabilityData, exposureData } =
      await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Initialize the client inside the handler
    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    const prompt = `You are a Lead Structural Forensic Engineer and Heritage Conservation Specialist. 
    Provide a rigorous, data-driven technical assessment for "${buildingName}".

    ENGINEERING DATASET:
    - Statistical Risk Index: ${riskIndex}/10
    - Risk Classification: ${riskDescription}
    - Hazard Profile: ${JSON.stringify(hazardData)}
    - Structural Vulnerability: ${JSON.stringify(vulnerabilityData)}
    - Heritage/Exposure Value: ${JSON.stringify(exposureData)}

    PHASE 1: NARRATIVE TECHNICAL SUMMARY (Exactly 5 sentences):
    - Tone: Forensic and conservative.
    - Analysis: Cross-reference Hazard and Vulnerability.
    - Codes: Reference National Structural Code of the Philippines (NSCP 2015).

    PHASE 2: PRIORITIZED COURSE OF ACTION (6 steps):
    - Priority 1: Life-safety stabilization.
    - Priority 2: Non-Destructive Testing (UPV, Rebar Mapping, etc).
    - Priority 3: Engineering retrofitting (CFRP, Steel Jacketing, etc).
    - Priority 4: Heritage compliance (RA 10066).
    - Priority 5: Geotechnical/Foundation address.
    - Priority 6: Monitoring protocols.

    RESPONSE FORMAT: Return ONLY a JSON object with keys "narrative" and "courseOfAction". 
    Format Course of Action as: 1. **[Heading]** [Detail]\\n2. **[Heading]** [Detail]...`;

    // Tiered Fallback: 3 -> 2.0 -> 1.5
    let response;
    const models = ["gemini-3-flash-preview", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError;

    for (const modelName of models) {
      try {
        console.log(`Attempting Gemini model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) {
          console.log(`✅ Success with ${modelName}`);
          break; 
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`⚠️ ${modelName} failed: ${err.message || err.status}`);
        // Small delay before trying next model to allow 429s to breathe
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response) {
      throw lastError || new Error("All AI models failed to respond.");
    }

    const text = response.text || "";
    
    // Clean and parse the response
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json({ 
        narrative: parsed.narrative || "No narrative generated.", 
        courseOfAction: parsed.courseOfAction || "1. Perform structural audit." 
      });
    } catch (e) {
      console.error("Gemini Parse Error:", text);
      return NextResponse.json({ 
        narrative: text.substring(0, 500), 
        courseOfAction: "1. **Parsing Error** AI output format was unexpected." 
      });
    }
  } catch (err: any) {
    console.error("Gemini 3 Implementation SDK Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
