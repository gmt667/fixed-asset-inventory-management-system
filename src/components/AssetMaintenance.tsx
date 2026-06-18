/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Wrench,
  WrenchIcon,
  Plus,
  ArrowRight,
  DollarSign,
  User,
  ShieldAlert,
  Calendar,
  X,
  PlusCircle,
  Clock,
  Briefcase,
  Activity,
  Sparkles,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, checkAndAutoTriggerMaintenance, calculateAssetMTBF, formatCurrency } from "../db";
import { Asset, MaintenanceRecord, AssetStatus, UserRole } from "../types";
import MaintenanceCalendar from "./MaintenanceCalendar";

interface AssetMaintenanceProps {
  userRole: UserRole;
  currentUserId: string;
}

export default function AssetMaintenance({ userRole, currentUserId }: AssetMaintenanceProps) {
  const [db, setDb] = useState(() => getDatabaseState());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetAssetIdForMaintenance, setTargetAssetIdForMaintenance] = useState("");

  // Update states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeMaintRecord, setActiveMaintRecord] = useState<MaintenanceRecord | null>(null);

  // Form parameters
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [technician, setTechnician] = useState("");
  const [provider, setProvider] = useState("");
  const [cost, setCost] = useState("100");
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Recurring maintenance states
  const [activeSubTab, setActiveSubTab] = useState<"tickets" | "schedules" | "mtbf" | "calendar">("tickets");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editIntervalDays, setEditIntervalDays] = useState<string>("");

  const handleUpdateCategoryInterval = (categoryId: string, daysString: string) => {
    const days = parseInt(daysString, 10);
    if (isNaN(days) || days < 0) {
      alert("Please specify a valid number of days (positive integer).");
      return;
    }
    const currentDB = getDatabaseState();
    const catIdx = currentDB.categories.findIndex(c => c.id === categoryId);
    if (catIdx !== -1) {
      currentDB.categories[catIdx].serviceIntervalDays = days;
      saveDatabaseState(currentDB);
      addAuditRecord(
        currentUserId,
        "System Scheduler Admin",
        "Category Interval Rules Changed",
        `Adjusted standard PM interval for category '${currentDB.categories[catIdx].name}' to every ${days} days.`
      );
      triggerNotification(
        "all",
        "Interval Adjusted",
        `Standard service interval for '${currentDB.categories[catIdx].name}' modified to ${days} days.`,
        "info"
      );

      // Instantly run automated threshold checking after custom change
      checkAndAutoTriggerMaintenance();

      setEditingCategoryId(null);
      setDb(getDatabaseState());
    }
  };

  const handleTriggerRoutineScan = () => {
    const { triggeredCount } = checkAndAutoTriggerMaintenance();
    alert(`Automation core scan finished! Successfully initiated ${triggeredCount} service tickets for overdue equipment.`);
    refreshDb();
  };

  const handleForcePreventiveMaint = (asset: Asset) => {
    const currentDB = getDatabaseState();
    
    const nextMaint: MaintenanceRecord = {
      id: `m-rec-manual-${asset.id}-${Date.now()}`,
      assetId: asset.id,
      requestBy: "Manual PM Override",
      technician: "Internal Service Specialist",
      serviceProvider: "Corporate Preventive Services",
      cost: 0,
      maintenanceDate: new Date().toISOString().split("T")[0],
      notes: `[Forced PM Cycle] Preventive maintenance manually initiated by department manager.`,
      status: "Pending"
    };

    const assetIdx = currentDB.assets.findIndex(a => a.id === asset.id);
    if (assetIdx !== -1) {
      currentDB.assets[assetIdx].status = AssetStatus.UNDER_MAINTENANCE;
    }

    currentDB.maintenance.unshift(nextMaint);
    saveDatabaseState(currentDB);

    addAuditRecord(
      currentUserId,
      "System Manual Override",
      "Forced Preventive Maintenance",
      `Explicit diagnostic cycle initiated manually for ${asset.assetTag} (${asset.name}).`
    );
    triggerNotification(
      "all",
      "Manual Preventive Service Initiated",
      `Scheduled service ticket manually authorized for asset ${asset.assetTag}.`,
      "warning"
    );

    alert(`Successfully generated maintenance record and moved ${asset.assetTag} into Under Maintenance queue!`);
    refreshDb();
  };

  // Edit fields
  const [editStatus, setEditStatus] = useState<"Pending" | "In Progress" | "Completed" | "Cancelled">("In Progress");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  const isEditable = useMemo(() => {
    return userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  }, [userRole]);

  const handleRequestMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      alert("Please specify asset target.");
      return;
    }

    const currentDB = getDatabaseState();
    const assetObj = currentDB.assets.find(a => a.id === selectedAssetId);
    if (!assetObj) return;

    // Shift asset status to "Under Maintenance" on database
    assetObj.status = AssetStatus.UNDER_MAINTENANCE;

    const requestUser = currentDB.users.find(u => u.id === currentUserId);
    const requestName = requestUser ? requestUser.name : "Staff Employee";

    const nextMaint: MaintenanceRecord = {
      id: `m-rec-${Date.now()}`,
      assetId: selectedAssetId,
      requestBy: requestName,
      technician: technician || "Assigned on Diagnostic Review",
      serviceProvider: provider || "Corporate Internal Technical Support Hub",
      cost: parseFloat(cost) || 0,
      maintenanceDate: maintDate,
      notes,
      status: isEditable ? "In Progress" : "Pending"
    };

    currentDB.maintenance.unshift(nextMaint);
    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Maintenance Logged",
      `Initiated repair request for Asset Tag: ${assetObj.assetTag}. Status set to: Under Maintenance`
    );
    triggerNotification(
      "all",
      "Maintenance Request Triggered",
      `Repair schedule opened for asset tag ${assetObj.assetTag} - ${assetObj.name}.`,
      "warning"
    );

    setIsModalOpen(false);
    setSelectedAssetId("");
    setTechnician("");
    setProvider("");
    setCost("100");
    setNotes("");
    refreshDb();
  };

  const handleOpenEdit = (rec: MaintenanceRecord) => {
    setActiveMaintRecord(rec);
    setEditStatus(rec.status);
    setEditCost(rec.cost.toString());
    setEditNotes(rec.notes);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMaintRecord) return;

    const currentDB = getDatabaseState();
    const index = currentDB.maintenance.findIndex(m => m.id === activeMaintRecord.id);
    if (index === -1) return;

    // Update index properties
    const previousStatus = currentDB.maintenance[index].status;
    currentDB.maintenance[index].status = editStatus;
    currentDB.maintenance[index].cost = parseFloat(editCost) || 0;
    currentDB.maintenance[index].notes = editNotes;

    // Handle Completed release status
    if (editStatus === "Completed" && previousStatus !== "Completed") {
      currentDB.maintenance[index].completionDate = new Date().toISOString().split("T")[0];
      
      // Release asset back to Active pool!
      const assetIdx = currentDB.assets.findIndex(a => a.id === activeMaintRecord.assetId);
      if (assetIdx !== -1) {
        currentDB.assets[assetIdx].status = AssetStatus.ACTIVE;
        const assetObj = currentDB.assets[assetIdx];
        
        addAuditRecord(
          currentUserId,
          userRole,
          "Maintenance Completed",
          `Certified repairs concluded on Asset Tag: ${assetObj.assetTag}. released back as Active.`
        );
        triggerNotification(
          assetObj.assignedUserId || "all",
          "Maintenance Cycle Completed",
          `Equipment ${assetObj.assetTag} has successfully completed technician maintenance and is active.`,
          "success"
        );
      }
    } else if (editStatus === "Cancelled" && previousStatus !== "Cancelled") {
      // Release from maintenance lock back to active/damaged depending on initial State
      const assetIdx = currentDB.assets.findIndex(a => a.id === activeMaintRecord.assetId);
      if (assetIdx !== -1) {
        currentDB.assets[assetIdx].status = AssetStatus.ACTIVE;
      }
    }

    saveDatabaseState(currentDB);
    setIsEditModalOpen(false);
    refreshDb();
  };

  const totalCostExpen = useMemo(() => {
    return db.maintenance
      .filter(m => m.status === "Completed")
      .reduce((sum, current) => sum + current.cost, 0);
  }, [db.maintenance]);

  return (
    <div className="space-y-6">
      
      {/* Dynamic KPI statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Maint Queue counts</span>
          <h3 className="text-xl font-bold font-display text-slate-800">
            {db.maintenance.filter(m => m.status === "Pending" || m.status === "In Progress").length} Pending Repair cycles
          </h3>
        </div>
        <div className="md:border-l border-slate-100 md:pl-6">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Completed Service cycles</span>
          <h3 className="text-xl font-bold font-display text-emerald-600">
            {db.maintenance.filter(m => m.status === "Completed").length} Invoices finalized
          </h3>
        </div>
        <div className="md:border-l border-slate-100 md:pl-6">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Cumulative Maintenance Cost</span>
          <h3 className="text-xl font-bold font-display text-slate-900 font-mono">
            {formatCurrency(totalCostExpen)}
          </h3>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex flex-wrap border-b border-slate-100 bg-white p-1 rounded-xl shadow-xs gap-1.5 self-start">
        <button
          id="tab-maint-tickets"
          type="button"
          onClick={() => setActiveSubTab("tickets")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "tickets"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Wrench className="w-4 h-4" /> Active Repair Tickets ({db.maintenance.filter(m => m.status === "Pending" || m.status === "In Progress").length})
        </button>
        <button
          id="tab-maint-calendar"
          type="button"
          onClick={() => setActiveSubTab("calendar")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "calendar"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4" /> Interactive Service Calendar
        </button>
        <button
          id="tab-maint-schedules"
          type="button"
          onClick={() => setActiveSubTab("schedules")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "schedules"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4" /> Preventive Recurring Schedules
        </button>
        <button
          id="tab-maint-mtbf"
          type="button"
          onClick={() => setActiveSubTab("mtbf")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "mtbf"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Activity className="w-4 h-4" /> MTBF Reliability Diagnostics ({db.assets.length})
        </button>
      </div>

      {activeSubTab === "tickets" && (
        /* Main Container Section */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600 animate-pulse" /> Maintenance, Diagnostics & Repair center
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Submit hardware issue tickets, trace scheduled vendor contracts, and log invoice expenditures.
              </p>
            </div>
            
            <button
              onClick={() => {
                if (db.assets.length === 0) return;
                setSelectedAssetId(db.assets[0].id);
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Request Service / Log Issue
            </button>
          </div>

          {/* Data list list */}
          <div className="divide-y divide-slate-100 text-xs text-slate-600">
            {db.maintenance.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
                <p className="font-semibold text-slate-500">No maintenance records found.</p>
                {db.assets.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAssetId(db.assets[0].id);
                      setIsModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors mt-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Request Service / Log Issue
                  </button>
                )}
              </div>
            ) : (
              db.maintenance.map(m => {
                const asset = db.assets.find(a => a.id === m.assetId);
                return (
                  <div key={m.id} className="p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                          {asset ? asset.assetTag : "GPL-DEL"}
                        </span>
                        <span className={`text-[9px] font-bold px-2 rounded-full ${
                          m.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                          m.status === "In Progress" ? "bg-amber-100 text-amber-850" :
                          m.status === "Cancelled" ? "bg-slate-100 text-slate-500" :
                          "bg-blue-100 text-blue-800 animate-pulse"
                        }`}>
                          Status: {m.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-950 font-display text-[13px] truncate">
                        {asset ? asset.name : "System purged database record"}
                      </h4>

                      {/* Meta info grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-[11px] text-slate-500 font-medium pt-1">
                        <span>Service Vendor: <strong className="text-slate-700">{m.serviceProvider}</strong></span>
                        <span className="truncate">Technician Representative: {m.technician}</span>
                        <span>Initiated By: {m.requestBy}</span>
                      </div>

                      {m.notes && (
                        <p className="text-[11.5px] text-slate-500 bg-slate-50 border border-slate-100 italic py-2 px-3 rounded-lg max-w-xl">{m.notes}</p>
                      )}
                    </div>

                    {/* Pricing and Action tools */}
                    <div className="flex flex-row md:flex-col justify-between items-end gap-3.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right space-y-0.5">
                        <span className="text-[10px] text-slate-400 block font-mono">FINANCIAL INVOICE</span>
                        <strong className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(m.cost)}</strong>
                      </div>

                      {isEditable && m.status !== "Completed" && m.status !== "Cancelled" && (
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="bg-slate-900 text-white hover:bg-slate-800 font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                        >
                          Modify Lifecycle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeSubTab === "schedules" && (
        <div className="space-y-6">
          {/* Automated Scheduler Control Center Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 font-display flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600 animate-pulse" /> Automated Schedule Controller
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                The PM Scheduler engine automatically polls equipment records, routing overdue devices to diagnostics queues.
              </p>
            </div>
            {isEditable && (
              <button
                type="button"
                onClick={handleTriggerRoutineScan}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors shrink-0"
              >
                <Clock className="w-4 h-4" /> Trigger Routine PM Scan
              </button>
            )}
          </div>

          {/* Configuration Grid Panel - Predefined Intervals */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-sm font-semibold text-slate-900 font-display">
                Category Service Interval Standards Configuration
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Set predefined recurring service interval properties. Active rules are shared application-wide.
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {db.categories.map(category => {
                const isEditing = editingCategoryId === category.id;
                const assetsInCategoryCount = db.assets.filter(a => a.categoryId === category.id).length;

                return (
                  <div key={category.id} className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-bold">
                          {category.code}
                        </span>
                        <h5 className="font-semibold text-slate-900 mt-1 text-xs truncate max-w-[140px]" title={category.name}>
                          {category.name}
                        </h5>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {assetsInCategoryCount} assets
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">INTERVAL RULE</span>
                        {isEditing ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              className="w-16 bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-900 font-bold text-xs text-center focus:outline-none focus:border-slate-400"
                              value={editIntervalDays}
                              onChange={(e) => setEditIntervalDays(e.target.value)}
                            />
                            <span className="text-slate-500 text-[10px] font-mono">Days</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 font-mono text-xs block mt-0.5">
                            {category.serviceIntervalDays ? `${category.serviceIntervalDays} Days` : "No Schedule"}
                          </span>
                        )}
                      </div>

                      {isEditable && (
                        <div className="shrink-0">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateCategoryInterval(category.id, editIntervalDays)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded cursor-pointer text-[10px] font-bold px-1.5"
                                title="Save standard"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1 rounded cursor-pointer text-[10px] font-bold px-1.5"
                                title="Cancel"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditIntervalDays(category.serviceIntervalDays?.toString() || "90");
                              }}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 hover:underline cursor-pointer"
                            >
                              Edit Interval
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forecasting Overview & Live Asset Status Tracker */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 font-display">
                  Preventive Maintenance Forecasts & Status Tracking
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time due status calculations for active equipment matching defined category intervals.
                </p>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Active Tracker: Live
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs text-slate-600">
              {db.assets.filter(asset => {
                const cat = db.categories.find(c => c.id === asset.categoryId);
                return cat && cat.serviceIntervalDays && cat.serviceIntervalDays > 0;
              }).length === 0 ? (
                <p className="p-10 text-center text-slate-400 font-medium font-display">
                  No assets found in categories configured for recurring service schedules.
                </p>
              ) : (
                db.assets
                  .filter(asset => {
                    const cat = db.categories.find(c => c.id === asset.categoryId);
                    return cat && cat.serviceIntervalDays && cat.serviceIntervalDays > 0;
                  })
                  .map(asset => {
                    const category = db.categories.find(c => c.id === asset.categoryId)!;
                    
                    // Historical completes for this asset
                    const completedRecords = db.maintenance.filter(m => m.assetId === asset.id && m.status === "Completed");
                    
                    // Reference starting date string
                    let lastServiceDateStr = asset.purchaseDate;
                    let lastServiceType = "Purchase Date Asset Seed";
                    
                    if (completedRecords.length > 0) {
                      const sorted = [...completedRecords].sort((a, b) => {
                        const d1 = new Date(a.completionDate || a.maintenanceDate).getTime();
                        const d2 = new Date(b.completionDate || b.maintenanceDate).getTime();
                        return d2 - d1;
                      });
                      lastServiceDateStr = sorted[0].completionDate || sorted[0].maintenanceDate;
                      lastServiceType = "Certified Service Release";
                    }

                    const lastServiceDateObj = new Date(lastServiceDateStr);
                    const intervalDays = category.serviceIntervalDays || 90;
                    const nextDueDateObj = new Date(lastServiceDateObj.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
                    
                    // Computes days remaining
                    const differenceMs = nextDueDateObj.getTime() - new Date().getTime();
                    const daysRemaining = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
                    const isOverdue = daysRemaining <= 0;
                    const isDueSoon = daysRemaining > 0 && daysRemaining <= 14;

                    return (
                      <div key={asset.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                        
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                              {asset.assetTag}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                              {category.name} ({category.serviceIntervalDays} days cycle)
                            </span>
                            
                            {/* Health badge representation */}
                            {asset.status === AssetStatus.UNDER_MAINTENANCE ? (
                              <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" /> Service Queue Active
                              </span>
                            ) : isOverdue ? (
                              <span className="bg-rose-100 border border-rose-300 text-rose-700 text-[10px] font-extrabold px-2 rounded-full animate-pulse flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Overdue
                              </span>
                            ) : isDueSoon ? (
                              <span className="bg-amber-55 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 rounded-full border border-amber-200">
                                Due Soon
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 rounded-full border border-emerald-200">
                                Conforming
                              </span>
                            )}
                          </div>

                          <h5 className="font-bold text-slate-900 font-display text-[13px] truncate">
                            {asset.name}
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-1.5 gap-x-4 text-[10.5px] text-slate-530 text-slate-500 font-mono">
                            <div>Purchased on: <strong className="text-slate-700">{asset.purchaseDate}</strong></div>
                            <div>Last Cleared: <strong className="text-slate-700" title={lastServiceType}>{lastServiceDateStr}</strong></div>
                            <div>Next Due Date: <strong className={isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}>{nextDueDateObj.toISOString().split("T")[0]}</strong></div>
                            <div>Cycle Remainder: <strong className={isOverdue ? "text-rose-600 font-extrabold" : "text-slate-705 text-slate-705 font-bold"}>{isOverdue ? `Overdue by ${Math.abs(daysRemaining)} Days` : `${daysRemaining} Days`}</strong></div>
                          </div>
                        </div>

                        {/* Force service buttons */}
                        <div className="shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex items-center gap-2">
                          {asset.status !== AssetStatus.UNDER_MAINTENANCE ? (
                            isEditable ? (
                              <button
                                type="button"
                                onClick={() => handleForcePreventiveMaint(asset)}
                                className={`font-bold text-[10.5px] px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors ${
                                  isOverdue 
                                    ? "bg-rose-650 bg-rose-600 text-white hover:bg-rose-500" 
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                                }`}
                              >
                                Force Preventive Cycle
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No override permission</span>
                            )
                          ) : (
                            <span className="text-[11px] text-amber-600 font-bold bg-amber-50 rounded px-2.5 py-1">Under Maintenance Lock</span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "mtbf" && (
        <div className="space-y-6">
          {/* Welcome Alert banner explaining MTBF and pre-emptive triggers */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full inline-block">
                Predictive Maintenance System Active
              </span>
              <h3 className="text-lg font-bold font-display flex items-center gap-1.5 text-white">
                <Activity className="w-5 h-5 text-emerald-400" /> MTBF & Expected Cycle Diagnostics
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mean Time Between Failures (MTBF) measures the average elapsed operational duration between completed repair interventions. The AI Studio platform monitors cumulative service cycles, triggering preemptive alerts when an asset exceeds or closes within 85% of its expected service threshold.
              </p>
            </div>
            <div className="flex gap-2.5 bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/15">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-200 font-mono">
                <div className="font-bold text-white uppercase tracking-wider text-[9px] mb-1">Preemptive Thresholds</div>
                <div>Exceeded: Immediate Alert</div>
                <div>&gt;85% Cycle: Early Alarm</div>
              </div>
            </div>
          </div>

          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Average System MTBF</span>
                  <p className="text-2xl font-bold font-display text-slate-900">
                    {(() => {
                      const computedList = db.assets.map(a => calculateAssetMTBF(a.id, db)).filter(r => r.mtbfDays !== null);
                      if (computedList.length === 0) return "N/A (No failures)";
                      const totalSum = computedList.reduce((sum, item) => sum + (item.mtbfDays || 0), 0);
                      return `${(totalSum / computedList.length).toFixed(1)} Days`;
                    })()}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-normal">
                Mean time duration elapsed between service cycles across failing equipment.
              </p>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Audited Failure Events</span>
                  <p className="text-2xl font-bold font-display text-slate-900">
                    {db.maintenance.filter(m => m.status === "Completed").length} Occurrences
                  </p>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-normal">
                Total completed corrective/scheduled technical orders logged system-wide.
              </p>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Preemptive Alerts Overdue</span>
                  <p className="text-2xl font-bold font-display text-rose-600">
                    {(() => {
                      let count = 0;
                      db.assets.forEach(asset => {
                        const category = db.categories.find(c => c.id === asset.categoryId);
                        if (!category || !category.serviceIntervalDays || category.serviceIntervalDays <= 0) return;
                        
                        const completedRecords = db.maintenance.filter(m => m.assetId === asset.id && m.status === "Completed");
                        let lastServiceDateStr = asset.purchaseDate;
                        if (completedRecords.length > 0) {
                          const sorted = [...completedRecords].sort((a, b) => {
                            const d1 = new Date(a.completionDate || a.maintenanceDate).getTime();
                            const d2 = new Date(b.completionDate || b.maintenanceDate).getTime();
                            return d2 - d1;
                          });
                          lastServiceDateStr = sorted[0].completionDate || sorted[0].maintenanceDate;
                        }
                        const elapsedMs = Date.now() - new Date(lastServiceDateStr).getTime();
                        const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
                        if (elapsedDays >= category.serviceIntervalDays) {
                          count++;
                        }
                      });
                      return `${count} Overdue`;
                    })()}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-normal">
                Equipments that currently exceed their expected category routine service cycle.
              </p>
            </div>
          </div>

          {/* Main Equipment MTBF Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 font-display">
                  Corporate Asset Reliability & Core Failure Diagnostics
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual overview of Mean Time Between Failure statistics and current preemptive warning clearances.
                </p>
              </div>

              {isEditable && (
                <button
                  type="button"
                  onClick={() => {
                    // trigger scan manually to trigger preemptive notifications
                    const pmRes = checkAndAutoTriggerMaintenance();
                    alert(`Reliability scan executed successfully! Triggered ${pmRes.triggeredCount} automated queue schedules. Preemptive warnings dispatched.`);
                    setDb(getDatabaseState());
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Activity className="w-4 h-4" /> Run Reliability Audit Scan
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <th className="py-3 px-4">Asset Code / Tag</th>
                    <th className="py-3 px-4">Name / Category</th>
                    <th className="py-3 px-4 text-center">Failure Incidents</th>
                    <th className="py-3 px-4 text-center">Calculated MTBF</th>
                    <th className="py-3 px-4 text-center">Expected Interval</th>
                    <th className="py-3 px-4 text-center">Days Elapsed</th>
                    <th className="py-3 px-4 text-center">Status / Warning</th>
                    <th className="py-3 px-4 text-right">Rapid Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.assets.map(asset => {
                    const category = db.categories.find(c => c.id === asset.categoryId);
                    const { mtbfDays, totalFailures, ageInDays } = calculateAssetMTBF(asset.id, db);
                    
                    // Determine elapsed days since last service
                    const completedRecords = db.maintenance.filter(m => m.assetId === asset.id && m.status === "Completed");
                    let lastServiceDateStr = asset.purchaseDate;
                    if (completedRecords.length > 0) {
                      const sorted = [...completedRecords].sort((a, b) => {
                        const d1 = new Date(a.completionDate || a.maintenanceDate).getTime();
                        const d2 = new Date(b.completionDate || b.maintenanceDate).getTime();
                        return d2 - d1;
                      });
                      lastServiceDateStr = sorted[0].completionDate || sorted[0].maintenanceDate;
                    }

                    const lastServiceDate = new Date(lastServiceDateStr);
                    const elapsedMs = Date.now() - lastServiceDate.getTime();
                    const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
                    const expectedDays = category?.serviceIntervalDays || 90;

                    const isOverdue = elapsedDays >= expectedDays;
                    const isPreemptiveWarning = elapsedDays >= expectedDays * 0.85 && elapsedDays < expectedDays;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {asset.assetTag}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{asset.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{category?.name || "Corporate Hardware"}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {totalFailures} {totalFailures === 1 ? "Incident" : "Incidents"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {mtbfDays !== null ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-100">
                              {mtbfDays} Days
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic text-[11px]" title={`Running clean for ${ageInDays} days`}>
                              {ageInDays}d Clean Run
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                          {expectedDays} Days
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          <span className={isOverdue ? "text-rose-600" : isPreemptiveWarning ? "text-amber-600 animate-pulse" : "text-slate-750"}>
                            {elapsedDays} Days
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {asset.status === AssetStatus.UNDER_MAINTENANCE ? (
                            <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold py-0.5 px-2 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span> Servicing
                            </span>
                          ) : isOverdue ? (
                            <span className="bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold py-0.5 px-2.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Overdue Alert
                            </span>
                          ) : isPreemptiveWarning ? (
                            <span className="bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-bold py-0.5 px-2 rounded-full inline-flex items-center gap-1 animate-pulse" title="Exceeding threshold alert soon (elapsed past 85% interval!)">
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Near Interval
                            </span>
                          ) : (
                            <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold py-0.5 px-2 rounded-full inline-flex">
                              Conforming
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {asset.status !== AssetStatus.UNDER_MAINTENANCE ? (
                            isEditable ? (
                              <button
                                type="button"
                                onClick={() => handleForcePreventiveMaint(asset)}
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors ${
                                  isOverdue 
                                    ? "bg-rose-605 bg-rose-600 text-white hover:bg-rose-500" 
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                                }`}
                              >
                                {isOverdue ? "Resolve Overdue" : "Preempt PM"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No permission</span>
                            )
                          ) : (
                            <span className="text-[10.5px] font-semibold text-amber-600 bg-amber-50 rounded py-1 px-2">Locked queue</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "calendar" && (
        <MaintenanceCalendar
          userRole={userRole}
          currentUserId={currentUserId}
          onStateChange={refreshDb}
        />
      )}

      {/* Log Issue Popup form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="bg-slate-900 text-white p-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-display font-semibold">Initiate Maintenance / Diagnostics</h3>
              <p className="text-[10px] text-slate-300">Flags physical asset on register index as Under Maintenance.</p>
            </div>

            <form onSubmit={handleRequestMaintenance} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Select Target Fixed Asset *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {db.assets.filter(a => a.status === "Active" || a.status === "Damaged").map(ast => (
                    <option key={ast.id} value={ast.id}>{ast.assetTag} - {ast.name} (Condition: {ast.condition})</option>
                  ))}
                </select>
              </div>

              {isEditable && (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 font-display">Technician Specialist Representative</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe Tech"
                      value={technician}
                      onChange={(e) => setTechnician(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 font-display font-mono">Service Provider Company</label>
                    <input
                      type="text"
                      placeholder="e.g. General Hardware Corp"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 font-mono">Repair Invoice Cost (MWK)</label>
                    <input
                      type="number"
                      required
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Checkout Date *</label>
                <input
                  type="date"
                  required
                  value={maintDate}
                  onChange={(e) => setMaintDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Fault Descriptions / Diagnostics Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Clearly detail symptoms observed e.g. laser cut calibration errors..."
                  value={notes}
                  required
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-semibold cursor-pointer"
                >
                  Submit Service Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify Ongoing Service Modal popup */}
      {isEditModalOpen && activeMaintRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="bg-slate-900 text-white p-5">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-display font-semibold">Update Service Task</h3>
              <p className="text-[10px] text-slate-300">Invoice: {activeMaintRecord.id}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Service Task Status *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed (Auto unlocks asset)</option>
                  <option value="Cancelled">Cancelled request</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-mono">Invoice Final Cost (MWK)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 pl-8 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Add completion/progress report summaries</label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl -mx-6 -mb-6 mt-4 font-semibold">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 text-white px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Confirm Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
