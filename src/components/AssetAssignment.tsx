/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Users,
  CheckCircle,
  FileText,
  Clock,
  Plus,
  ArrowRight,
  UserPlus,
  Calendar,
  X,
  UserCheck2,
  LockKeyhole
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, subscribeToDatabaseState } from "../db";
import { Asset, AssetAssignment, AssetStatus, User, UserRole } from "../types";

interface AssetAssignmentProps {
  userRole: UserRole;
  currentUserId: string;
}

export default function AssetAssignmentComponent({ userRole, currentUserId }: AssetAssignmentProps) {
  const [db, setDb] = useState(() => getDatabaseState());
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Checkout Form
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split("T")[0]);

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  React.useEffect(() => {
    return subscribeToDatabaseState(refreshDb);
  }, []);

  const isEditable = useMemo(() => {
    return userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  }, [userRole]);

  // List of active unassigned assets
  const unassignedAssets = useMemo(() => {
    return db.assets.filter(a => !a.assignedUserId && a.status === AssetStatus.ACTIVE);
  }, [db.assets]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedUserId) {
      alert("Please designate both asset and employee targets.");
      return;
    }

    const currentDB = getDatabaseState();
    
    // 1. Update asset assignedUserId
    const assetIndex = currentDB.assets.findIndex(a => a.id === selectedAssetId);
    if (assetIndex === -1) return;
    currentDB.assets[assetIndex].assignedUserId = selectedUserId;
    
    const userMatched = currentDB.users.find(u => u.id === selectedUserId);
    const assetMatched = currentDB.assets[assetIndex];

    // 2. Add dynamic assignment record
    const nextAssignment: AssetAssignment = {
      id: `asg-${Date.now()}`,
      assetId: selectedAssetId,
      userId: selectedUserId,
      departmentId: userMatched ? userMatched.departmentId : assetMatched.departmentId,
      assignedDate: assignDate,
      status: "Active",
      remarks
    };

    currentDB.assignments.unshift(nextAssignment);
    
    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Asset Assignment Set",
      `Assigned asset Tag: ${assetMatched.assetTag} (${assetMatched.name}) to employee ${userMatched?.name || selectedUserId}`
    );
    triggerNotification(
      selectedUserId,
      "New Asset Assigned",
      `Asset ${assetMatched.assetTag} was checkout to you successfully.`,
      "success"
    );

    setIsModalOpen(false);
    setSelectedAssetId("");
    setSelectedUserId("");
    setRemarks("");
    refreshDb();
  };

  const handleProcessReturn = (assignmentId: string) => {
    if (!confirm("Are you sure you want to record the official return of this asset?")) return;

    const currentDB = getDatabaseState();
    
    // Find active assignment
    const asgIndex = currentDB.assignments.findIndex(a => a.id === assignmentId);
    if (asgIndex === -1) return;
    
    const assignment = currentDB.assignments[asgIndex];
    assignment.status = "Returned";
    assignment.returnDate = new Date().toISOString().split("T")[0];

    // Remove binding from corresponding asset record
    const assetIndex = currentDB.assets.findIndex(a => a.id === assignment.assetId);
    if (assetIndex !== -1) {
      currentDB.assets[assetIndex].assignedUserId = undefined;
      const assetMatched = currentDB.assets[assetIndex];
      const userMatched = currentDB.users.find(u => u.id === assignment.userId);
      
      addAuditRecord(
        currentUserId,
        userRole,
        "Asset Return Processed",
        `Released assignment of Tag: ${assetMatched.assetTag}. Received back from: ${userMatched?.name || "Employee"}`
      );
      triggerNotification(
        assignment.userId,
        "Asset Return Confirmed",
        `Receipt of physical asset ${assetMatched.assetTag} has been catalogued.`,
        "info"
      );
    }

    saveDatabaseState(currentDB);
    refreshDb();
  };

  return (
    <div className="space-y-6">
      {/* Upper bar banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <UserCheck2 className="w-5 h-5 text-emerald-600" /> Asset Assignment & Checkout Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain strict end-user accountability. Allocate physical equipment to employees and sign off returned gear.
          </p>
        </div>
        
        {isEditable && (
          <button
            onClick={() => {
              if (unassignedAssets.length === 0) {
                alert("All ready active assets in FAIMS are currently checkout out. Register more assets or process returns first!");
                return;
              }
              setSelectedAssetId(unassignedAssets[0].id);
              setSelectedUserId(db.users[0]?.id || "");
              setAssignDate(new Date().toISOString().split("T")[0]);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Issue Asset / Handover
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Unassigned assets inventory summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Ready unallocated Pool ({unassignedAssets.length})
          </h3>
          <p className="text-[11px] text-slate-400">These active assets are not checkout or bound to specific users and can be issued immediately.</p>
          
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {unassignedAssets.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No unassigned active assets in stock.</p>
            ) : (
              unassignedAssets.map(ast => (
                <div key={ast.id} className="p-3 bg-slate-50/70 border border-slate-150 rounded-lg text-xs hover:border-slate-300 transition-all">
                  <div className="flex justify-between font-mono font-semibold text-slate-700">
                    <span>{ast.assetTag}</span>
                    <span>${ast.purchaseCost.toLocaleString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 mt-1 truncate">{ast.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{db.locations.find(l => l.id === ast.locationId)?.name || "Main Offices"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Primary interactive assignments list table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
            <span>Historical handover transactions ({db.assignments.length} matches)</span>
            <span className="font-semibold text-slate-900">Database Core synchronized</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {db.assignments.length === 0 ? (
              <p className="text-slate-400 text-center py-12 italic">No handover checkout histories recorded.</p>
            ) : (
              db.assignments.map(asg => {
                const asset = db.assets.find(a => a.id === asg.assetId);
                const userObj = db.users.find(u => u.id === asg.userId);
                const departmentDetails = db.departments.find(d => d.id === asg.departmentId);

                return (
                  <div key={asg.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Title line */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {asset ? asset.assetTag : "GPL-AST-DEL"}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          asg.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500"
                        }`}>
                          {asg.status}
                        </span>
                      </div>

                      <div className="text-slate-950 font-semibold text-[13px] truncate">
                        {asset ? asset.name : "System purged database entry"}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 text-[11px] text-slate-500 font-medium">
                        <span className="truncate">Assignee Desk: <strong className="text-slate-700">{userObj ? userObj.name : "Ex-Staff"}</strong></span>
                        <span>Official Dept: {departmentDetails ? departmentDetails.name : "Corp Office"}</span>
                      </div>

                      {asg.remarks && (
                        <p className="text-[10px] text-slate-400 italic font-sans truncate bg-slate-50 py-1 px-2 rounded-md max-w-sm mt-1">{asg.remarks}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 pt-3.5 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-left sm:text-right font-medium text-slate-400 text-[10px] space-y-0.5">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Start: {asg.assignedDate}
                        </span>
                        {asg.returnDate && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Return: {asg.returnDate}
                          </span>
                        )}
                      </div>

                      {asg.status === "Active" && isEditable && (
                        <button
                          onClick={() => handleProcessReturn(asg.id)}
                          className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 rounded-lg shadow-sm cursor-pointer transition-colors"
                        >
                          Record Return
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Asset Handover Handshake modal */}
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
              <h3 className="text-base font-display font-semibold">Perform Physical Asset Checkout</h3>
              <p className="text-[10px] text-slate-300">Registers handover of dynamic asset portfolio.</p>
            </div>

            <form onSubmit={handleCheckout} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Available Stock Asset *</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {unassignedAssets.map(ast => (
                    <option key={ast.id} value={ast.id}>{ast.assetTag} - {ast.name} (${ast.purchaseCost.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Handover Employee *</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {db.users.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.role} - {db.departments.find(d => d.id === user.departmentId)?.name || "Admin"})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Handover checkout Date *</label>
                <input
                  type="date"
                  required
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Remarks & Condition on Handover</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Workstation checkout out with power block and laptop sleeve in excellent order."
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
                  Initiate Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
