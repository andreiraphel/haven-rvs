import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { buildingName, riskIndex, riskDescription, hazardData, vulnerabilityData, exposureData } =
      await req.json();

    const apiKey = process.env.GEMINI_API_KEY; 

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

    CRITICAL INSTRUCTION: You must output ONLY a valid JSON object. Do not include ANY conversational text, preambles, or markdown formatting outside the JSON block.
    
    EXPECTED JSON SCHEMA:
    {
      "narrative": "Your 5 sentence narrative here...",
      "courseOfAction": "1. **[Heading]** [Detail]\\n2. **[Heading]** [Detail]..."
    }`;

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const modelsToTry = [
      "gemma-4-31b-it",
      "gemma-4-26b-a4b-it"
    ];

    let textResponse = "";
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
             temperature: 0.2
          }
        });
        
        textResponse = response.text;
        console.log(`✅ Gemini API succeeded using model: ${modelName}`);
        success = true;
        break; // Stop looping on success
      } catch (error: any) {
        console.warn(`⚠️ Gemini API model ${modelName} failed:`, error.message);
        lastError = error;
        
        // Check if the error is a Rate Limit (429) or Not Found (404). If it's a structural error (like 400), we probably shouldn't loop.
        const errMsg = error.message?.toLowerCase() || "";
        if (!errMsg.includes("429") && !errMsg.includes("404") && !errMsg.includes("503") && !errMsg.includes("quota")) {
           // We might want to break here if it's a hard error, but keeping the loop robust
           // for now unless it's a known bad request.
        }
      }
    }

    if (!success) {
      console.error("❌ All Gemini API models failed.");
      
      // If we hit a rate limit or all models are simply missing, use fallback.
      const lastErrMsg = lastError?.message?.toLowerCase() || "";
      if (lastErrMsg.includes("429") || lastErrMsg.includes("quota") || lastErrMsg.includes("404")) {
          console.warn("⚠️ Falling back to default narrative due to API unavailability.");
          return NextResponse.json({
            narrative: `Assessment for ${buildingName}: Index ${riskIndex} (${riskDescription}).\n\n(Note: Detailed AI narrative is temporarily unavailable due to high server traffic. Please try again later.)`,
            courseOfAction: "1. **Structural audit.** Conduct a full structural audit by a licensed engineer.\n2. **Connection check.** Inspect all beam-column connections.\n3. **Decay check.** Look for any signs of material decay or spalling.\n4. **Disaster plan.** Update emergency response and evacuation plans."
          });
      }
      
      throw new Error(`Gemini request failed completely. Last error: ${lastError?.message}`);
    }

    // Extract JSON block if it's wrapped in markdown or has trailing text
    let cleanText = textResponse.trim();
    const jsonMatch = cleanText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      cleanText = jsonMatch[1];
    } else {
      // Fallback: try to find the first { and last }
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json({
        narrative: parsed.narrative || "No narrative generated.",
        courseOfAction: parsed.courseOfAction || "1. Perform structural audit."
      });
    } catch (e) {
      console.error("Gemini Parse Error:", textResponse);
      return NextResponse.json({
        narrative: textResponse.substring(0, 500),
        courseOfAction: "1. **Parsing Error** AI output format was unexpected."
      });
    }
  } catch (err: any) {
    console.error("Gemini Route Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
