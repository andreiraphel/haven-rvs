import type { Assessment } from "@/types";
import type * as ExcelJS from "exceljs";

// ── EXCEL EXPORT ─────────────────────────────────────────────
export async function exportToExcel(assessments: Assessment[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HAVEN-RVS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Risk Summary", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // Header styling
  const headerFill: ExcelJS.Fill = {
    type: "pattern", pattern: "solid",
    fgColor: { argb: "FF3D2B1F" },
  };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  sheet.columns = [
    { header: "Building Name",  key: "name",    width: 28 },
    { header: "Unique Code",    key: "code",    width: 16 },
    { header: "Address",        key: "address", width: 32 },
    { header: "Town",           key: "town",    width: 18 },
    { header: "Type",           key: "type",    width: 18 },
    { header: "Year Built",     key: "year",    width: 12 },
    { header: "Statistical Risk Index (ML)", key: "index", width: 22 },
    { header: "Risk Level",     key: "level",   width: 18 },
    { header: "Manual Verification", key: "manual", width: 20 },
    
    // Ratings
    { header: "Hazard Rating",  key: "hazard_r",  width: 15 },
    { header: "Vulnerability Rating", key: "vuln_r", width: 18 },
    { header: "Exposure Rating", key: "exposure_r", width: 15 },

    // Hazard Details
    { header: "H: PEIS Intensity", key: "h_peis", width: 15 },
    { header: "H: Fault Dist (km)", key: "h_fault", width: 15 },
    { header: "H: Liquefaction", key: "h_liq", width: 15 },
    { header: "H: Wind Speed", key: "h_wind", width: 15 },
    { header: "H: Elevation", key: "h_elev", width: 12 },

    // Vulnerability Details
    { header: "V: Material", key: "v_mat", width: 18 },
    { header: "V: Framing", key: "v_frame", width: 18 },
    { header: "V: Stories", key: "v_stories", width: 10 },
    { header: "V: Crack Width", key: "v_crack", width: 15 },
    { header: "V: Settlement", key: "v_settle", width: 12 },
    { header: "V: Decay", key: "v_decay", width: 12 },

    // AI
    { header: "AI Forensic Summary", key: "ai_narrative", width: 50 },
    { header: "AI Recommended Actions", key: "ai_coa", width: 50 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FFB5552A" } } };
  });
  headerRow.height = 35;

  // Risk level colors
  const riskColors: Record<string, string> = {
    "LOW RISK":      "FFE6F4EC",
    "MODERATE RISK": "FFFFF3D6",
    "HIGH RISK":     "FFFDEAEA",
  };

  assessments.forEach(a => {
    const row = sheet.addRow({
      name:    a.building.name,
      code:    a.building.unique_code,
      address: a.building.address,
      town:    a.building.municipality,
      type:    a.building.building_type,
      year:    a.building.year_built,
      index:   a.result.risk_index != null ? Number(a.result.risk_index.toFixed(2)) : "—",
      level:   a.result.risk_description || "PENDING",
      manual:  a.result.manual_index != null ? Number(a.result.manual_index.toFixed(2)) : "—",
      
      hazard_r:   a.result.hazard_rating != null ? Number(a.result.hazard_rating.toFixed(3)) : "—",
      vuln_r:     a.result.vulnerability_rating != null ? Number(a.result.vulnerability_rating.toFixed(3)) : "—",
      exposure_r: a.result.exposure_rating != null ? Number(a.result.exposure_rating.toFixed(3)) : "—",

      h_peis:  a.hazard.earthquake_intensity,
      h_fault: a.hazard.fault_distance_km,
      h_liq:   a.hazard.potential_liquefaction,
      h_wind:  a.hazard.basic_wind_speed_kph,
      h_flood: a.hazard.flood_susceptibility,
      h_storm: a.hazard.storm_surge_height,
      h_elev:  a.hazard.elevation_m,

      v_mat:     a.vulnerability.structural_material,
      v_frame:   a.vulnerability.structural_framing_type,
      v_stories: a.vulnerability.number_of_stories,
      v_crack:   a.vulnerability.maximum_crack,
      v_settle:  a.vulnerability.uneven_settlement ? "Yes" : "No",
      v_decay:   a.vulnerability.decay_of_structural_member ? "Yes" : "No",

      ai_narrative: a.result.narrative,
      ai_coa:       a.result.ai_course_of_action,
    });
    
    const color = riskColors[a.result.risk_description] ?? "FFFFFFFF";
    row.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    row.height = 30;
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HAVEN-RVS_Risk_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF EXPORT ───────────────────────────────────────────────
export async function exportToPDF(assessments: Assessment[]) {
  const { default: jsPDF } = await import("jspdf");
  // @ts-ignore
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(61, 43, 31);
  doc.text("HAVEN-RVS — Risk Summary Report", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(92, 72, 50);
  doc.text(
    `Heritage And Ancestral Houses Visual Evaluation Network   |   Generated: ${new Date().toLocaleDateString()}`,
    14, 25
  );

  const riskColors: Record<string, [number, number, number]> = {
    "LOW RISK":      [230, 244, 236],
    "MODERATE RISK": [255, 243, 214],
    "HIGH RISK":     [253, 234, 234],
  };

  autoTable(doc, {
    startY: 32,
    head: [["Name / Code", "Details", "Risk", "Level", "H", "V", "E", "AI Summary"]],
    body: assessments.map(a => [
      `${a.building.name}\n${a.building.unique_code}`,
      `${a.building.municipality}\n${a.building.building_type} (${a.building.year_built})`,
      `ML: ${a.result.risk_index != null ? a.result.risk_index.toFixed(2) : "—"}\nMan: ${a.result.manual_index != null ? a.result.manual_index.toFixed(2) : "—"}`,
      a.result.risk_description || "PENDING",
      a.result.hazard_rating != null ? a.result.hazard_rating.toFixed(2) : "—",
      a.result.vulnerability_rating != null ? a.result.vulnerability_rating.toFixed(2) : "—",
      a.result.exposure_rating != null ? a.result.exposure_rating.toFixed(2) : "—",
      a.result.narrative ? a.result.narrative.substring(0, 100) + (a.result.narrative.length > 100 ? "..." : "") : "—"
    ]),
    headStyles: {
      fillColor: [61, 43, 31],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7, cellPadding: 3, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 40 }, // Name / Code
      1: { cellWidth: 35 }, // Details
      2: { cellWidth: 20, halign: "center" }, // Risk Index
      3: { cellWidth: 25, halign: "center", fontStyle: "bold" }, // Level
      4: { cellWidth: 10, halign: "center" }, // H
      5: { cellWidth: 10, halign: "center" }, // V
      6: { cellWidth: 10, halign: "center" }, // E
      7: { cellWidth: 'auto' }, // AI Summary
    },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 3) {
        // Only color the "Level" column
        const risk = assessments[data.row.index]?.result.risk_description;
        if (risk && riskColors[risk]) {
          const [r, g, b] = riskColors[risk];
          doc.setFillColor(r, g, b);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
          doc.setTextColor(0);
          doc.text(String(data.cell.raw), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center", baseline: "middle" });
        }
      }
    },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    margin: { left: 10, right: 10 },
  });

  doc.save(`HAVEN-RVS_Risk_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
}
