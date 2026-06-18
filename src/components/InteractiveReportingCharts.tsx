/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as d3 from "d3";
import { TrendingUp, Activity, DollarSign, Wrench, LayoutGrid, CheckCircle, MapPin, Sparkles } from "lucide-react";
import { Asset, MaintenanceRecord, AssetStatus } from "../types";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { getDatabaseState, formatCurrency } from "../db";

interface InteractiveReportingChartsProps {
  assets: Asset[];
  maintenance: MaintenanceRecord[];
}

interface MonthData {
  key: string;       // "YYYY-MM"
  label: string;     // "Mmm 'YY"
  acquisitionCost: number;
  bookValue: number;
  maintenanceCost: number;
}

export default function InteractiveReportingCharts({ assets, maintenance }: InteractiveReportingChartsProps) {
  const [activeTab, setActiveTab] = useState<"depreciation" | "maintenance" | "distribution" | "heatmap">("depreciation");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<"density" | "verification">("density");
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ departmentId: string; locationId: string } | null>(null);

  // Helper to calculate asset remaining book value consistent with depreciation curves
  const getAssetFinancials = (asset: Asset) => {
    const parts = (asset.purchaseDate || new Date().toISOString().slice(0, 10)).split("-");
    const pYear = parseInt(parts[0], 10) || new Date().getFullYear();
    const pMonth = parseInt(parts[1], 10) || 1;
    const purchaseBookVal = pYear * 12 + (pMonth - 1);

    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth(); // 0-indexed: matches how we compute purchaseBookVal
    const targetTotalVal = targetYear * 12 + targetMonth;

    const elapsedMonths = Math.max(0, targetTotalVal - purchaseBookVal);
    const depreciationRate = Math.min(0.75, elapsedMonths * 0.015);
    
    const originalCost = asset.purchaseCost;
    const currentBookValue = originalCost * (1 - depreciationRate);
    const accumulatedDepreciation = originalCost - currentBookValue;

    return {
      original: originalCost,
      bookValue: currentBookValue,
      depreciation: accumulatedDepreciation,
      depreciationRate: depreciationRate * 100
    };
  };

  const STATUS_COLORS: Record<string, string> = {
    "Active": "#10b981",
    "Under Maintenance": "#f59e0b",
    "Damaged": "#ef4444",
    "Lost": "#64748b",
    "Disposed": "#a855f7"
  };

  const lifecycleData = useMemo(() => {
    const counts: Record<string, number> = {
      "Active": 0,
      "Under Maintenance": 0,
      "Damaged": 0,
      "Lost": 0,
      "Disposed": 0
    };

    assets.forEach((asset) => {
      const s = asset.status || "Active";
      if (s in counts) {
        counts[s]++;
      } else {
        counts["Active"]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    })).filter(x => x.value > 0);
  }, [assets]);

  const categoryDepreciationData = useMemo(() => {
    const db = getDatabaseState();
    const categoryMap: Record<string, { name: string; bookValue: number; depreciation: number; original: number }> = {};

    db.categories.forEach(cat => {
      categoryMap[cat.id] = {
        name: cat.name,
        bookValue: 0,
        depreciation: 0,
        original: 0
      };
    });

    assets.forEach(asset => {
      const catId = asset.categoryId;
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          name: "Other/Unassigned",
          bookValue: 0,
          depreciation: 0,
          original: 0
        };
      }

      const fins = getAssetFinancials(asset);
      categoryMap[catId].original += fins.original;
      categoryMap[catId].bookValue += fins.bookValue;
      categoryMap[catId].depreciation += fins.depreciation;
    });

    return Object.values(categoryMap).filter(cat => cat.original > 0);
  }, [assets]);

  const heatmapGridData = useMemo(() => {
    const dbState = getDatabaseState();
    const depts = dbState.departments || [];
    const locs = dbState.locations || [];
    const verifs = dbState.verifications || [];

    // Map of assetId to verification records
    const assetVerifMap = new Map<string, typeof verifs[0]>();
    verifs.forEach(v => {
      const existing = assetVerifMap.get(v.assetId);
      if (!existing || v.verificationDate > existing.verificationDate) {
        assetVerifMap.set(v.assetId, v);
      }
    });

    return depts.map(dept => {
      const locData = locs.map(loc => {
        const cellAssets = assets.filter(a => a.departmentId === dept.id && a.locationId === loc.id);
        const count = cellAssets.length;
        const totalValue = cellAssets.reduce((sum, a) => sum + a.purchaseCost, 0);
        
        const verifiedAssets = cellAssets.filter(a => assetVerifMap.has(a.id));
        const verifiedCount = verifiedAssets.length;
        const verificationRatio = count > 0 ? verifiedCount / count : 0;

        return {
          locationId: loc.id,
          locationName: loc.name,
          locationCode: loc.code,
          assets: cellAssets,
          count,
          totalValue,
          verifiedCount,
          verificationRatio
        };
      });

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        locations: locData
      };
    });
  }, [assets]);

  const activeHeatmapCell = useMemo(() => {
    if (!selectedHeatmapCell) return null;
    const dept = heatmapGridData.find(d => d.departmentId === selectedHeatmapCell.departmentId);
    if (!dept) return null;
    const loc = dept.locations.find(l => l.locationId === selectedHeatmapCell.locationId);
    if (!loc) return null;
    return {
      departmentId: dept.departmentId,
      departmentName: dept.departmentName,
      departmentCode: dept.departmentCode,
      ...loc
    };
  }, [selectedHeatmapCell, heatmapGridData]);

  // Time Series calculation: Rolling 12-month window ending at current month
  const chartData = useMemo<MonthData[]>(() => {
    const months: MonthData[] = [];
    const now = new Date();
    // Start 11 months ago so current month is always the last column
    const endYear = now.getFullYear();
    const endMonth = now.getMonth(); // 0-indexed
    const endTotalMonths = endYear * 12 + endMonth;
    const startTotalMonths = endTotalMonths - 11; // 12 months window

    for (let i = 0; i < 12; i++) {
      const totalMonthCount = startTotalMonths + i;
      const year = Math.floor(totalMonthCount / 12);
      const mNum = (totalMonthCount % 12) + 1;
      const key = `${year}-${String(mNum).padStart(2, "0")}`;

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[mNum - 1]} '${String(year).substring(2)}`;

      months.push({
        key,
        label,
        acquisitionCost: 0,
        bookValue: 0,
        maintenanceCost: 0
      });
    }

    // Populate Acquisition and Depreciation Values
    assets.forEach((asset) => {
      // Split YYYY-MM-DD
      const parts = (asset.purchaseDate || "2026-01-01").split("-");
      const pYear = parseInt(parts[0], 10) || 2026;
      const pMonth = parseInt(parts[1], 10) || 1;
      const purchaseTotalVal = pYear * 12 + (pMonth - 1);

      months.forEach((m) => {
        const mParts = m.key.split("-");
        const mYear = parseInt(mParts[0], 10);
        const mMonth = parseInt(mParts[1], 10);
        const currentTotalVal = mYear * 12 + (mMonth - 1);

        if (purchaseTotalVal <= currentTotalVal) {
          // Asset acquired on or before this time step
          m.acquisitionCost += asset.purchaseCost;

          // Depreciation: straight-line estimation of 1.5% book value decrement each month,
          // capping maximum depreciation rate at 75% for basic salvage value
          const elapsedMonths = currentTotalVal - purchaseTotalVal;
          const depreciationRate = Math.min(0.75, elapsedMonths * 0.015);
          m.bookValue += asset.purchaseCost * (1 - depreciationRate);
        }
      });
    });

    // Populate Cumulative and Event-driven Maintenance costs
    maintenance.forEach((rec) => {
      const dateParts = (rec.maintenanceDate || "2026-01-01").split("-");
      const mYear = parseInt(dateParts[0], 10) || 2026;
      const mMonth = parseInt(dateParts[1], 10) || 1;
      const key = `${mYear}-${String(mMonth).padStart(2, "0")}`;

      const matchingMonth = months.find((m) => m.key === key);
      if (matchingMonth) {
        matchingMonth.maintenanceCost += rec.cost;
      }
    });

    return months;
  }, [assets, maintenance]);

  // Dimension responsive sizing refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 680, height: 280 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // set dimensions with fallback parameters
        setDimensions({
          width: Math.max(width, 320),
          height: Math.max(height, 220)
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute Scales, Paths, Gridlines inside d3 helper
  const margin = { top: 25, right: 30, bottom: 35, left: 60 };
  const graphWidth = dimensions.width - margin.left - margin.right;
  const graphHeight = dimensions.height - margin.top - margin.bottom;

  // D3 Scales
  const xScale = useMemo(() => {
    return d3.scalePoint()
      .domain(chartData.map((d) => d.label))
      .range([margin.left, dimensions.width - margin.right]);
  }, [chartData, dimensions.width]);

  const maxValuation = useMemo(() => {
    const costs = chartData.map((d) => d.acquisitionCost);
    return Math.max(...costs, 1000) * 1.1;
  }, [chartData]);

  const maxMaintenance = useMemo(() => {
    const costs = chartData.map((d) => d.maintenanceCost);
    return Math.max(...costs, 500) * 1.25;
  }, [chartData]);

  const yScaleValuation = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, maxValuation])
      .range([dimensions.height - margin.bottom, margin.top]);
  }, [maxValuation, dimensions.height]);

  const yScaleMaintenance = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, maxMaintenance])
      .range([dimensions.height - margin.bottom, margin.top]);
  }, [maxMaintenance, dimensions.height]);

  // Generators for paths & grid ticks
  const valueLines = useMemo(() => {
    const lineAcquisition = d3.line<MonthData>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScaleValuation(d.acquisitionCost))
      .curve(d3.curveMonotoneX);

    const lineBookValue = d3.line<MonthData>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScaleValuation(d.bookValue))
      .curve(d3.curveMonotoneX);

    const lineMaintenance = d3.line<MonthData>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScaleMaintenance(d.maintenanceCost))
      .curve(d3.curveMonotoneX);

    // Maintenance area generator
    const areaMaintenance = d3.area<MonthData>()
      .x((d) => xScale(d.label) || 0)
      .y0(dimensions.height - margin.bottom)
      .y1((d) => yScaleMaintenance(d.maintenanceCost))
      .curve(d3.curveMonotoneX);

    return { lineAcquisition, lineBookValue, lineMaintenance, areaMaintenance };
  }, [xScale, yScaleValuation, yScaleMaintenance, dimensions.height]);

  const yTicksValuation = useMemo(() => yScaleValuation.ticks(5), [yScaleValuation]);
  const yTicksMaintenance = useMemo(() => yScaleMaintenance.ticks(5), [yScaleMaintenance]);

  const peakMaintenanceMonth = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.maintenanceCost));
    const peak = chartData.find((d) => d.maintenanceCost === maxVal && d.maintenanceCost > 0);
    return peak ? `${peak.label} ($${peak.maintenanceCost})` : "None";
  }, [chartData]);

  // Handles mouse tracking on the composite projection canvas
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const points = chartData.map((d) => xScale(d.label) || 0);
    let bestIdx = 0;
    let minDistance = Infinity;

    points.forEach((pt, idx) => {
      const dist = Math.abs(pt - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = idx;
      }
    });

    setHoveredIdx(bestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  // Get active values
  const activeRecord = hoveredIdx !== null ? chartData[hoveredIdx] : null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 space-y-4">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold font-display text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="w-4.5 h-4.5 text-blue-600" /> Interactive Financial Performance Analytics (D3.js)
          </h3>
          <p className="text-[10px] text-slate-400">Dynamic time-series projection ledger compiling monthly depreciation factors and repairs ratio</p>
        </div>

        <div className="flex flex-wrap items-center bg-slate-100/70 p-1 rounded-lg text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab("depreciation"); setHoveredIdx(null); }}
            className={`py-1.5 px-3.5 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "depreciation"
                ? "bg-white text-blue-700 shadow-xs ring-1 ring-slate-100"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Book Value Depreciation
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("maintenance"); setHoveredIdx(null); }}
            className={`py-1.5 px-3.5 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "maintenance"
                ? "bg-white text-amber-700 shadow-xs ring-1 ring-slate-100"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Service Expenditures
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("distribution"); setHoveredIdx(null); }}
            className={`py-1.5 px-3.5 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "distribution"
                ? "bg-white text-emerald-700 shadow-xs ring-1 ring-slate-100"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Lifecycle & Distribution
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("heatmap"); setHoveredIdx(null); }}
            className={`py-1.5 px-3.5 rounded-md cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "heatmap"
                ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-100"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Verification Heatmap
          </button>
        </div>
      </div>

      {/* Main Graphical Canvas */}
      {activeTab === "depreciation" || activeTab === "maintenance" ? (
        <div ref={containerRef} className="relative w-full h-[280px]">
          <svg
            className="w-full h-full select-none overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* horizontal gridlines (D3-like) */}
            <g className="grid-lines opacity-10">
              {activeTab === "depreciation" ? (
                yTicksValuation.map((val, idx) => (
                  <line
                    key={idx}
                    x1={margin.left}
                    y1={yScaleValuation(val)}
                    x2={dimensions.width - margin.right}
                    y2={yScaleValuation(val)}
                    stroke="#475569"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                ))
              ) : (
                yTicksMaintenance.map((val, idx) => (
                  <line
                    key={idx}
                    x1={margin.left}
                    y1={yScaleMaintenance(val)}
                    x2={dimensions.width - margin.right}
                    y2={yScaleMaintenance(val)}
                    stroke="#475569"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                ))
              )}
            </g>

            {/* X Axis Labels */}
            <g className="x-axis text-[9.5px] font-mono text-slate-400 font-bold">
              {chartData.map((d, idx) => {
                const xPos = xScale(d.label) || 0;
                return (
                  <g key={idx} transform={`translate(${xPos}, ${dimensions.height - margin.bottom + 16})`}>
                    <text textAnchor="middle" fill="#94a3b8">{d.label}</text>
                    <line y1={-16} y2={-12} stroke="#cbd5e1" strokeWidth={1} />
                  </g>
                );
              })}
              {/* Axis Baseline */}
              <line
                x1={margin.left}
                y1={dimensions.height - margin.bottom}
                x2={dimensions.width - margin.right}
                y2={dimensions.height - margin.bottom}
                stroke="#e2e8f0"
                strokeWidth={1.5}
              />
            </g>

            {/* Y Axis Labels */}
            <g className="y-axis text-[9.5px] font-mono font-bold text-slate-400">
              {activeTab === "depreciation" ? (
                yTicksValuation.map((val, idx) => (
                  <g key={idx} transform={`translate(${margin.left - 8}, ${yScaleValuation(val)})`}>
                    <text textAnchor="end" dominantBaseline="middle" fill="#64748b">
                      ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                    </text>
                  </g>
                ))
              ) : (
                yTicksMaintenance.map((val, idx) => (
                  <g key={idx} transform={`translate(${margin.left - 8}, ${yScaleMaintenance(val)})`}>
                    <text textAnchor="end" dominantBaseline="middle" fill="#64748b">
                      ${val}
                    </text>
                  </g>
                ))
              )}
              {/* Vertical Baseline */}
              <line
                x1={margin.left}
                y1={margin.top}
                x2={margin.left}
                y2={dimensions.height - margin.bottom}
                stroke="#e2e8f0"
                strokeWidth={1.5}
              />
            </g>

            {/* Draw D3 Path Lines */}
            {activeTab === "depreciation" ? (
              <>
                {/* Line 1: Original Budget Cost */}
                <path
                  d={valueLines.lineAcquisition(chartData) || ""}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                {/* Line 2: Depreciated Net Book Value */}
                <path
                  d={valueLines.lineBookValue(chartData) || ""}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="1 0"
                  className="transition-all duration-300"
                />
              </>
            ) : (
              <>
                {/* Shaded Area for Maintenance Spending */}
                <path
                  d={valueLines.areaMaintenance(chartData) || ""}
                  fill="url(#amber-gradient)"
                  className="transition-all duration-300 opacity-20"
                />
                {/* Line: Maintenance expenditure cascade */}
                <path
                  d={valueLines.lineMaintenance(chartData) || ""}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </>
            )}

            {/* Dynamic Shading Gradient for Area chart fill */}
            <defs>
              <linearGradient id="amber-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Interactive Mouse Hover Overlay Target */}
            {hoveredIdx !== null && activeRecord && (
              <g>
                {/* Vertical Guide Line */}
                <line
                  x1={xScale(activeRecord.label)}
                  y1={margin.top}
                  x2={xScale(activeRecord.label)}
                  y2={dimensions.height - margin.bottom}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />

                {/* Data points highlight dot trackers */}
                {activeTab === "depreciation" ? (
                  <>
                    {/* Acquisition Highlight */}
                    <circle
                      cx={xScale(activeRecord.label)}
                      cy={yScaleValuation(activeRecord.acquisitionCost)}
                      r={6}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="shadow"
                    />
                    {/* BookValue Highlight */}
                    <circle
                      cx={xScale(activeRecord.label)}
                      cy={yScaleValuation(activeRecord.bookValue)}
                      r={6}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="shadow"
                    />
                  </>
                ) : (
                  <circle
                    cx={xScale(activeRecord.label)}
                    cy={yScaleMaintenance(activeRecord.maintenanceCost)}
                    r={6}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="shadow"
                  />
                )}
              </g>
            )}
          </svg>

          {/* Floating Custom Interactive Tooltip card */}
          {activeRecord && hoveredIdx !== null && (
            <div
              className="absolute z-20 bg-slate-905 bg-zinc-950/95 text-white p-3 rounded-xl border border-zinc-800 shadow-2xl space-y-1.5 pointer-events-none text-[10.5px] transition-all duration-100"
              style={{
                left: `${Math.min(dimensions.width - 170, Math.max(margin.left, (xScale(activeRecord.label) || 0) - 80))}px`,
                top: `${margin.top + 8}px`,
                width: "160px"
              }}
            >
              <p className="font-bold text-[11px] text-zinc-100 border-b border-zinc-800 pb-1.5 text-center flex items-center justify-center gap-1 font-mono">
                📅 {activeRecord.label}
              </p>

              {activeTab === "depreciation" ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-blue-400">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Capital Cost:
                    </span>
                    <span className="font-mono font-bold">
                      ${activeRecord.acquisitionCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Net Book Value:
                    </span>
                    <span className="font-mono font-bold">
                      ${activeRecord.bookValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {activeRecord.acquisitionCost > 0 && (
                    <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-850 pt-1 text-[9.5px]">
                      <span>Depreciation Rate:</span>
                      <span className="font-mono font-bold text-rose-400">
                        -{(((activeRecord.acquisitionCost - activeRecord.bookValue) / activeRecord.acquisitionCost) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-amber-400">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Maintenance:
                    </span>
                    <span className="font-mono font-bold">
                      ${activeRecord.maintenanceCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 italic font-medium leading-tight pt-1 border-t border-zinc-850 text-center">
                    {activeRecord.maintenanceCost > 0 
                      ? `Cost distributed over ${maintenance.filter(m => (m.maintenanceDate || "").startsWith(activeRecord.key)).length} tickets`
                      : "No active service tickets"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === "distribution" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Pie Chart: Lifecycle Status */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between" id="lifecycle-status-chart-box">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Asset Lifecycle Status</h4>
              <p className="text-[11px] text-slate-400">Status proportions across total physical inventory count</p>
            </div>
            
            <div className="h-48 relative flex items-center justify-center mt-3">
              {lifecycleData.length === 0 ? (
                <div className="text-slate-400 text-xs text-center font-medium">No asset status records available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lifecycleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {lifecycleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#3b82f6"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Assets`, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10.5px] border-t border-slate-100/85 pt-3 mt-3">
              {Object.entries(STATUS_COLORS).map(([name, color]) => {
                const count = assets.filter(a => (a.status || "Active") === name).length;
                return (
                  <div key={name} className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                    <span className="truncate text-slate-600 font-medium">{name}</span>
                    <span className="font-bold text-slate-800 font-mono ml-auto">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bar Chart: Depreciation Profile by Category */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between" id="depreciation-profile-chart-box">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Depreciation Profile by Category</h4>
              <p className="text-[11px] text-slate-400">Original Acquisition Cost vs. Net Remaining Book Value</p>
            </div>

            <div className="h-48 mt-3">
              {categoryDepreciationData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs shadow-inner rounded-xl bg-slate-50">
                  No category records.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryDepreciationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatCurrency(Number(value)), 
                        name === "bookValue" ? "Net Book Value" : "Accumulated Depreciation"
                      ]} 
                    />
                    <Bar dataKey="bookValue" name="Net Book Value" stackId="deprStack" fill="#10b981" />
                    <Bar dataKey="depreciation" name="Accumulated Depreciation" stackId="deprStack" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex justify-center gap-4 text-[10.5px] border-t border-slate-100/80 pt-3 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#10b981] rounded-xs shrink-0" />
                <span className="text-slate-655 font-semibold">Net Book Value</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#cbd5e1] rounded-xs shrink-0" />
                <span className="text-slate-655 font-semibold">Accumulated Depreciation</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-2 animate-fade-in" id="physical-verification-heatmap-container">
          {/* Heatmap Stats & Configuration Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Operational Metrics Configuration
              </h4>
              <p className="text-[11px] text-slate-400">Toggle underlying metric perspective overlaying organizational cross-sections</p>
            </div>
            
            {/* Control buttons & Legend */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Perspective Toggles */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setHeatmapMode("density")}
                  className={`py-1 px-3 rounded-md cursor-pointer transition-all ${
                    heatmapMode === "density"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Asset Density (Quantity)
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapMode("verification")}
                  className={`py-1 px-3 rounded-md cursor-pointer transition-all ${
                    heatmapMode === "verification"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Audit Coverage (Ratio)
                </button>
              </div>

              {/* Dynamic Legend */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-medium text-slate-400">Legend:</span>
                {heatmapMode === "density" ? (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="w-2.5 h-2.5 bg-[#f8fafc] border border-slate-200 rounded-xs" title="No assets" />
                    <span className="text-[9px] text-slate-500 font-semibold">0</span>
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: "rgba(13, 148, 136, 0.25)" }} />
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: "rgba(13, 148, 136, 0.6)" }} />
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: "rgba(13, 148, 136, 1.0)" }} />
                    <span className="text-[9px] text-slate-500 font-semibold">High Density</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="w-2.5 h-2.5 bg-[#f1f5f9] border border-slate-200 rounded-xs" title="No assets to verify" />
                    <span className="text-[9px] text-slate-500 font-semibold">None</span>
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs animate-pulse" title="0% verified" />
                    <span className="text-[9.5px] text-rose-600 font-bold">0%</span>
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs" title="Partially verified" />
                    <span className="text-[9.5px] text-amber-600 font-semibold">Partial</span>
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" title="100% verified" />
                    <span className="text-[9.5px] text-emerald-600 font-bold">100%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Layout Canvas */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
            <div className="overflow-x-auto select-none pb-2">
              <table className="min-w-[700px] w-full border-collapse">
                <thead>
                  <tr>
                    {/* Empty cell for top-left intersection */}
                    <th className="p-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-b-slate-100 w-[180px]">
                      DEPT. \ LOCATION
                    </th>
                    {heatmapGridData[0]?.locations.map((loc) => (
                      <th
                        key={loc.locationId}
                        className="p-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-b-slate-100 min-w-[90px]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-slate-800 bg-slate-100/60 font-bold px-1.5 py-0.5 rounded-xs text-[9.5px]">
                            {loc.locationCode}
                          </span>
                          <span className="text-[8.5px] text-slate-400 capitalize truncate max-w-[90px] mt-1" title={loc.locationName}>
                            {loc.locationName.replace("HQ Building - ", "")}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapGridData.map((row) => (
                    <tr key={row.departmentId} className="hover:bg-slate-50/40 transition-colors">
                      {/* Left header: Department code & Name */}
                      <td className="p-3 border-b border-slate-100 align-middle">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-700 font-mono tracking-tight bg-slate-50 border border-slate-100/80 px-1.5 py-0.5 rounded-md inline-block self-start">
                            {row.departmentCode}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 truncate mt-1" title={row.departmentName}>
                            {row.departmentName}
                          </span>
                        </div>
                      </td>

                      {/* Map through cells */}
                      {row.locations.map((cell) => {
                        // Calculate cell color based on active mode
                        let bgColor = "rgb(248, 250, 252)"; // empty count color
                        let borderStyle = "border border-slate-100";

                        const maxCellCount = Math.max(
                          ...heatmapGridData.flatMap((d) => d.locations.map((l) => l.count)),
                          1
                        );

                        if (cell.count > 0) {
                          if (heatmapMode === "density") {
                            const intensity = 0.15 + (cell.count / maxCellCount) * 0.85;
                            bgColor = `rgba(13, 148, 136, ${intensity})`; // Teal tone
                            borderStyle = "border border-teal-600/20";
                          } else {
                            // Verification status color coding
                            if (cell.verificationRatio === 1) {
                              bgColor = "rgba(16, 185, 129, 0.85)"; // Emerald
                              borderStyle = "border border-emerald-600/35 font-bold";
                            } else if (cell.verificationRatio === 0) {
                              bgColor = "rgba(239, 68, 68, 0.85)"; // Red
                              borderStyle = "border border-rose-600/35 animate-pulse";
                            } else {
                              const opacity = 0.4 + cell.verificationRatio * 0.6;
                              bgColor = `rgba(245, 158, 11, ${opacity})`; // Amber
                              borderStyle = "border border-amber-600/35";
                            }
                          }
                        } else {
                          // No assets context color
                          bgColor = heatmapMode === "density" ? "#f8fafc" : "#f1f5f9";
                          borderStyle = "border border-slate-100/50";
                        }

                        const isSelected =
                          selectedHeatmapCell?.departmentId === row.departmentId &&
                          selectedHeatmapCell?.locationId === cell.locationId;

                        const textColor = cell.count > 0 && (heatmapMode === "verification" || (heatmapMode === "density" && cell.count > maxCellCount / 2))
                          ? "text-white"
                          : "text-slate-700";

                        return (
                          <td key={cell.locationId} className="p-2 border-b border-slate-100 text-center">
                            <button
                              id={`heatmap-cell-${row.departmentCode}-${cell.locationCode}`}
                              type="button"
                              onClick={() => setSelectedHeatmapCell({ departmentId: row.departmentId, locationId: cell.locationId })}
                              style={{ backgroundColor: bgColor }}
                              className={`w-full aspect-square rounded-xl p-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 select-none relative focus:outline-hidden ${borderStyle} ${
                                isSelected
                                  ? "shadow-md scale-105 ring-3 ring-indigo-500 z-10"
                                  : "hover:scale-102 hover:shadow-2xs"
                              }`}
                            >
                              {cell.count > 0 ? (
                                <>
                                  <span className={`text-sm font-extrabold font-mono tracking-tighter ${textColor}`}>
                                    {heatmapMode === "density" ? cell.count : `${Math.round(cell.verificationRatio * 100)}%`}
                                  </span>
                                  <span className={`text-[8px] font-semibold opacity-85 uppercase tracking-wide truncate max-w-full ${
                                    textColor === "text-white" ? "text-slate-100" : "text-slate-405"
                                  }`}>
                                    {heatmapMode === "density"
                                      ? `$${(cell.totalValue >= 1000 ? `${(cell.totalValue / 1000).toFixed(0)}k` : cell.totalValue)}`
                                      : `${cell.verifiedCount}/${cell.count} vrf`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-300 font-bold font-mono text-[11px]">-</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 italic text-center">
              💡 Pro-Tip: Click on any active filled grid cell to drill-down and inspect physical assets, their conditions, and last audited times.
            </p>
          </div>

          {/* Drill Down Cell inspector panel */}
          <div className="transition-all duration-300">
            {activeHeatmapCell ? (
              <div 
                className="bg-slate-50/75 border border-slate-100 rounded-2xl p-5 space-y-4 animate-slide-up"
                id="heatmap-cell-inspector-panel"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-650 text-white font-bold text-[9px] px-2 py-0.5 rounded-md font-mono">CELL INSPECTOR</span>
                      <h4 className="text-sm font-semibold text-slate-900 font-display">
                        {activeHeatmapCell.departmentName} &times; {activeHeatmapCell.locationName}
                      </h4>
                    </div>
                    <p className="text-[10.5px] text-slate-400 font-medium">
                      Compiling detailed register for physical assets assigned to this specific operational intersection.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedHeatmapCell(null)}
                    className="text-slate-400 hover:text-slate-655 font-semibold text-[10.5px] bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>

                {/* Sub KPIs layout */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Asset Charge</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base font-bold text-slate-800 font-mono">{activeHeatmapCell.count}</span>
                      <span className="text-[10px] text-slate-400">physical units</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Accumulated Net Value</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base font-bold text-slate-850 font-mono">${activeHeatmapCell.totalValue.toLocaleString("en-US")}</span>
                      <span className="text-[10px] text-slate-400">capital cost</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Verification Standard</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-bold text-slate-800 font-mono">
                        {Math.round(activeHeatmapCell.verificationRatio * 100)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({activeHeatmapCell.verifiedCount} of {activeHeatmapCell.count} verified)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assets lists */}
                {activeHeatmapCell.assets.length === 0 ? (
                  <div className="text-center py-6 bg-white border border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 font-semibold">No assets found matching this intersection coordinates.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-3xs">
                    <div className="overflow-x-auto text-[11px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                          <tr>
                            <th className="p-2.5 pl-3">Asset Tag</th>
                            <th className="p-2.5">Asset Name</th>
                            <th className="p-2.5">Condition</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Last Verified / Auditor</th>
                            <th className="p-2.5 text-right pr-3">Depreciated Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60 font-sans">
                          {activeHeatmapCell.assets.map((asset) => {
                            const dbState = getDatabaseState();
                            const matchingVerifs = (dbState.verifications || []).filter(v => v.assetId === asset.id);
                            const latestVerif = matchingVerifs.length > 0 
                              ? [...matchingVerifs].sort((a,b) => b.verificationDate.localeCompare(a.verificationDate))[0]
                              : null;

                            const isVerified = !!latestVerif;
                            const fins = getAssetFinancials(asset);

                            return (
                              <tr key={asset.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5 pl-3 font-mono font-bold text-slate-600">{asset.assetTag}</td>
                                <td className="p-2.5">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800">{asset.name}</span>
                                    <span className="text-[9.5px] text-slate-400 font-medium font-mono font-mono">Serial: {asset.serialNumber || "N/A"}</span>
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <span className={`inline-block px-2 py-0.5 rounded-sm text-[9.5px] font-bold ${
                                    asset.condition === "Excellent" ? "bg-emerald-50 text-emerald-700" :
                                    asset.condition === "Good" ? "bg-blue-50 text-blue-700" :
                                    asset.condition === "Fair" ? "bg-amber-50 text-amber-700" :
                                    "bg-rose-50 text-rose-700"
                                  }`}>
                                    {asset.condition}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">{asset.status}</span>
                                </td>
                                <td className="p-2.5">
                                  {isVerified ? (
                                    <div className="flex flex-col">
                                      <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10.5px]">
                                        <CheckCircle className="w-3 h-3 text-emerald-500 inline-block" /> Verified
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        On {latestVerif.verificationDate} by {latestVerif.verifiedBy}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col">
                                      <span className="text-rose-500 font-bold flex items-center gap-1 text-[10.5px]">
                                        ✕ Unverified
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-sans">Needs physical verification audit</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 text-right pr-3 font-mono font-semibold text-slate-850">
                                  ${fins.bookValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/20">
                <MapPin className="w-8 h-8 text-indigo-400 mx-auto stroke-1 animate-bounce" />
                <h5 className="text-xs font-bold text-slate-650 mt-2 font-display">Active Geographic Coordinates Selection</h5>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  Audit logs reveal that cross-docking distribution needs consistent oversight. Tap on any valid non-empty department box in the grid map to explore physical devices.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auxiliary informative metrics legends */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 font-sans">
        {activeTab === "depreciation" ? (
          <>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Original Capital Base</span>
              <span className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 
                {chartData[11]?.acquisitionCost ? `$${chartData[11].acquisitionCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "$0"}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Current Net Book Value</span>
              <span className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 
                {chartData[11]?.bookValue ? `$${chartData[11].bookValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "$0"}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Depreciated Write-off</span>
              <span className="font-mono font-semibold text-rose-600 text-sm">
                -${Math.max(0, (chartData[11]?.acquisitionCost || 0) - (chartData[11]?.bookValue || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Model Standard Type</span>
              <span className="font-mono font-semibold text-slate-600 text-xs">Straight-Line (1.5%/mo)</span>
            </div>
          </>
        ) : activeTab === "maintenance" ? (
          <>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Total Repairs Count</span>
              <span className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 
                {maintenance.length} Active Records
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Total Maintenance Cost</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ${maintenance.reduce((sum, r) => sum + r.cost, 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Peak Expend. Month</span>
              <span className="font-mono font-semibold text-slate-800 text-xs">
                {peakMaintenanceMonth}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Efficiency Rating</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">Optimal</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Total Asset Stock</span>
              <span className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> 
                {assets.length} Registered
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Combined Value basis</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ${assets.reduce((sum, a) => sum + a.purchaseCost, 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Disposed Inventory</span>
              <span className="font-mono font-semibold text-purple-600 text-sm pb-0.5">
                {assets.filter(a => a.status === "Disposed").length} Assets
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Salvage Value Estimate</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                ${(assets.reduce((sum, a) => sum + getAssetFinancials(a).bookValue, 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
