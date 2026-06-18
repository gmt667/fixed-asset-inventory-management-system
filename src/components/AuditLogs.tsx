/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  Search,
  Sliders,
  Compass,
  User,
  Clock,
  Unlock,
  Terminal,
  XCircle,
  Database,
  Printer
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, isOffline, getBufferedAuditLogs, syncOfflineData } from "../db";
import { UserRole, AuditLog } from "../types";
import { jsPDF } from "jspdf";

interface AuditLogsProps {
  userRole: UserRole;
  currentUserId: string;
}

export default function AuditLogs({ userRole, currentUserId }: AuditLogsProps) {
  const [db, setDb] = useState(() => getDatabaseState());
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const [offline, setOffline] = useState(() => isOffline());
  const [bufferedLogs, setBufferedLogs] = useState<AuditLog[]>(getBufferedAuditLogs());

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  useEffect(() => {
    const handleNetworkChange = () => {
      setOffline(isOffline());
      setBufferedLogs(getBufferedAuditLogs());
    };
    const handleBufferChange = () => {
      setBufferedLogs(getBufferedAuditLogs());
      refreshDb();
    };
    const handleDbSynced = () => {
      refreshDb();
    };

    window.addEventListener("faims_network_connection_changed", handleNetworkChange);
    window.addEventListener("faims_offline_buffer_updated", handleBufferChange);
    window.addEventListener("faims_db_synced", handleDbSynced);

    return () => {
      window.removeEventListener("faims_network_connection_changed", handleNetworkChange);
      window.removeEventListener("faims_offline_buffer_updated", handleBufferChange);
      window.removeEventListener("faims_db_synced", handleDbSynced);
    };
  }, []);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      
      // Accent header bar - Emerald Green
      doc.setFillColor(16, 185, 129);
      doc.rect(15, 15, 180, 2, "F");

      // Organization Name & Security Header
      const orgName = (db as any).settings?.orgName || "GOLDEN STAR CAPITAL";
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text(`${orgName.toUpperCase()} • FAIMS ADMINISTRATIVE CONSOLE`, 15, 23);

      // Main title
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ADMINISTRATIVE AUDIT TRAIL TIMELINES", 15, 31);

      // Metadata labels
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("CLASSIFICATION: PRIVILEGED CORE SECURITY RECORD", 15, 36);
      doc.text(`GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 130, 36);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 41, 195, 41);

      // Meta details summary grid
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.rect(15, 45, 180, 18, "FD");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("ACTIVE INTEGRITY COMPLIANCE RECORD", 20, 51);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Authorized Officer ID: ${currentUserId} (${userRole})`, 20, 57);
      doc.text(`Active Search / Filter Constraint: ${actionFilter === "all" ? "All events" : actionFilter}`, 110, 51);
      doc.text(`Record count in current dispatch: ${filteredLogs.length} entries`, 110, 57);

      // Column sizing & headers configuration
      const headers = ["TIMESTAMP", "OPERATOR", "ACTION TYPE", "EVENT DETAILS & CLIENT IP"];
      const colWidths = [35, 35, 40, 70];

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
        doc.text("Official Integrity Security Ledger. Verifiable cryptographically via central database synchronization.", 15, 285);
        doc.text(`Page ${doc.getNumberOfPages()}`, 180, 285);
      };

      let curY = 82;
      drawTableHeader(74);

      filteredLogs.forEach((log, index) => {
        if (curY > 270) {
          drawFooter();
          doc.addPage();
          curY = 25;

          // Continued header
          doc.setFillColor(15, 23, 42);
          doc.rect(15, curY - 5, 180, 5, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(`CONTINUATION: SYSTEM AUDIT LEDGERS - PAGE ${doc.getNumberOfPages()}`, 17, curY - 1.5);

          drawTableHeader(curY);
          curY += 13;
        }

        // Zebra background row
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, curY - 5, 180, 7, "F");
        }

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);

        const dateObj = new Date(log.timestamp);
        const dateStr = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: "numeric", minute: "numeric", second: "numeric" })}`;

        const cellTexts = [
          dateStr,
          truncate(`${log.userName}`, 20),
          truncate(log.action, 22),
          truncate(`${log.details} [${log.ipAddress || "N/A"}]`, 42)
        ];

        let cellX = 15;
        cellTexts.forEach((ct, i) => {
          if (i === 2) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
          }
          doc.text(ct, cellX + 2, curY);
          cellX += colWidths[i];
        });

        curY += 7;
      });

      drawFooter();

      // Download PDF File instantly
      doc.save(`FAIMS_Audit_Trail_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      
      // Log audit entry
      addAuditRecord(currentUserId, userRole, "Export Audit Trail", `Successfully generated paginated high-fidelity central audit ledgers trail.`);
    } catch (e) {
      console.error("PDF generation error: ", e);
      alert("Encountered unexpected error during PDF compiling generation. Verify database consistency state.");
    } finally {
      setIsExporting(false);
    }
  };

  const isAuthorized = useMemo(() => {
    return userRole === UserRole.ADMIN || userRole === UserRole.AUDITOR;
  }, [userRole]);

  // Unique actions for filters
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    db.auditLogs.forEach(log => {
      if (log.action) actions.add(log.action);
    });
    return Array.from(actions);
  }, [db.auditLogs]);

  const filteredLogs = useMemo(() => {
    return db.auditLogs.filter(log => {
      const matchSearch =
        log.userName.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase());

      const matchAction = actionFilter === "all" || log.action === actionFilter;

      return matchSearch && matchAction;
    });
  }, [db.auditLogs, search, actionFilter]);

  const handleClearAuditLogs = () => {
    if (userRole !== UserRole.ADMIN) {
      alert("Only the System Administrator is authorized to purge historical logs!");
      return;
    }
    if (!confirm("CRITICAL WARNING: Are you absolutely certain you want to permanently delete all historical audit trails? This action is IRREVERSIBLE from the cPanel Database!")) {
      return;
    }

    const currentDB = getDatabaseState();
    
    // Seed with a singular log detailing the clear-event itself (required for accountability)
    const purgeRecord = {
      id: `log-${Date.now()}`,
      userId: currentUserId,
      userName: "Administrator",
      action: "System Audits Purge",
      details: "Database history purged by executive action. Clearing completed.",
      timestamp: new Date().toISOString(),
      ipAddress: "client-unavailable"
    };

    currentDB.auditLogs = [purgeRecord];
    saveDatabaseState(currentDB);
    refreshDb();
  };

  // Safe checks. Non admins/auditors get warning panels
  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto mt-12 text-xs">
        <Terminal className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h3 className="text-sm font-bold text-slate-900 font-display">Security Access Lock</h3>
        <p className="text-slate-500 leading-relaxed">
          Access to the central audit timelines, IP logs, database seeding trackers, and employee action trails is reserved for <strong>Auditor</strong> or <strong>System Administrator</strong> clearance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header axis */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" /> Organizational Audit Timelines
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse complete administrative timelines, user sessions logs, and database modifications checked securely.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-audit-trail-pdf"
            onClick={handleExportPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all duration-150 hover:-translate-y-0.5"
            disabled={isExporting}
            title="Generate and download high-fidelity branded executive Audit Trail PDF report using jsPDF"
          >
            <Printer className="w-4 h-4 text-emerald-100" /> {isExporting ? "Compiling Trail..." : "Export Audit Trail"}
          </button>

          {userRole === UserRole.ADMIN && (
            <button
              onClick={handleClearAuditLogs}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Unlock className="w-4 h-4" /> Purge Roster
            </button>
          )}
        </div>
      </div>

      {/* Interactive live filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-xs">
        {/* Search Input */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by keywords, details, IP address or user accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* Action filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-805 font-medium cursor-pointer"
        >
          <option value="all">All Events ({uniqueActions.length})</option>
          {uniqueActions.map(act => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
      </div>

      {/* Main timeline listing */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden text-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-500 flex justify-between items-center">
          <span>Complete System Ledgers ({filteredLogs.length} matching events)</span>
          <span className="font-mono text-emerald-600 text-[10px] tracking-wider uppercase font-bold flex items-center gap-1">
            <Database className="w-3 h-3 text-emerald-500" /> SECURE AUDIT CHAIN ACTIVE
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-slate-600">
          {/* OFFLINE SECURITIES TIMELINE QUEUE PANEL */}
          {bufferedLogs.length > 0 && (
            <div className="bg-amber-500/5 px-6 py-5 border-b border-amber-300/40 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] bg-amber-500 text-slate-900 font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    UN-SYNCED LOCAL AUDIT ENTRIES ({bufferedLogs.length} SECURED EVENT TRAILS)
                  </span>
                </div>
                {!offline && (
                  <button
                    onClick={() => syncOfflineData()}
                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded transition-colors"
                  >
                    Sync Logs Now
                  </button>
                )}
              </div>
              <p className="text-slate-500 mb-4 text-[11px] leading-relaxed">
                The administrative audits listed below were registered offline on this device. They exist securely in cache and will automatically finalize to cPanel database files once network connectivity is resumed.
              </p>
              
              <div className="divide-y divide-amber-200/40 border-t border-amber-200/30">
                {bufferedLogs.map(log => (
                  <div key={log.id} className="py-3 flex flex-col md:flex-row items-start justify-between gap-4 font-normal">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-900 border border-amber-500/30 font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
                        OFF
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-[12px]">{log.action}</span>
                          <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            LOCAL BUFFERED IP: {log.ipAddress}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed pr-6">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-left md:text-right shrink-0 text-[10.5px] font-mono leading-tight space-y-0.5 text-slate-500">
                      <span className="block text-slate-700 font-semibold">{log.userName}</span>
                      <span className="block">{new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      <span className="block text-amber-700 font-bold text-[9px]">● Pending central merge</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredLogs.length === 0 && bufferedLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
              <p className="font-semibold text-slate-500">
                {db.auditLogs.length === 0 ? "No activity has been recorded." : "No matching activities correspond to filter selections."}
              </p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="p-4 flex flex-col md:flex-row items-start justify-between gap-4 hover:bg-slate-50/50 transition-all font-medium">
                <div className="flex gap-3 min-w-0 flex-1">
                  {/* Digital Terminal Indicator */}
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-white flex items-center justify-center shrink-0 font-mono text-[10px] uppercase">
                    TL
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">{log.action}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                        IP: {log.ipAddress}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11.5px] leading-relaxed pr-6">{log.details}</p>
                  </div>
                </div>

                {/* Date and profile tags */}
                <div className="text-left md:text-right shrink-0 text-[10px] font-mono leading-tight space-y-0.5 text-slate-400">
                  <span className="block text-slate-600 font-semibold">{log.userName}</span>
                  <span className="block">{new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                  <span className="block font-medium text-slate-400 font-mono">ID: {log.id}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
