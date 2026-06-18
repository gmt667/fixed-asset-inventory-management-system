/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ArchiveRestore,
  Trash2,
  LockKeyhole,
  CheckCircle,
  Plus,
  ArrowRight,
  User,
  X,
  PlusSquare,
  FileSpreadsheet
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, formatCurrency } from "../db";
import { Asset, DisposalRecord, AssetStatus, UserRole } from "../types";

interface AssetDisposalProps {
  userRole: UserRole;
  currentUserId: string;
}

export default function AssetDisposal({ userRole, currentUserId }: AssetDisposalProps) {
  const [db, setDb] = useState(() => getDatabaseState());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form parameters
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [method, setMethod] = useState("Scrapped");
  const [reason, setReason] = useState("");
  const [docs, setDocs] = useState("");

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  const isEditable = useMemo(() => {
    return userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  }, [userRole]);

  // List of scrapable assets (i.e., not already disposed)
  const disposableAssets = useMemo(() => {
    return db.assets.filter(a => a.status !== AssetStatus.DISPOSED);
  }, [db.assets]);

  const handlePerformDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !reason) {
      alert("Please specify asset and write disposal reasons.");
      return;
    }

    const currentDB = getDatabaseState();
    const assetObj = currentDB.assets.find(a => a.id === selectedAssetId);
    if (!assetObj) return;

    // 1. Update Asset status to Disposed and clear assignment
    assetObj.status = AssetStatus.DISPOSED;
    assetObj.assignedUserId = undefined;

    // 2. Clear from any checkout registers
    currentDB.assignments = currentDB.assignments.map(a => {
      if (a.assetId === selectedAssetId && a.status === "Active") {
        return { ...a, status: "Returned", returnDate: new Date().toISOString().split("T")[0] };
      }
      return a;
    });

    // 3. Add disposal record
    const reviewerUser = currentDB.users.find(u => u.id === currentUserId);
    const reviewerName = reviewerUser ? reviewerUser.name : userRole;

    const nextDisposal: DisposalRecord = {
      id: `disp-${Date.now()}`,
      assetId: selectedAssetId,
      disposalDate: new Date().toISOString().split("T")[0],
      method,
      reason,
      authorizedBy: reviewerName,
      supportingDocuments: docs || "GPL-DISP-DOC-AUTO.pdf"
    };

    currentDB.disposals.unshift(nextDisposal);
    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Asset Disposed",
      `Retired dynamic asset Tag: ${assetObj.assetTag} (${assetObj.name}) using method: ${method}`
    );
    
    triggerNotification(
      "all",
      "Asset Retired",
      `Equipment tag ${assetObj.assetTag} was officially retired and disposed from stock counts.`,
      "info"
    );

    setIsModalOpen(false);
    setSelectedAssetId("");
    setReason("");
    setDocs("");
    refreshDb();
  };

  // Compute stats
  const totalFinancialRetiredCount = useMemo(() => {
    return db.disposals.length;
  }, [db.disposals]);

  const scrapValuePort = useMemo(() => {
    // Aggregates total initial costs of retired portfolios to review writeoff totals
    return db.disposals.reduce((sum, d) => {
      const match = db.assets.find(a => a.id === d.assetId);
      return sum + (match ? match.purchaseCost : 0);
    }, 0);
  }, [db.disposals, db.assets]);

  return (
    <div className="space-y-6">
      
      {/* 2 Stats columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Decompacted Assets</span>
            <h3 className="text-xl font-bold font-display text-slate-900">{totalFinancialRetiredCount} retired files</h3>
          </div>
          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center font-bold font-mono">X</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Aggregated Write-off Capital</span>
            <h3 className="text-xl font-bold font-display text-rose-600 font-mono">
              {formatCurrency(scrapValuePort)}
            </h3>
          </div>
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-bold font-mono">MWK</div>
        </div>
      </div>

      {/* Main ledger and registration card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 flex items-center gap-2">
              <ArchiveRestore className="w-5 h-5 text-emerald-600" /> Asset De-registration & Disposal logs
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              De-register assets that are fully scrapped, broken, or sold. Records must specify authorized parameters and reference file sheets.
            </p>
          </div>
          
          {isEditable && (
            <button
              onClick={() => {
                if (disposableAssets.length === 0) return;
                setSelectedAssetId(disposableAssets[0].id);
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Finalize Asset Disposal
            </button>
          )}
        </div>

        {/* Data list list */}
        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          {db.disposals.length === 0 ? (
            <p className="text-slate-400 text-center py-12 italic">No assets discarded yet.</p>
          ) : (
            db.disposals.map(d => {
              const asset = db.assets.find(a => a.id === d.assetId);
              return (
                <div key={d.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors bg-white">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono bg-slate-150 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        Tag: {asset ? asset.assetTag : "GPL-DELETED"}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                        Method: {d.method}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-950 font-display">
                      {asset ? asset.name : "System purged database record"}
                    </h4>

                    {d.reason && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-50 py-1.5 px-3 rounded-lg max-w-lg truncate">{d.reason}</p>
                    )}
                  </div>

                  {/* Metadata and authorization info */}
                  <div className="text-left sm:text-right shrink-0 text-[10px] font-mono leading-tight space-y-0.5 text-slate-400 font-medium">
                    <span className="block text-slate-600 font-semibold">Authorized: {d.authorizedBy}</span>
                    <span className="block">Retired date: {d.disposalDate}</span>
                    <span className="block text-slate-500">Document Binding: {d.supportingDocuments}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Disposal Form Modal sheet */}
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
              <h3 className="text-base font-display font-semibold">Asset Disposal Handshake</h3>
              <p className="text-[10px] text-slate-300">Retired, sold, or scrapped portfolios cannot revert to active grids.</p>
            </div>

            <form onSubmit={handlePerformDisposal} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Select Target Stock Asset *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {disposableAssets.map(ast => (
                    <option key={ast.id} value={ast.id}>
                      {ast.assetTag} - {ast.name} (Value: {formatCurrency(ast.purchaseCost)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Disposal Method *</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="Scrapped">Scrapped & Written Off</option>
                  <option value="Sold">Sold in B2B Auction</option>
                  <option value="Donated">Donated to charity</option>
                  <option value="Recycled">Recycled (Corporate green policy)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display font-mono">Contract Reference Doc PDF</label>
                <input
                  type="text"
                  placeholder="e.g. GPL-SCRAP-DOC-112.pdf"
                  value={docs}
                  onChange={(e) => setDocs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Disposal reasons & writeoff details *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Broken motherboard. Repair costs exceed valuation values, scrapped according to CEO memo directive..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl -mx-6 -mb-6 mt-4 font-semibold">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  De-register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
