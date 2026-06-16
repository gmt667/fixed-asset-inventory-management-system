/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  MapPin,
  User,
  CheckCircle,
  Tag,
  AlertCircle,
  ArrowRight,
  Shuffle,
  Layers,
  Activity,
  Boxes,
  X,
  Check,
  Building,
  Monitor,
  HardDrive,
  Truck,
  Wrench,
  HelpCircle
} from "lucide-react";
import { 
  getDatabaseState, 
  saveDatabaseState, 
  addAuditRecord, 
  triggerNotification, 
  formatCurrency, 
  formatDate 
} from "../db";
import { 
  Asset, 
  AssetStatus, 
  AssetCondition, 
  UserRole, 
  TransferStatus, 
  AssetTransfer 
} from "../types";

interface InteractiveFloorPlanProps {
  userRole: UserRole;
  currentUserId: string;
  filteredAssets: Asset[];
  onStateChange: () => void;
  onReviewDossier: (asset: Asset) => void;
}

interface RoomMetadata {
  id: string; // matches locationId
  name: string;
  label: string;
  desc: string;
  accentColor: string;
  defaultDept: string;
}

export default function InteractiveFloorPlan({
  userRole,
  currentUserId,
  filteredAssets,
  onStateChange,
  onReviewDossier
}: InteractiveFloorPlanProps) {
  const db = getDatabaseState();
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  
  // Transfer Modal / Workflow Confirmation Wizard State
  const [activeTransferInfo, setActiveTransferInfo] = useState<{
    asset: Asset;
    sourceLocationId: string;
    destLocationId: string;
  } | null>(null);

  const [destDeptId, setDestDeptId] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [instantMove, setInstantMove] = useState<boolean>(
    userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER
  );

  // Room blueprint layout configuration
  const roomsList: RoomMetadata[] = [
    {
      id: "loc-1",
      name: "HQ Building - Suite 101",
      label: "Administration Suite",
      desc: "Executive offices, finance, and primary corporate workspace",
      accentColor: "indigo",
      defaultDept: "dept-1" // Administration
    },
    {
      id: "loc-2",
      name: "HQ Building - Engineering Lab 204",
      label: "R&D Engineering Lab",
      desc: "Hardware assembly, testing benches, and engineer workstations",
      accentColor: "blue",
      defaultDept: "dept-2" // IT & Engineering
    },
    {
      id: "loc-3",
      name: "IT Main Server Room",
      label: "Data Center (MSR)",
      desc: "Climate-controlled server racks and network switches",
      accentColor: "cyan",
      defaultDept: "dept-2" // IT & Engineering
    },
    {
      id: "loc-4",
      name: "Annex Building - Hallway A",
      label: "Annex Transit Corridor",
      desc: "Employee corridors, lounge spots, and public transit areas",
      accentColor: "slate",
      defaultDept: "dept-4" // Operations & Logistics
    },
    {
      id: "loc-5",
      name: "Warehouse & Logistics Garage A",
      label: "Garage & Cargo Depot",
      desc: "Loading bays, cargo containers, and heavy transport assets",
      accentColor: "amber",
      defaultDept: "dept-4" // Operations & Logistics
    },
    {
      id: "loc-6",
      name: "Factory Floor B - Assembly Unit",
      label: "Manufacturing Assembly",
      desc: "Heavy CNC machines, automation bays, and tool racks",
      accentColor: "rose",
      defaultDept: "dept-5" // Production & Manufacturing
    }
  ];

  // Helper to map room style colors
  const getAccentClasses = (color: string) => {
    switch (color) {
      case "indigo":
        return {
          bg: "bg-indigo-50/50",
          border: "border-indigo-150",
          text: "text-indigo-800",
          badge: "bg-indigo-100 text-indigo-700",
          ring: "ring-indigo-400"
        };
      case "blue":
        return {
          bg: "bg-blue-50/50",
          border: "border-blue-150",
          text: "text-blue-800",
          badge: "bg-blue-100 text-blue-700",
          ring: "ring-blue-400"
        };
      case "cyan":
        return {
          bg: "bg-cyan-50/50",
          border: "border-cyan-155",
          text: "text-cyan-850",
          badge: "bg-cyan-100 text-cyan-800",
          ring: "ring-cyan-500"
        };
      case "slate":
        return {
          bg: "bg-slate-50/80",
          border: "border-slate-150",
          text: "text-slate-700",
          badge: "bg-slate-100/80 text-slate-600",
          ring: "ring-slate-400"
        };
      case "amber":
        return {
          bg: "bg-amber-50/50",
          border: "border-amber-150",
          text: "text-amber-800",
          badge: "bg-amber-100 text-amber-750",
          ring: "ring-amber-500"
        };
      case "rose":
        return {
          bg: "bg-rose-50/50",
          border: "border-rose-150",
          text: "text-rose-800",
          badge: "bg-rose-100 text-rose-700",
          ring: "ring-rose-500"
        };
      default:
        return {
          bg: "bg-slate-50",
          border: "border-slate-200",
          text: "text-slate-800",
          badge: "bg-slate-100 text-slate-600",
          ring: "ring-slate-400"
        };
    }
  };

  const isEditable = userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData("text/plain", assetId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    if (dragOverRoomId !== roomId) {
      setDragOverRoomId(roomId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRoomId(null);
  };

  const handleDrop = (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    setDragOverRoomId(null);
    const assetId = e.dataTransfer.getData("text/plain");
    if (!assetId) return;

    const assetObj = db.assets.find(a => a.id === assetId);
    if (!assetObj) return;

    // Reject transfer to same room
    if (assetObj.locationId === targetRoomId) {
      return;
    }

    // Set interactive transfer wizard state
    const targetRoom = roomsList.find(r => r.id === targetRoomId);
    setActiveTransferInfo({
      asset: assetObj,
      sourceLocationId: assetObj.locationId,
      destLocationId: targetRoomId
    });

    // Populate default destination values
    setDestDeptId(targetRoom ? targetRoom.defaultDept : assetObj.departmentId);
    setRemarks(`Internal asset relocation via Interactive Floor Plan`);
    setInstantMove(userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER);
  };

  const handleConfirmTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransferInfo) return;

    const currentDB = getDatabaseState();
    const { asset, sourceLocationId, destLocationId } = activeTransferInfo;
    
    const dbAsset = currentDB.assets.find(a => a.id === asset.id);
    if (!dbAsset) return;

    const sourceRoomName = db.locations.find(l => l.id === sourceLocationId)?.name || "Unplaced Room";
    const destRoomName = db.locations.find(l => l.id === destLocationId)?.name || "Target Room";
    
    const sourceDeptObj = currentDB.departments.find(d => d.id === dbAsset.departmentId);
    const destDeptObj = currentDB.departments.find(d => d.id === destDeptId);

    if (instantMove && (userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER)) {
      // Direct, instantaneous relocation bypass
      dbAsset.locationId = destLocationId;
      dbAsset.departmentId = destDeptId;

      // Log direct transfer
      const directTransfer: AssetTransfer = {
        id: `trf-dir-${Date.now()}`,
        assetId: asset.id,
        sourceDepartmentId: asset.departmentId,
        destDepartmentId: destDeptId,
        sourceLocationId: sourceLocationId,
        destLocationId: destLocationId,
        status: TransferStatus.APPROVED,
        transferDate: new Date().toISOString().split("T")[0],
        authorizedBy: db.users.find(u => u.id === currentUserId)?.name || "Asset Administrator",
        remarks: remarks ? `${remarks} (Instant Admin Relocation)` : "Instant Relocation"
      };

      currentDB.transfers.unshift(directTransfer);
      saveDatabaseState(currentDB);

      addAuditRecord(
        currentUserId,
        userRole,
        "Asset Relocated Directly",
        `Directly relocated Asset: ${dbAsset.assetTag} (${dbAsset.name}) from ${sourceRoomName} to ${destRoomName} (${destDeptObj?.name || "Shared Department"}).`
      );

      triggerNotification(
        "all",
        "Asset Relocated Directly",
        `Asset ${dbAsset.assetTag} was directly transferred to ${destRoomName} by administrator.`,
        "success"
      );
    } else {
      // Formal Transfer Approval Request
      const newTransfer: AssetTransfer = {
        id: `trf-req-${Date.now()}`,
        assetId: asset.id,
        sourceDepartmentId: asset.departmentId,
        destDepartmentId: destDeptId,
        sourceLocationId: sourceLocationId,
        destLocationId: destLocationId,
        status: TransferStatus.PENDING,
        transferDate: new Date().toISOString().split("T")[0],
        remarks: remarks || "Relocated via Floor Plan drag & drop"
      };

      currentDB.transfers.unshift(newTransfer);
      saveDatabaseState(currentDB);

      addAuditRecord(
        currentUserId,
        userRole,
        "Asset Transfer Initiated",
        `Initiated relocation approval process for asset: ${dbAsset.assetTag} from ${sourceRoomName} to ${destRoomName}.`
      );

      triggerNotification(
        "all",
        "Relocation Request Submitted",
        `Transfer submitted for asset ${dbAsset.assetTag} from ${sourceRoomName} to ${destRoomName} under pending authorization.`,
        "info"
      );
    }

    setActiveTransferInfo(null);
    onStateChange(); // Notify parent of DB updates
  };

  // Generate category icons for markers
  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case "cat-1": // Computers
        return <Monitor className="w-3.5 h-3.5 shrink-0" />;
      case "cat-2": // Networking
      case "cat-3": // Servers / Printers
        return <HardDrive className="w-3.5 h-3.5 shrink-0" />;
      case "cat-5": // Vehicles
        return <Truck className="w-3.5 h-3.5 shrink-0" />;
      case "cat-6": // Industrial machinery
        return <Wrench className="w-3.5 h-3.5 shrink-0" />;
      default:
        return <Boxes className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6" id="interactive-floorplan-module">
      
      {/* Top floorplan header informative banner */}
      <div className="bg-slate-55 bg-gradient-to-r from-teal-50 to-indigo-50 border border-slate-100 p-4.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="bg-indigo-605 text-indigo-700 bg-indigo-50 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-block">
            FAIMS Operational Workspace
          </span>
          <h3 className="text-sm font-bold text-slate-800 font-display">Interactive Architectural Blueprint Map</h3>
          <p className="text-[11px] text-slate-500 max-w-xl">
            Real-time physical asset relocation canvas matching registered office suites. 
            <strong className="text-indigo-700"> Drag and drop </strong> 
            any asset tag marker to another sector room cell to automatically initiate authorized transfer procedures.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500 bg-white/80 p-2.5 rounded-xl border border-slate-150">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            <span>Excellent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
            <span>Good Condition</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
            <span>Regular/Fair</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <Shuffle className="w-3.5 h-3.5 text-indigo-650" />
            <span className="text-indigo-800">Drag to Transfer</span>
          </div>
        </div>
      </div>

      {/* Blueprint grid frame structure */}
      <div className="bg-slate-900 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] border border-slate-950 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        
        {/* Visual architecture markings/grid lines */}
        <div className="absolute top-1 right-2 text-[8px] font-mono text-slate-600 tracking-widest select-none">
          SEC-GRID A4 // SCALE 1:50
        </div>
        <div className="absolute bottom-1 left-2 text-[8px] font-mono text-slate-600 tracking-widest select-none">
          FAIMS INTEGRATED CAD LAYER V2.8
        </div>

        {/* Layout container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          
          {roomsList.map(room => {
            const style = getAccentClasses(room.accentColor);
            
            // Filter assets residing in this location
            const roomAssets = filteredAssets.filter(asset => asset.locationId === room.id);
            
            // Calculate total financial valuation for assets in this room
            const totalCost = roomAssets.reduce((sum, curr) => sum + curr.purchaseCost, 0);

            const isOver = dragOverRoomId === room.id;

            return (
              <div
                key={room.id}
                onDragOver={(e) => handleDragOver(e, room.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, room.id)}
                className={`min-h-[290px] rounded-2xl flex flex-col justify-between p-4.5 border-2 transition-all duration-300 relative ${style.bg} ${
                  isOver 
                    ? `border-emerald-500 bg-emerald-950/20 scale-102 shadow-lg ring-4 ${style.ring}` 
                    : `${style.border} border-dashed`
                }`}
                id={`floorplan-room-${room.id}`}
              >
                
                {/* Visual Door/Gateway Indicators schematically positioned */}
                <span className="absolute -top-1 left-12 w-6 h-1.5 bg-slate-900 border-x border-slate-350 z-10" title="Corridor Entrance Gate" />

                {/* Room Header Info */}
                <div className="space-y-1 pb-3 border-b border-slate-200/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${style.badge}`}>
                        {db.locations.find(l => l.id === room.id)?.code || "ROOM"}
                      </span>
                      <h4 className="text-[13px] font-extrabold text-slate-900 mt-1 font-display tracking-tight leading-tight">
                        {room.label}
                      </h4>
                    </div>
                    {/* Tiny stats */}
                    <div className="text-right">
                      <p className="text-[11px] font-extrabold text-slate-900 font-mono">
                        {roomAssets.length}
                      </p>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">Assets</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium leading-normal italic line-clamp-2">
                    {room.desc}
                  </p>
                </div>

                {/* Sub-Metric Valuation Strip */}
                <div className="my-2 py-1 px-2.5 bg-white/60 backdrop-blur-xs rounded-lg border border-slate-100 flex items-center justify-between text-[9.5px]">
                  <span className="text-slate-400 font-bold uppercase">Financial valuation:</span>
                  <span className="font-mono font-extrabold text-slate-800">
                    {formatCurrency(totalCost)}
                  </span>
                </div>

                {/* Asset markers container list */}
                <div className="flex-1 overflow-y-auto max-h-[140px] pr-1 space-y-2 py-2 text-xs scrollbar-thin">
                  {roomAssets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 bg-white/30 rounded-xl">
                      <HelpCircle className="w-5 h-5 text-slate-405 stroke-1 mb-1" />
                      <p className="text-[9.5px] font-semibold text-slate-400">Empty Location</p>
                      <span className="text-[8px] text-slate-400 mt-0.5">Drag an asset here to populate</span>
                    </div>
                  ) : (
                    roomAssets.map(asset => {
                      const conditionColor = 
                        asset.condition === AssetCondition.EXCELLENT ? "border-l-emerald-500" :
                        asset.condition === AssetCondition.GOOD ? "border-l-blue-500" :
                        "border-l-amber-500";

                      return (
                        <div
                          key={asset.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, asset.id)}
                          className={`p-2 bg-white border border-slate-250/70 rounded-xl hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing border-l-[3.5px] ${conditionColor} flex items-center justify-between gap-1 group relative`}
                          title={`Drag tag ${asset.assetTag} directly to another room to initiate transfer!`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            {/* Icon matching category */}
                            <div className="p-1 px-1.5 bg-slate-100 rounded text-slate-600 select-none">
                              {getCategoryIcon(asset.categoryId)}
                            </div>
                            
                            <div className="overflow-hidden">
                              <span className="text-[9px] font-bold font-mono tracking-tight text-slate-700 bg-slate-100 px-1 py-0.2 rounded">
                                {asset.assetTag}
                              </span>
                              <h5 className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5 group-hover:text-indigo-700">
                                {asset.name}
                              </h5>
                            </div>
                          </div>

                          {/* Float right actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onReviewDossier(asset)}
                              className="text-[9px] text-slate-405 font-bold hover:text-indigo-650 bg-slate-50 border border-slate-150 p-1 px-1.5 rounded-md shadow-3xs cursor-pointer select-none"
                              title="Review dossiers"
                            >
                              Inspect
                            </button>
                            {/* Micro grab handle indicator */}
                            <div className="flex flex-col gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity pr-0.5 select-none">
                              <span className="w-1 h-1 bg-slate-400 rounded-full" />
                              <span className="w-1 h-1 bg-slate-400 rounded-full" />
                              <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Room Floor Tag Identifier */}
                <div className="mt-2 text-right">
                  <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-500">
                    FACILITY ZONE // F1
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Transfer Confirmation Wizard Modal */}
      {activeTransferInfo && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-slide-up border border-slate-100">
            
            {/* Header info */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setActiveTransferInfo(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-emerald-500 animate-pulse" />
                <span className="text-[9.5px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  Internal Relocation Workflow
                </span>
              </div>
              <h3 className="text-base font-bold font-display tracking-tight text-white mt-2">
                Inititalizing Relocation Process
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Verify target administrative values before routing asset changes.
              </p>
            </div>

            {/* Wizard Form */}
            <form onSubmit={handleConfirmTransferSubmit} className="p-6 space-y-4 overflow-y-auto text-xs font-semibold text-slate-600">
              
              {/* Asset Snapshot Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                <span className="bg-slate-900 text-white font-mono text-[10.5px] font-semibold px-2 py-1.5 rounded-lg shrink-0">
                  {activeTransferInfo.asset.assetTag}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{activeTransferInfo.asset.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-500">
                    <span>Serial: <strong className="font-mono text-slate-700">{activeTransferInfo.asset.serialNumber || "N/A"}</strong></span>
                    <span>&bull;</span>
                    <span>Cost: <strong className="text-slate-700 font-mono">{formatCurrency(activeTransferInfo.asset.purchaseCost)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Relocation Path Graphic */}
              <div className="grid grid-cols-2 text-center relative py-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60 p-3">
                {/* Source location */}
                <div className="space-y-1 pr-3 border-r border-indigo-100/60">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Source Station</span>
                  <p className="text-[10.5px] font-extrabold text-slate-800 line-clamp-1">
                    {db.locations.find(l => l.id === activeTransferInfo.sourceLocationId)?.name.replace("HQ Building - ", "") || "Unplaced"}
                  </p>
                </div>

                {/* Target location */}
                <div className="space-y-1 pl-3">
                  <span className="text-[8px] uppercase tracking-wider text-slate-405 block font-bold">Target Station</span>
                  <p className="text-[10.5px] font-extrabold text-indigo-800 line-clamp-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-555 inline" /> 
                    {db.locations.find(l => l.id === activeTransferInfo.destLocationId)?.name.replace("HQ Building - ", "")}
                  </p>
                </div>

                {/* Center visual indicator */}
                <span className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] bg-indigo-200 border border-indigo-400 p-1.5 rounded-full text-indigo-705">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Destination Department Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-655 font-bold">Assign Target Custody Department</label>
                <select
                  value={destDeptId}
                  onChange={(e) => setDestDeptId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400 font-medium cursor-pointer text-xs"
                >
                  {db.departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-405 italic">
                  * Dynamic Suggestion: Location codes map automatically to department hierarchies. Feel free to override.
                </p>
              </div>

              {/* Transfer Justification / Remarks */}
              <div className="space-y-1.5">
                <label className="text-slate-655 font-bold">Transfer Authorization Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="State the core reasoning for this location change..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-850 focus:outline-none focus:border-slate-400 font-medium text-xs h-20"
                  required
                />
              </div>

              {/* Administrative Self-Authorization Override Panel */}
              {isEditable ? (
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-650" /> Instant Relocation Bypass
                      </h5>
                      <p className="text-[10px] text-slate-405 font-medium leading-none mt-0.5">
                        Apply changes immediately to active inventory database.
                      </p>
                    </div>
                    {/* Switch */}
                    <button
                      type="button"
                      onClick={() => setInstantMove(!instantMove)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                        instantMove ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                        instantMove ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-2 text-amber-80 * text-[10.5px]">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-normal font-medium text-amber-705">
                    <strong>Standard Custody Rules:</strong> Since your authorization matches staff privileges, submitting this will route a formal <strong>Pending Relocation Request</strong> to the Asset Manager queue.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTransferInfo(null)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-600 font-bold border border-slate-200 py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer text-center text-xs"
                >
                  {instantMove ? "Confirm & Move Asset" : "Request Authorization"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
