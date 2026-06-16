/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Sliders,
  X,
  FileSpreadsheet,
  Activity,
  CheckCircle,
  Clock
} from "lucide-react";
import { getDatabaseState, addAuditRecord, formatCurrency, formatDate, subscribeToDatabaseState } from "../db";
import { UserRole } from "../types";
import { jsPDF } from "jspdf";
import InteractiveReportingCharts from "./InteractiveReportingCharts";

interface ReportingModuleProps {
  userRole: UserRole;
  currentUserId: string;
  initialReport?: ReportType;
}

type ReportType =
  | "Register"
  | "Department"
  | "Valuation"
  | "Maintenance"
  | "Verification"
  | "Transfer"
  | "Disposal"
  | "Audit";

export default function ReportingModule({ userRole, currentUserId, initialReport }: ReportingModuleProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [selectedReport, setSelectedReport] = useState<ReportType>(initialReport || "Register");

  useEffect(() => {
    return subscribeToDatabaseState(() => setDb(getDatabaseState()));
  }, []);

  useEffect(() => {
    if (initialReport) {
      setSelectedReport(initialReport);
    }
  }, [initialReport]);

  const [filterDept, setFilterDept] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  // Export simulation
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportType, setExportType] = useState<"PDF" | "Excel" | "CSV" | null>(null);

  // Compute stats
  const valuationTotal = useMemo(() => {
    return db.assets.reduce((sum, a) => sum + a.purchaseCost, 0);
  }, [db.assets]);

  const reportData = useMemo(() => {
    if (selectedReport === "Register") {
      return db.assets.filter(a => {
        const matchDept = filterDept === "all" || a.departmentId === filterDept;
        const matchCat = filterCat === "all" || a.categoryId === filterCat;
        return matchDept && matchCat;
      });
    }
    if (selectedReport === "Department") {
      // Group counts and cost by department
      return db.departments.map(d => {
        const matching = db.assets.filter(a => a.departmentId === d.id);
        const costVal = matching.reduce((sum, current) => sum + current.purchaseCost, 0);
        return {
          id: d.id,
          name: d.name,
          code: d.code,
          count: matching.length,
          value: costVal
        };
      });
    }
    if (selectedReport === "Valuation") {
      // Detailed valuation columns
      return db.assets.map(a => {
        const estDepreciationRate = a.condition === "Excellent" ? 0.05 : a.condition === "Good" ? 0.15 : 0.35;
        const bookValue = a.purchaseCost * (1 - estDepreciationRate);
        return {
          tag: a.assetTag,
          name: a.name,
          cost: a.purchaseCost,
          condition: a.condition,
          rate: estDepreciationRate * 100,
          depreciatedValue: bookValue
        };
      });
    }
    if (selectedReport === "Maintenance") {
      return db.maintenance;
    }
    if (selectedReport === "Verification") {
      return db.verifications;
    }
    if (selectedReport === "Transfer") {
      return db.transfers;
    }
    if (selectedReport === "Disposal") {
      return db.disposals;
    }
    if (selectedReport === "Audit") {
      return db.auditLogs;
    }
    return [];
  }, [selectedReport, db, filterDept, filterCat]);

  const handleExportCSV = () => {
    // Generate actual downloadable high-fidelity CSV stream!
    setExportType("CSV");
    setExportProgress(10);
    
    // Quick progress loading effect
    let prog = 10;
    const interval = setInterval(() => {
      prog += 30;
      setExportProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        
        let headers: string[] = [];
        let rows: string[][] = [];

        const escapeCSV = (value: any) => {
          if (value === null || value === undefined) {
            return "";
          }
          let str = String(value);
          if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
            str = str.replace(/"/g, '""');
            return `"${str}"`;
          }
          return str;
        };

        if (selectedReport === "Register") {
          headers = [
            "Asset Tag",
            "Asset Name",
            "Client Name",
            "District",
            "Region",
            "Condition",
            "Asset Status",
            "Asset Value (MWK)",
            "Purchase Date",
            "Category",
            "Department",
            "Location",
            "Serial Number",
            "Warranty Expiry",
            "Administrative Notes"
          ];
          db.assets.forEach(a => {
            const dept = db.departments.find(d => d.id === a.departmentId)?.name || "N/A";
            const cat = db.categories.find(c => c.id === a.categoryId)?.name || "N/A";
            const loc = db.locations.find(l => l.id === a.locationId)?.name || "N/A";
            const client = db.clients.find(c => c.id === a.clientId);
            rows.push([
              a.assetTag,
              a.name,
              client?.name || "Unassigned client",
              client?.district || "N/A",
              client?.region || "N/A",
              a.condition,
              a.status,
              formatCurrency(a.purchaseCost),
              formatDate(a.purchaseDate),
              cat,
              dept,
              loc,
              a.serialNumber || "N/A",
              formatDate(a.warrantyExpiry) || "N/A",
              a.notes || ""
            ].map(escapeCSV));
          });
        } else if (selectedReport === "Department") {
          headers = [
            "Department Name",
            "Internal Department Code",
            "Active Items Count",
            "Collective Capital Value (MWK)"
          ];
          (reportData as any[]).forEach(d => {
            rows.push([
              d.name,
              d.code,
              d.count,
              formatCurrency(d.value)
            ].map(escapeCSV));
          });
        } else if (selectedReport === "Valuation") {
          headers = [
            "Asset Tag",
            "Asset Name",
            "Condition",
            "Acquisition Cost (MWK)",
            "Estimated Depreciation Rate (%)",
            "Calculated End Book Value (MWK)"
          ];
          (reportData as any[]).forEach(r => {
            rows.push([
              r.tag,
              r.name,
              r.condition,
              formatCurrency(r.cost),
              `${r.rate}%`,
              formatCurrency(r.depreciatedValue)
            ].map(escapeCSV));
          });
        } else if (selectedReport === "Maintenance") {
          headers = [
            "Maintenance Record ID",
            "Asset Tag",
            "Asset Name",
            "Request Operator",
            "Assigned Technician",
            "Service Provider",
            "Incurred Cost (MWK)",
            "Service Date",
            "Completion Date",
            "Service Status",
            "Technician Remarks"
          ];
          db.maintenance.forEach(m => {
            const assetObj = db.assets.find(a => a.id === m.assetId);
            rows.push([
              m.id,
              assetObj?.assetTag || "N/A",
              assetObj?.name || "N/A",
              m.requestBy,
              m.technician || "N/A",
              m.serviceProvider || "N/A",
              formatCurrency(m.cost),
              formatDate(m.maintenanceDate),
              m.completionDate ? formatDate(m.completionDate) : "N/A",
              m.status,
              m.notes || ""
            ].map(escapeCSV));
          });
        } else if (selectedReport === "Verification") {
          headers = [
            "Verification Audit ID",
            "Asset Tag",
            "Asset Name",
            "Inspection Date",
            "Assigned Auditor",
            "Asset Status",
            "Physical Condition",
            "Audit Outcome Result",
            "Auditor Assessment Notes"
          ];
          db.verifications.forEach(v => {
            const assetObj = db.assets.find(a => a.id === v.assetId);
            rows.push([
              v.id,
              assetObj?.assetTag || "N/A",
              assetObj?.name || "N/A",
              v.verificationDate,
              v.verifiedBy,
              v.status,
              v.condition,
              v.result,
              v.notes || ""
            ].map(escapeCSV));
          });
        } else if (selectedReport === "Transfer") {
          headers = [
            "Transfer Record ID",
            "Asset Tag",
            "Asset Name",
            "Source Department",
            "Destination Department",
            "Source Physical Location",
            "Destination Physical Location",
            "Approval Sync Status",
            "Transfer Request Date",
            "Authorized Officer",
            "Handover Transmit Notes"
          ];
          db.transfers.forEach(t => {
            const assetObj = db.assets.find(a => a.id === t.assetId);
            const sourceDept = db.departments.find(d => d.id === t.sourceDepartmentId)?.name || "N/A";
            const destDept = db.departments.find(d => d.id === t.destDepartmentId)?.name || "N/A";
            const sourceLoc = db.locations.find(l => l.id === t.sourceLocationId)?.name || "N/A";
            const destLoc = db.locations.find(l => l.id === t.destLocationId)?.name || "N/A";
            rows.push([
              t.id,
              assetObj?.assetTag || "N/A",
              assetObj?.name || "N/A",
              sourceDept,
              destDept,
              sourceLoc,
              destLoc,
              t.status,
              t.transferDate,
              t.authorizedBy || "System Auto",
              t.remarks || ""
            ].map(escapeCSV));
          });
        } else if (selectedReport === "Disposal") {
          headers = [
            "Retired Disposal ID",
            "Asset Tag",
            "Asset Name",
            "Disposal Date Official",
            "Disposal/Retirement Method",
            "Reason for Retirement",
            "Authorized Officer",
            "Supporting Document Verification"
          ];
          db.disposals.forEach(disp => {
            const assetObj = db.assets.find(a => a.id === disp.assetId);
            rows.push([
              disp.id,
              assetObj?.assetTag || "N/A",
              assetObj?.name || "N/A",
              disp.disposalDate,
              disp.method,
              disp.reason,
              disp.authorizedBy,
              disp.supportingDocuments || "No attached document register"
            ].map(escapeCSV));
          });
        } else {
          // Fallback to "Audit" and general logs
          headers = [
            "Audit Track ID",
            "Operator ID",
            "Full Name",
            "Action Type",
            "Operation Details Description",
            "Security Timestamp",
            "Access Client IP Address"
          ];
          db.auditLogs.forEach(log => {
            rows.push([
              log.id,
              log.userId,
              log.userName,
              log.action,
              log.details,
              log.timestamp,
              log.ipAddress
            ].map(escapeCSV));
          });
        }

        // Combine headers and rows with commas and carriage returns
        const csvString = [
          headers.join(","),
          ...rows.map(r => r.join(","))
        ].join("\r\n");

        // Convert string to bytes Blob with BOM signature so Excel opens Excel UTF-8 correctly
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: "text/csv;charset=utf-8" });
        const downloadUrl = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", downloadUrl);
        link.setAttribute("download", `FAIMS_${selectedReport}_Report_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup memory state
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        addAuditRecord(currentUserId, userRole, "Report Downloaded", `Generated raw CSV export for: ${selectedReport} Report`);
        
        setTimeout(() => {
          setExportProgress(null);
          setExportType(null);
        }, 500);
      }
    }, 150);
  };

  const handleExportRealPDF = () => {
    setExportType("PDF");
    setExportProgress(10);
    
    let prog = 10;
    const interval = setInterval(() => {
      prog += 30;
      setExportProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        
        try {
          const doc = new jsPDF("p", "mm", "a4");
          
          // Accent header bar
          doc.setFillColor(16, 185, 129); // Emerald Green accent
          doc.rect(15, 15, 180, 2, "F");

          // Organization Name & Official Tag
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129);
          doc.text(`${(db.settings?.orgName || "GIANT PLUS LTD").toUpperCase()} • FAIMS CONSOLE`, 15, 23);

          // Main title
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(`${selectedReport.toUpperCase()} REPORT`, 15, 31);

          // Report Date/Stamp label
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text("SECURITY CLASSIFICATION: INTERNAL USE ONLY", 15, 36);
          doc.text(`GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 130, 36);

          // Thin separation line
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.5);
          doc.line(15, 41, 195, 41);

          // Meta details grid
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(241, 245, 249); // slate-100
          doc.rect(15, 45, 180, 18, "FD");

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(71, 85, 105); // slate-600
          doc.text("DOCUMENT SECURITY RECORD & METADATA", 20, 51);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(`Requesting Operator: ID ${currentUserId} (${userRole})`, 20, 57);
          doc.text(`Reporting Index Range: Compilation of ${reportData.length} active records`, 110, 51);
          doc.text(`Status: Signed Official Ledger Draft`, 110, 57);

          // KPI Snapshot Boxes
          // Card 1
          doc.setFillColor(236, 253, 245); // emerald-50
          doc.setDrawColor(209, 250, 229); // emerald-100
          doc.rect(15, 68, 56, 18, "FD");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(5, 150, 105); // emerald-600
          doc.text("TOTAL CAPITAL VALUE", 18, 73);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(6, 78, 59); // emerald-900
          doc.text(formatCurrency(valuationTotal), 18, 80);

          // Card 2
          doc.setFillColor(239, 246, 255); // blue-50
          doc.setDrawColor(219, 234, 254); // blue-100
          doc.rect(77, 68, 56, 18, "FD");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(37, 99, 235); // blue-650
          doc.text("AUDIT COMPLIANCE", 80, 73);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 58, 138); // blue-900
          const complianceRatio = ((db.verifications.length / (db.assets.length || 1)) * 100).toFixed(0);
          doc.text(`${complianceRatio}% Inspected`, 80, 80);

          // Card 3
          doc.setFillColor(254, 243, 199); // amber-50
          doc.setDrawColor(253, 230, 138); // amber-100
          doc.rect(139, 68, 56, 18, "FD");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(217, 119, 6); // amber-600
          doc.text("ACTIVE REPAIRS", 142, 73);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(120, 53, 4); // amber-900
          const pendingRepairsCount = db.maintenance.filter(m => m.status !== "Completed" && m.status !== "Cancelled").length;
          doc.text(`${pendingRepairsCount} Active Tasks`, 142, 80);

          // Column sizing & configuration
          let headers: string[] = [];
          let colWidths: number[] = [];

          if (selectedReport === "Register") {
            headers = ["TAG", "ASSET DESCRIPTION", "PURCHASE COST", "CONDITION", "STATUS"];
            colWidths = [30, 70, 30, 25, 25];
          } else if (selectedReport === "Department") {
            headers = ["DEPARTMENT NAME", "CODE", "ITEMS COUNT", "TOTAL CAPITAL BAR"];
            colWidths = [65, 35, 35, 45];
          } else if (selectedReport === "Valuation") {
            headers = ["TAG", "ASSET DESCRIPTION", "ACQUISITION COST", "DEP. RATE", "BOOK VALUE"];
            colWidths = [25, 65, 30, 25, 35];
          } else if (selectedReport === "Maintenance") {
            headers = ["RECORD ID", "BINDING ASSET", "LOG DATE", "REMARKS / DETAILS"];
            colWidths = [35, 45, 35, 65];
          } else {
            headers = ["RECORD ID", "TARGET/ACTOR", "DATE PARAMETERS", "PRIMARY DETAILS"];
            colWidths = [35, 45, 35, 65];
          }

          const truncate = (text: string, maxLen: number) => {
            if (!text) return "";
            return text.length > maxLen ? text.substring(0, maxLen - 3) + "..." : text;
          };

          const drawTableHeader = (y: number) => {
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(15, y, 180, 8, "F");

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);

            let curX = 15;
            headers.forEach((h, i) => {
              doc.text(h, curX + 2, y + 5.5);
              curX += colWidths[i];
            });
          };

          const drawFooter = () => {
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 280, 195, 280);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(`Official FAIMS Console Export Document. Compiled automatically via Secure Client Handshake.`, 15, 285);
            doc.text(`Page ${doc.getNumberOfPages()}`, 180, 285);
          };

          // Draw first header
          let curY = 100;
          drawTableHeader(92);

          // Rows
          reportData.forEach((row: any, index: number) => {
            if (curY > 270) {
              drawFooter();
              doc.addPage();
              curY = 25;

              // Draw continued header
              doc.setFillColor(15, 23, 42); // slate-900
              doc.rect(15, curY - 5, 180, 5, "F");
              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(255, 255, 255);
              doc.text(`CONTINUATION: ${selectedReport.toUpperCase()} REPORT - PAGE ${doc.getNumberOfPages()}`, 17, curY - 1.5);

              drawTableHeader(curY);
              curY += 13;
            }

            // Zebra background
            if (index % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(15, curY - 5, 180, 7, "F");
            }

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);

            let cellTexts: string[] = [];
            if (selectedReport === "Register") {
              cellTexts = [
                row.assetTag || "",
                truncate(row.name || "", 35),
                formatCurrency(row.purchaseCost || 0),
                row.condition || "",
                row.status || ""
              ];
            } else if (selectedReport === "Department") {
              cellTexts = [
                row.name || "",
                row.code || "",
                String(row.count || 0),
                formatCurrency(row.value || 0)
              ];
            } else if (selectedReport === "Valuation") {
              cellTexts = [
                row.tag || "",
                truncate(row.name || "", 30),
                formatCurrency(row.cost || 0),
                `-${row.rate}%`,
                formatCurrency(row.depreciatedValue || 0)
              ];
            } else if (selectedReport === "Maintenance") {
              const assetName = db.assets.find(a => a.id === row.assetId)?.name || "N/A";
              cellTexts = [
                row.id || "",
                truncate(assetName, 20),
                row.maintenanceDate || "N/A",
                truncate(row.remarks || "No details", 35)
              ];
            } else {
              const targetName = db.assets.find(a => a.id === row.assetId)?.name || row.userName || "System";
              const eventDate = row.verificationDate || row.transferDate || row.disposalDate || row.timestamp || "N/A";
              const remarks = row.notes || row.remarks || row.details || row.reason || row.action || "Processed OK";
              cellTexts = [
                row.id || "N/A",
                truncate(targetName, 20),
                eventDate,
                truncate(remarks, 35)
              ];
            }

            let cellX = 15;
            cellTexts.forEach((ct, i) => {
              if (i === 0 && (selectedReport === "Register" || selectedReport === "Valuation")) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
              } else {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(51, 65, 85);
              }
              doc.text(ct, cellX + 2, curY);
              cellX += colWidths[i];
            });

            curY += 7;
          });

          // Draw final footer
          drawFooter();

          // Save the PDF!
          doc.save(`FAIMS_${selectedReport}_Report_${new Date().toISOString().split("T")[0]}.pdf`);
          addAuditRecord(currentUserId, userRole, "Report Compiled", `Successfully compiled & downloaded high-fidelity branded PDF for: ${selectedReport} Report`);

        } catch (error) {
          console.error("PDF generation failed:", error);
          alert("An unexpected error occurred during PDF generation compiling. Please verify index integrity.");
        }

        setTimeout(() => {
          setExportProgress(null);
          setExportType(null);
        }, 500);
      }
    }, 150);
  };

  const buildSpreadsheetRows = () => {
    const normalize = (record: any): Record<string, string | number> => {
      if (!record || typeof record !== "object") {
        return { value: String(record ?? "") };
      }
      return Object.entries(record).reduce<Record<string, string | number>>((acc, [key, value]) => {
        if (value === null || value === undefined) {
          acc[key] = "";
        } else if (typeof value === "object") {
          acc[key] = JSON.stringify(value);
        } else {
          acc[key] = value as string | number;
        }
        return acc;
      }, {});
    };

    return (reportData as any[]).map(normalize);
  };

  const handleExportExcel = () => {
    setExportType("Excel");
    setExportProgress(10);
    
    let prog = 10;
    const interval = setInterval(() => {
      prog += 20;
      setExportProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        const rows = buildSpreadsheetRows();
        const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
          Object.keys(row).forEach(key => set.add(key));
          return set;
        }, new Set<string>()));
        const htmlEscape = (value: unknown) => String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        const table = `
          <table>
            <thead><tr>${headers.map(header => `<th>${htmlEscape(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows.map(row => `<tr>${headers.map(header => `<td>${htmlEscape(row[header])}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        `;
        const workbook = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head><meta charset="UTF-8"></head>
            <body>${table}</body>
          </html>
        `;
        const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `FAIMS_${selectedReport}_Report_${new Date().toISOString().split("T")[0]}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addAuditRecord(currentUserId, userRole, "Report Compiled", `Compiled and downloaded Excel workbook for: ${selectedReport} Report`);
        
        setTimeout(() => {
          setExportProgress(null);
          setExportType(null);
        }, 600);
      }
    }, 180);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic KPI summary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Capital Book Value</span>
          <h3 className="text-xl font-bold font-display text-slate-900 font-mono">
            ${formatCurrency(valuationTotal)}
          </h3>
        </div>
        <div className="md:border-l border-slate-100 md:pl-6">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inspected Verification Ratio</span>
          <h3 className="text-xl font-bold font-display text-emerald-600">
            {((db.verifications.length / (db.assets.length || 1)) * 100).toFixed(0)}% audit compliance
          </h3>
        </div>
        <div className="md:border-l border-slate-100 md:pl-6">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Service tickets pending</span>
          <h3 className="text-xl font-bold font-display text-amber-600">
            {db.maintenance.filter(m => m.status !== "Completed" && m.status !== "Cancelled").length} active repairs
          </h3>
        </div>
      </div>

      {/* Interactive Financial Performance Analytics Charts */}
      <InteractiveReportingCharts assets={db.assets} maintenance={db.maintenance} />

      {/* Main Report Selector card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Executive Analytics & Report Compiler
            </h2>
            <p className="text-xs text-slate-500 mt-1">Select specific structural logs or finacial valuation ledger to compile active prints.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              id="btn-download-csv"
              onClick={handleExportCSV}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download CSV
            </button>
            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
            <button
              id="btn-export-pdf-real"
              onClick={handleExportRealPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all duration-150 hover:-translate-y-0.5"
              title="Generate and download high-fidelity branded executive PDF report using jsPDF"
            >
              <Printer className="w-4 h-4 text-emerald-100" /> Export PDF
            </button>
          </div>
        </div>

        {/* Pivot parameters and filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600">Select Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-805 font-medium cursor-pointer"
            >
              <option value="Register">Asset Register Report</option>
              <option value="Department">Department Asset Division</option>
              <option value="Valuation">Depreciation Valuation Ledger</option>
              <option value="Maintenance">Maintenance Log Report</option>
              <option value="Verification">Verification Audit compliance</option>
              <option value="Transfer">Transfers & Transfers Logs</option>
              <option value="Disposal">Retired Disposals Registry</option>
              <option value="Audit">Detailed Audit Log trails</option>
            </select>
          </div>

          {selectedReport === "Register" && (
            <>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Filter Department</label>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {db.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">Filter Category</label>
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {db.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Grid listing preview of results */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center">
          <span>Active Report Live View Summary ({reportData.length} records compiled)</span>
          <span className="font-mono text-[10px] text-emerald-600">Preview Mode</span>
        </div>

        <div className="overflow-x-auto text-xs text-slate-600">
          <table className="w-full text-left border-collapse">
            
            {/* REGISTER PREVIEW HEADERS */}
            {selectedReport === "Register" && (
              <>
                <thead className="bg-slate-50 font-semibold text-slate-400 font-display border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3">Tag</th>
                    <th className="py-2 px-3">Asset Description</th>
                    <th className="py-2 px-3">Client Name</th>
                    <th className="py-2 px-3">District</th>
                    <th className="py-2 px-3">Region</th>
                    <th className="py-2 px-3">Asset Value</th>
                    <th className="py-2 px-3">Condition</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row: any) => {
                    const client = db.clients.find(item => item.id === row.clientId);
                    return (
                      <tr key={row.id}>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.assetTag}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{row.name}</td>
                        <td className="py-3 px-3">{client?.name || "Unassigned client"}</td>
                        <td className="py-3 px-3">{client?.district || "N/A"}</td>
                        <td className="py-3 px-3">{client?.region || "N/A"}</td>
                        <td className="py-3 px-3 font-mono text-slate-800 font-medium">{formatCurrency(row.purchaseCost)}</td>
                        <td className="py-3 px-3">{row.condition}</td>
                        <td className="py-3 px-3">{row.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* DEPARTMENT SUMMARY HEADERS */}
            {selectedReport === "Department" && (
              <>
                <thead className="bg-slate-50 font-semibold text-slate-400 font-display border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3">Internal Code</th>
                    <th className="py-2 px-3">Items Count</th>
                    <th className="py-2 px-3">Total Value (MWK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData as any[]).map(row => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-3 px-3 font-mono uppercase">{row.code}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.count}</td>
                      <td className="py-3 px-3 font-mono font-medium">{formatCurrency(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* DEPRECIATION VALUE HEADERS */}
            {selectedReport === "Valuation" && (
              <>
                <thead className="bg-slate-50 font-semibold text-slate-400 font-display border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3">Tag</th>
                    <th className="py-2 px-3">Asset Name</th>
                    <th className="py-2 px-3">Acquisition Cost</th>
                    <th className="py-2 px-3">Depreciation Rate</th>
                    <th className="py-2 px-3">Final book value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData as any[]).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-slate-900">{row.tag}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-3 px-3 font-mono">{formatCurrency(row.cost)}</td>
                      <td className="py-3 px-3 text-rose-600 font-semibold">-{row.rate}%</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-950">{formatCurrency(row.depreciatedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* GENERIC RECORDS FALLBACK HEADERS */}
            {selectedReport !== "Register" && selectedReport !== "Department" && selectedReport !== "Valuation" && (
              <>
                <thead className="bg-slate-50 font-semibold text-slate-400 font-display border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-3">Record ID</th>
                    <th className="py-2 px-3">Binding Asset</th>
                    <th className="py-2 px-3">Date Parameters</th>
                    <th className="py-2 px-3">Primary Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row: any) => {
                    const ast = db.assets.find(a => a.id === row.assetId);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono">{row.id}</td>
                        <td className="py-3 px-3 font-semibold">{ast ? ast.name : row.userName || "System"}</td>
                        <td className="py-3 px-3 font-mono">{row.verificationDate || row.maintenanceDate || row.transferDate || row.disposalDate || row.timestamp || "N/A"}</td>
                        <td className="py-3 px-3 truncate max-w-[300px]" title={row.notes || row.remarks || row.action || row.reason}>
                          {row.notes || row.remarks || row.details || row.reason || "Processed OK"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>

      {/* Export Loader Overlay HUD */}
      {exportProgress !== null && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center font-bold text-slate-800">
              <span className="animate-pulse">Compiling {exportType} Record Streams...</span>
              <span className="font-mono text-emerald-600">{exportProgress}%</span>
            </div>
            
            {/* Progress loading slider */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">FAIMS dynamic document rendering pipeline is sealing secure binary buffers.</p>
          </div>
        </div>
      )}

    </div>
  );
}
