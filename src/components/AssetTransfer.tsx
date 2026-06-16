/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  FileCode,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ArrowRight,
  MoveHorizontal,
  MapPin,
  Building,
  UserCheck,
  X
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, subscribeToDatabaseState } from "../db";
import { Asset, AssetTransfer, TransferStatus, UserRole } from "../types";
import { can } from "../permissions";

interface AssetTransferProps {
  userRole: UserRole;
  currentUserId: string;
}

export default function AssetTransferComponent({ userRole, currentUserId }: AssetTransferProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form parameters
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [destDeptId, setDestDeptId] = useState("");
  const [destLocId, setDestLocId] = useState("");
  const [remarks, setRemarks] = useState("");

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  React.useEffect(() => {
    return subscribeToDatabaseState(refreshDb);
  }, []);

  const isCoordinator = useMemo(() => {
    return can(userRole, "asset:transfer");
  }, [userRole]);

  const canAuthorizeTransfers = useMemo(() => {
    return userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  }, [userRole]);

  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCoordinator) {
      alert("Your role cannot request asset transfers.");
      return;
    }
    if (!selectedAssetId || !destDeptId || !destLocId) {
      alert("Please satisfy all destination parameters.");
      return;
    }

    const currentDB = getDatabaseState();
    const assetObj = currentDB.assets.find(a => a.id === selectedAssetId);
    if (!assetObj) return;

    if (assetObj.departmentId === destDeptId && assetObj.locationId === destLocId) {
      alert("Relocation sources matches destination targets!");
      return;
    }

    const newTransfer: AssetTransfer = {
      id: `trf-${Date.now()}`,
      assetId: selectedAssetId,
      sourceDepartmentId: assetObj.departmentId,
      destDepartmentId: destDeptId,
      sourceLocationId: assetObj.locationId,
      destLocationId: destLocId,
      status: TransferStatus.PENDING,
      transferDate: new Date().toISOString().split("T")[0],
      remarks
    };

    currentDB.transfers.unshift(newTransfer);
    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Asset Transfer Initiated",
      `Created relocation request for Tag: ${assetObj.assetTag} from ${
        currentDB.departments.find(d => d.id === assetObj.departmentId)?.name
      } to ${currentDB.departments.find(d => d.id === destDeptId)?.name}`
    );
    
    // Notify department manager
    triggerNotification("all", "Relocation Request Initiated", `Transfer submitted for asset ${assetObj.assetTag} under approval.`, "info");
    
    setIsModalOpen(false);
    setSelectedAssetId("");
    setDestDeptId("");
    setDestLocId("");
    setRemarks("");
    refreshDb();
  };

  const handleAuthorize = (transferId: string, approve: boolean) => {
    if (!canAuthorizeTransfers) {
      alert("Only Administrators and Asset Managers can approve or reject transfer requests.");
      return;
    }
    const currentDB = getDatabaseState();
    const trfIndex = currentDB.transfers.findIndex(t => t.id === transferId);
    if (trfIndex === -1) return;

    const transfer = currentDB.transfers[trfIndex];
    if (transfer.status !== TransferStatus.PENDING) return;

    const reviewerObj = currentDB.users.find(u => u.id === currentUserId);
    const reviewerName = reviewerObj ? reviewerObj.name : userRole;

    if (approve) {
      transfer.status = TransferStatus.APPROVED;
      transfer.authorizedBy = reviewerName;

      // Relocate physical asset variables!
      const assetIdx = currentDB.assets.findIndex(a => a.id === transfer.assetId);
      if (assetIdx !== -1) {
        currentDB.assets[assetIdx].departmentId = transfer.destDepartmentId;
        currentDB.assets[assetIdx].locationId = transfer.destLocationId;
        const assetObj = currentDB.assets[assetIdx];
        
        addAuditRecord(
          currentUserId,
          userRole,
          "Asset Transfer Approved",
          `Sanctioned relocation of Tag: ${assetObj.assetTag} to ${
            currentDB.departments.find(d => d.id === transfer.destDepartmentId)?.name
          }`
        );
        triggerNotification(
          assetObj.assignedUserId || "all",
          "Transfer Approved",
          `Asset ${assetObj.assetTag} has been relocated and approved by ${reviewerName}.`,
          "success"
        );
      }
    } else {
      transfer.status = TransferStatus.REJECTED;
      transfer.authorizedBy = reviewerName;
      addAuditRecord(currentUserId, userRole, "Asset Transfer Rejected", `Rejected relocation of asset ID ${transfer.assetId}`);
    }

    saveDatabaseState(currentDB);
    refreshDb();
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <MoveHorizontal className="w-5 h-5 text-emerald-600" /> Asset Transfer & Relocation Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Initiate department handovers, adjust rooms/locations of capital equipment, and track authorized approvals.
          </p>
        </div>
        
        {isCoordinator && (
          <button
            onClick={() => {
              if (db.assets.length === 0) return;
              setSelectedAssetId(db.assets[0].id);
              setDestDeptId(db.departments[0]?.id || "");
              setDestLocId(db.locations[0]?.id || "");
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Move / Transfer Asset
          </button>
        )}
      </div>

      {/* Main List Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Relocation Request Registers ({db.transfers.length} records)</span>
          <span className="font-semibold text-slate-900">Department authorizations required</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          {db.transfers.length === 0 ? (
            <p className="text-slate-400 text-center py-12 italic">No transfers registered in active FAIMS databases.</p>
          ) : (
            db.transfers.map(trf => {
              const asset = db.assets.find(a => a.id === trf.assetId);
              
              const srcDept = db.departments.find(d => d.id === trf.sourceDepartmentId);
              const dstDept = db.departments.find(d => d.id === trf.destDepartmentId);
              
              const srcLoc = db.locations.find(l => l.id === trf.sourceLocationId);
              const dstLoc = db.locations.find(l => l.id === trf.destLocationId);

              return (
                <div key={trf.id} className="p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Upper tag indicators */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                        {asset ? asset.assetTag : "GPL-DEL"}
                      </span>
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                        trf.status === TransferStatus.APPROVED ? "bg-emerald-100 text-emerald-800" :
                        trf.status === TransferStatus.REJECTED ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800 animate-pulse"
                      }`}>
                        {trf.status}
                      </span>
                    </div>

                    <h4 className="text-slate-900 font-bold text-[13px] font-display truncate">
                      {asset ? asset.name : "System purged dynamic asset record"}
                    </h4>

                    {/* Relocation Route Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1.5 text-[11px] max-w-lg font-medium text-slate-500">
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-rose-600 text-[10px] block uppercase font-bold">Transfer Source Point:</span>
                        <div className="space-y-0.5 mt-0.5 text-slate-800 font-semibold truncate">
                          <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" /> {srcDept ? srcDept.name : "Corp Admin"}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {srcLoc ? srcLoc.name : "Floor 2"}</span>
                        </div>
                      </div>

                      <div className="space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        <span className="text-emerald-700 text-[10px] block uppercase font-bold">Transfer Destination:</span>
                        <div className="space-y-0.5 mt-0.5 text-slate-800 font-semibold truncate">
                          <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" /> {dstDept ? dstDept.name : "IT Lab"}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {dstLoc ? dstLoc.name : "Engineering"}</span>
                        </div>
                      </div>
                    </div>

                    {trf.remarks && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-50/75 py-1.5 px-3 rounded-lg max-w-md">{trf.remarks}</p>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row md:flex-col justify-between items-end gap-3.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right text-[10px] leading-tight space-y-0.5 text-slate-400 font-medium">
                      <span className="block text-slate-500">Move Date: {trf.transferDate}</span>
                      {trf.authorizedBy && <span className="block text-slate-600 font-semibold">Authorized: {trf.authorizedBy}</span>}
                    </div>

                    {trf.status === TransferStatus.PENDING && canAuthorizeTransfers && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAuthorize(trf.id, true)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAuthorize(trf.id, false)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Relocation Move Modal wizard form */}
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
              <h3 className="text-base font-display font-semibold">Perform Relocation relocation</h3>
              <p className="text-[10px] text-slate-300">Requires coordinator validation approval on submission.</p>
            </div>

            <form onSubmit={handleInitiateTransfer} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Select Target Fixed Asset *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {db.assets.filter(a => a.status !== "Disposed").map(ast => (
                    <option key={ast.id} value={ast.id}>{ast.assetTag} - {ast.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Destination Department Target *</label>
                <select
                  required
                  value={destDeptId}
                  onChange={(e) => setDestDeptId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {db.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Destination Site / Room Location *</label>
                <select
                  required
                  value={destLocId}
                  onChange={(e) => setDestLocId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {db.locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Transfer Reasons / Relocation Comments</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Allocation shifted representing new hiring inside IT Engineering Lab 204."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
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
                  Submit Relocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
