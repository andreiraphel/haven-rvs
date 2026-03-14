import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { buildingName, riskIndex, riskDescription, hazardData, vulnerabilityData, exposureData } =
      await req.json();

    // Use the provided key
    const apiKey = process.env.VERTEX_API_KEY; 

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

    // Make raw REST call to Google AI Studio (which accepts API Keys natively)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const geminiReq = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
        }
      })
    });

    const rawResponse = await geminiReq.text(); 

    if (!geminiReq.ok) {
      console.error("Gemini API Error Status:", geminiReq.status);
      console.error("Gemini API Error Body:", rawResponse);
      throw new Error(`Gemini request failed with status: ${geminiReq.status}. See server logs.`);
    }

    let data;
    try {
        data = JSON.parse(rawResponse);
    } catch(err) {
        console.error("Failed to parse Gemini response:", rawResponse);
        throw new Error("Gemini returned invalid JSON");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean and parse the generated AI response
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
    console.error("Gemini Route Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
