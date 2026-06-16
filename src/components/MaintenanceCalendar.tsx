/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Wrench,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
  Info,
  Play,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Asset, MaintenanceRecord, AssetStatus, Category } from "../types";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, subscribeToDatabaseState } from "../db";

interface MaintenanceCalendarProps {
  userRole: string;
  currentUserId: string;
  onStateChange?: () => void;
}

interface CalendarEvent {
  id: string;
  type: "past_completed" | "ongoing" | "forecast_conforming" | "forecast_due" | "forecast_overdue";
  date: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  assetTag: string;
  assetId: string;
  cost?: number;
  statusText: string;
  notes?: string;
  technician?: string;
  provider?: string;
  rawRecord?: MaintenanceRecord;
  rawAsset?: Asset;
  rawCategory?: Category;
}

export default function MaintenanceCalendar({ userRole, currentUserId, onStateChange }: MaintenanceCalendarProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date();
  });
  
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "past" | "ongoing" | "forecast" | "alerts">("all");

  const refreshComponentDb = () => {
    setDb(getDatabaseState());
    if (onStateChange) onStateChange();
  };

  React.useEffect(() => {
    return subscribeToDatabaseState(refreshComponentDb);
  }, []);

  // Extract events across the system
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    // 1. Existing logged maintenance records
    db.maintenance.forEach(m => {
      const asset = db.assets.find(a => a.id === m.assetId);
      const category = asset ? db.categories.find(c => c.id === asset.categoryId) : undefined;
      const assetTag = asset ? asset.assetTag : "N/A";
      const assetName = asset ? asset.name : "Purged Asset";
      
      const isCompleted = m.status === "Completed";
      const isCancelled = m.status === "Cancelled";
      const dateKey = m.maintenanceDate; // Uses scheduled date

      if (isCancelled) return; // Skip cancelled on calendar to avoid noise

      list.push({
        id: `ticket-${m.id}`,
        type: isCompleted ? "past_completed" : "ongoing",
        date: dateKey,
        title: `${isCompleted ? "Completed" : "Active"} Service: ${assetName}`,
        subtitle: `${m.serviceProvider} - ${m.technician || "No Tech Assigned"}`,
        assetTag,
        assetId: m.assetId,
        cost: m.cost,
        statusText: m.status,
        notes: m.notes,
        technician: m.technician,
        provider: m.serviceProvider,
        rawRecord: m,
        rawAsset: asset
      });
    });

    // 2. Computed future forecasts of Preventive Maintenance schedules
    db.assets.forEach(asset => {
      const category = db.categories.find(c => c.id === asset.categoryId);
      if (!category || !category.serviceIntervalDays || category.serviceIntervalDays <= 0) return;

      // Find final completed maintenance for this asset to determine baseline date
      const completedRecords = db.maintenance.filter(m => m.assetId === asset.id && m.status === "Completed");
      
      let baseDateStr = asset.purchaseDate;
      if (completedRecords.length > 0) {
        const sorted = [...completedRecords].sort((a, b) => {
          const d1 = new Date(a.completionDate || a.maintenanceDate).getTime();
          const d2 = new Date(b.completionDate || b.maintenanceDate).getTime();
          return d2 - d1;
        });
        baseDateStr = sorted[0].completionDate || sorted[0].maintenanceDate;
      }

      const baseDate = new Date(baseDateStr);
      const intervalDays = category.serviceIntervalDays;
      const nextDueMs = baseDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000);
      const nextDueDateObj = new Date(nextDueMs);
      const nextDueDateStr = nextDueDateObj.toISOString().split("T")[0];

      // Computes days remaining
      const differenceMs = nextDueMs - Date.now();
      const daysRemaining = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
      
      let type: "forecast_conforming" | "forecast_due" | "forecast_overdue" = "forecast_conforming";
      let statusText = "Conforming";

      if (daysRemaining <= 0) {
        type = "forecast_overdue";
        statusText = `Overdue by ${Math.abs(daysRemaining)} Days`;
      } else if (daysRemaining <= 14) {
        type = "forecast_due";
        statusText = `Due in ${daysRemaining} Days`;
      } else {
        statusText = `Due in ${daysRemaining} Days`;
      }

      list.push({
        id: `forecast-${asset.id}`,
        type,
        date: nextDueDateStr,
        title: `PM Due: ${asset.name}`,
        subtitle: `Recurring interval schedule (${category.name}) every ${intervalDays} days.`,
        assetTag: asset.assetTag,
        assetId: asset.id,
        statusText,
        notes: `Automatically calculated forecast based on last service completion date: ${baseDateStr}.`,
        rawAsset: asset,
        rawCategory: category
      });
    });

    return list;
  }, [db.assets, db.maintenance, db.categories]);

  // Filter & Search events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      // 1. Search term match
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesQuery = 
          e.title.toLowerCase().includes(query) ||
          e.subtitle.toLowerCase().includes(query) ||
          e.assetTag.toLowerCase().includes(query) ||
          (e.notes && e.notes.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // 2. Tab Filter match
      if (filterType === "past") {
        return e.type === "past_completed";
      }
      if (filterType === "ongoing") {
        return e.type === "ongoing";
      }
      if (filterType === "forecast") {
        return e.type.startsWith("forecast_");
      }
      if (filterType === "alerts") {
        return e.type === "forecast_overdue" || e.type === "forecast_due";
      }

      return true;
    });
  }, [allEvents, searchTerm, filterType]);

  // Helper properties for monthly calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calculations for dates displayed in current month's grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1 etc.
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    
    // Previous month filler cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, prevDay);
      const dateStr = prevDate.toISOString().split("T")[0];
      cells.push({
        date: dateStr,
        dayNum: prevDay,
        isCurrentMonth: false,
        dayOfWeek: prevDate.getDay()
      });
    }

    // Current month cells
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      const dateStr = currDate.toISOString().split("T")[0];
      cells.push({
        date: dateStr,
        dayNum: i,
        isCurrentMonth: true,
        dayOfWeek: currDate.getDay()
      });
    }

    // Next month filler cells to make 42 items (6 rows)
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split("T")[0];
      cells.push({
        date: dateStr,
        dayNum: i,
        isCurrentMonth: false,
        dayOfWeek: nextDate.getDay()
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDayIndex, daysInPrevMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split("T")[0]);
  };

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(e => {
      if (!map[e.date]) {
        map[e.date] = [];
      }
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Selected date's events list
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [eventsByDate, selectedDateStr]);

  // Helper to color visual pills on calendar
  const getEventBadgeColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "past_completed":
        return "bg-emerald-500 text-white";
      case "ongoing":
        return "bg-indigo-600 text-white";
      case "forecast_overdue":
        return "bg-rose-600 text-white animate-pulse";
      case "forecast_due":
        return "bg-amber-500 text-slate-950";
      case "forecast_conforming":
        return "bg-emerald-400 text-slate-950";
      default:
        return "bg-slate-400 text-white";
    }
  };

  const getEventBorderClass = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "past_completed":
        return "border-l-4 border-emerald-500";
      case "ongoing":
        return "border-l-4 border-indigo-600";
      case "forecast_overdue":
        return "border-l-4 border-rose-600";
      case "forecast_due":
        return "border-l-4 border-amber-500";
      case "forecast_conforming":
        return "border-l-4 border-emerald-400";
      default:
        return "border-l-4 border-slate-300";
    }
  };

  // Force preventive cycle manually from selected calendar event
  const executeForcedCycleOnAsset = (asset: Asset) => {
    const currentDB = getDatabaseState();
    
    // Build diagnostic ticket
    const nextMaint: MaintenanceRecord = {
      id: `m-rec-calendar-${asset.id}-${Date.now()}`,
      assetId: asset.id,
      requestBy: "Calendar Quick Trigger",
      technician: "Contract Specialist Team",
      serviceProvider: "Corporate Technical Logistics",
      cost: 0,
      maintenanceDate: new Date().toISOString().split("T")[0],
      notes: `[Forced PM Cycle] Preventive maintenance manually scheduled directly via the interactive Maintenance Calendar view.`,
      status: "In Progress"
    };

    const assetIdx = currentDB.assets.findIndex(a => a.id === asset.id);
    if (assetIdx !== -1) {
      currentDB.assets[assetIdx].status = AssetStatus.UNDER_MAINTENANCE;
    }

    currentDB.maintenance.unshift(nextMaint);
    saveDatabaseState(currentDB);

    addAuditRecord(
      currentUserId,
      "Calendar Controller",
      "Manual Preventive Service Block",
      `Scheduled urgent PM service cycle directly from Calendar interface for equipment ${asset.assetTag} (${asset.name}).`
    );

    triggerNotification(
      "all",
      "Maintenance Ticket Spawned",
      `Urgent service check sheet spawned for physical asset tag ${asset.assetTag}.`,
      "info"
    );

    alert(`Routine diagnostics ticket generated! Asset ${asset.assetTag} was moved to active Under Maintenance index.`);
    refreshComponentDb();
  };

  return (
    <div className="space-y-6">
      
      {/* Calendar Header with Controls & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" /> Equipment Maintenance Timeline Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic calendar visualizing upcoming service schedules, warranty timelines, and historic repair invoice events.
          </p>
        </div>

        {/* Quick Filter Legend details */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
            <span>Completed ({allEvents.filter(e => e.type === "past_completed").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full inline-block"></span>
            <span>Active Ticket ({allEvents.filter(e => e.type === "ongoing").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span>
            <span>Due Soon Forecast ({allEvents.filter(e => e.type === "forecast_due").length})</span>
          </div>
          <div className="flex items-center gap-1.5 animate-pulse">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full inline-block"></span>
            <span>Overdue Limit ({allEvents.filter(e => e.type === "forecast_overdue").length})</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold font-display text-slate-800 text-sm px-2 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGoToToday}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg cursor-pointer transition-colors border border-emerald-100 text-[11px]"
          >
            Go to Today
          </button>
        </div>

        {/* Tab Selection Filter */}
        <div className="flex flex-wrap items-center gap-1 w-full md:w-auto justify-center">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterType === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilterType("past")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterType === "past" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterType("ongoing")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterType === "ongoing" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Ongoing
          </button>
          <button
            onClick={() => setFilterType("forecast")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterType === "forecast" ? "bg-amber-600 text-slate-950" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            PM Forecasts
          </button>
          <button
            onClick={() => setFilterType("alerts")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterType === "alerts" ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Alerts / Warnings
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search asset, tag, ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Calendar layout and Details Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Monthly Calendar Grid (Span 8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          
          {/* Days of week titles */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Day Grid (42 cells) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-100 bg-slate-100 text-slate-700">
            {calendarCells.map((cell, idx) => {
              const dayEvents = eventsByDate[cell.date] || [];
              const isSelected = cell.date === selectedDateStr;
              
              // Baseline date 2026-06-09
              const isToday = cell.date === "2026-06-09";

              return (
                <div
                  key={`${cell.date}-${idx}`}
                  onClick={() => setSelectedDateStr(cell.date)}
                  className={`bg-white min-h-[90px] p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-50/70 select-none relative group ${
                    !cell.isCurrentMonth ? "text-slate-300 opacity-60" : "text-slate-800"
                  } ${isSelected ? "ring-2 ring-emerald-500 ring-inset bg-emerald-50/20 z-10" : ""}`}
                >
                  {/* Top cell header: Day number and Today badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md ${
                      isToday 
                        ? "bg-rose-500 text-white font-extrabold" 
                        : isSelected
                        ? "text-emerald-700 bg-emerald-50 font-extrabold"
                        : "text-slate-700"
                    }`}>
                      {cell.dayNum}
                    </span>
                    
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                        {dayEvents.length} {dayEvents.length === 1 ? "Evt" : "Evts"}
                      </span>
                    )}
                  </div>

                  {/* Visual Preview Events List inside Cell */}
                  <div className="mt-1.5 flex flex-col gap-0.5 max-h-[50px] overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={`text-[8.5px] font-bold font-mono truncate px-1 rounded-sm py-0.5 flex items-center justify-start gap-1 ${getEventBadgeColor(evt.type)}`}
                        title={`${evt.title}\n${evt.statusText}`}
                      >
                        <span className="shrink-0 text-[8px]">
                          {evt.type === "past_completed" ? "✓" : evt.type === "ongoing" ? "⚙" : "⚠"}
                        </span>
                        <span className="truncate">{evt.assetTag}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[7.5px] font-extrabold text-slate-400 text-center">
                        + {dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Interactions: Click on any day cell to preview specific maintenance schedules.</span>
            <span>GIANT PLUS SYSTEMS CORP</span>
          </div>
        </div>

        {/* Workspace Sidebar Details (Span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          
          {/* Header of details tab */}
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Schedules for {new Date(selectedDateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </h3>
              <p className="text-[10px] text-slate-400">
                Selected date index: <strong className="font-mono text-slate-600">{selectedDateStr}</strong>
              </p>
            </div>
            {selectedDateStr === "2026-06-09" && (
              <span className="bg-rose-500 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                Today
              </span>
            )}
          </div>

          {/* Events breakdown */}
          <div className="space-y-3.5 pr-0.5 max-h-[385px] overflow-y-auto">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No maintenance tasks scheduled or logged for this calendar date.</p>
                <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto">
                  Click surrounding cell numbers to find forecast dates or invoice history files.
                </p>
              </div>
            ) : (
              selectedDayEvents.map((evt) => {
                const isRecurringForecast = evt.type.startsWith("forecast_");
                const hasAsset = !!evt.rawAsset;

                return (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between gap-3 text-xs shadow-3xs transition-all hover:shadow-xs bg-slate-50/20 ${getEventBorderClass(evt.type)}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-slate-900 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">
                          {evt.assetTag}
                        </span>
                        
                        <span className={`text-[8.5px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                          evt.type === "past_completed" ? "bg-emerald-100 text-emerald-800" :
                          evt.type === "ongoing" ? "bg-indigo-100 text-indigo-800 animate-pulse" :
                          evt.type === "forecast_overdue" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {evt.statusText}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 leading-tight font-display text-[12px] pt-1">
                        {evt.title}
                      </h4>
                      
                      <p className="text-[11px] text-slate-500 font-medium">
                        {evt.subtitle}
                      </p>

                      {evt.notes && (
                        <p className="text-[11px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-100 mt-1 max-h-[80px] overflow-y-auto">
                          "{evt.notes}"
                        </p>
                      )}
                    </div>

                    {/* Metadata Footer bar with details */}
                    <div className="border-t border-slate-100/80 pt-2.5 flex items-center justify-between mt-1 text-[10.5px]">
                      
                      {/* Price indicator if past invoice */}
                      {!isRecurringForecast && evt.cost !== undefined ? (
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider block">INVOICE VALUE</span>
                          <strong className="text-slate-800 font-mono font-bold text-xs">${evt.cost.toFixed(2)}</strong>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider block">NEXT SCHEDULE</span>
                          <strong className="text-amber-800 font-bold block text-[10.5px]">Recurring Diagnostic Check</strong>
                        </div>
                      )}

                      {/* Immediate action buttons context */}
                      {isRecurringForecast && hasAsset && userRole !== "Auditor" && (
                        <button
                          type="button"
                          onClick={() => executeForcedCycleOnAsset(evt.rawAsset!)}
                          className="bg-slate-905 bg-slate-900 text-white hover:bg-emerald-600 font-bold text-[9.5px] py-1 px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          title="Generate a ticket manually and route to technicians"
                        >
                          <Play className="w-2.5 h-2.5" /> Dispatch Urgent PM
                        </button>
                      )}

                      {!isRecurringForecast && evt.rawRecord && userRole !== "Auditor" && (
                        <span className="text-[9.5px] text-slate-400 font-medium italic flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Recorded Ticket
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Informative Section */}
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs flex gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-indigo-800 leading-normal">
              <strong className="font-semibold text-indigo-900 block mb-0.5">Proactive Schedule Engine</strong>
              The visual timeline monitors overdue indices based on historical service releases. Forcing an urgent PM automatically restarts the countdown loop.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
