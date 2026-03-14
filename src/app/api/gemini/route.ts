import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { buildingName, riskIndex, riskDescription, hazardData, vulnerabilityData, exposureData } =
      await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const ai = new GoogleGenerativeAI(apiKey);

    // Process multi-select fields
    const processMultiSelect = (data: any) => {
      const processedData = { ...data };
      for (const key in processedData) {
        if (Array.isArray(processedData[key])) {
          processedData[key] = processedData[key].join(', ');
        }
      }
      return processedData;
    };

    const processedHazardData = processMultiSelect(hazardData);
    const processedVulnerabilityData = processMultiSelect(vulnerabilityData);

    const prompt = `You are a Lead Structural Forensic Engineer and Heritage Conservation Specialist. 
    Provide a rigorous, data-driven technical assessment for "${buildingName}".

    ENGINEERING DATASET:
    - Statistical Risk Index: ${riskIndex}/10
    - Risk Classification: ${riskDescription}
    - Hazard Profile: ${JSON.stringify(processedHazardData)}
    - Structural Vulnerability: ${JSON.stringify(processedVulnerabilityData)}
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response) {
      throw new Error("All AI models failed to respond.");
    }

    const text = response.text() || "";
    
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
    console.error("Gemini API Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
