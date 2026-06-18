/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  FileCheck,
  Check,
  Plus,
  ArrowRight,
  User,
  X,
  PlusSquare,
  BadgeAlert,
  Camera,
  QrCode,
  Sliders
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, isOffline, addBufferedVerification, getBufferedVerifications, syncOfflineData } from "../db";
import { Asset, VerificationRecord, AssetStatus, AssetCondition, VerificationResult, UserRole } from "../types";
import { can } from "../permissions";

interface AssetVerificationProps {
  userRole: UserRole;
  currentUserId: string;
  directAssetIdForVerification?: string | null;
  resetVerificationSelection?: () => void;
}

export default function AssetVerification({
  userRole,
  currentUserId,
  directAssetIdForVerification,
  resetVerificationSelection
}: AssetVerificationProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [offline, setOffline] = useState(isOffline());
  const [offlineVerifications, setOfflineVerifications] = useState<VerificationRecord[]>(getBufferedVerifications());

  // Form parameters
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [result, setResult] = useState<VerificationResult>(VerificationResult.VERIFIED);
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<AssetCondition>(AssetCondition.GOOD);

  // Camera scanning states for inventory audits
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraScanError, setCameraScanError] = useState<string | null>(null);
  const [cameraScanTab, setCameraScanTab] = useState<"camera" | "simulation">("camera");
  const [manualTagInput, setManualTagInput] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Parse scanned QR code data for automatic redirection
  const parseScannedData = (data: string, assetsList: Asset[]): Asset | null => {
    if (!data) return null;
    const cleaned = data.trim();

    // 1. URL pattern matching (e.g., https://faims.local/assets/profile/GPL-AST-0002)
    const urlMatch = cleaned.match(/\/profile\/([A-Za-z0-9-_]+)/i);
    if (urlMatch && urlMatch[1]) {
      const matchedTag = urlMatch[1].toUpperCase();
      const found = assetsList.find(a => a.assetTag.toUpperCase() === matchedTag);
      if (found) return found;
    }

    // 2. JSON pattern parsing (e.g. {"tag": "GPL-AST-0002"})
    try {
      const parsed = JSON.parse(cleaned);
      const tag = (parsed.tag || parsed.assetTag || "").trim().toUpperCase();
      if (tag) {
        const found = assetsList.find(a => a.assetTag.toUpperCase() === tag);
        if (found) return found;
      }
    } catch (e) {
      // not valid JSON, ignore
    }

    // 3. Strict match
    const upperScanned = cleaned.toUpperCase();
    for (const asset of assetsList) {
      const upperTag = asset.assetTag.toUpperCase();
      if (upperScanned === upperTag || upperScanned.includes(upperTag)) {
        return asset;
      }
    }

    return null;
  };

  const getCameraDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        const backCam = videoDevices.find(d => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("environment") ||
          d.label.toLowerCase().includes("rear")
        );
        setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Camera permissions or enumeration failed", err);
      setCameraScanError("Permission to access the camera was denied, or no device is ready.");
    }
  };

  const startCamera = async () => {
    setCameraScanError(null);
    setIsCameraActive(true);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: "environment" }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error securing webcam video feed stream:", err);
      setCameraScanError("Failed to lock secure camera capture feed. Ensure permissions are allowed.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Real-time canvas scanner loop using loop ticks & jsQR
  useEffect(() => {
    let animationFrameId: number;
    let isStopped = false;

    const tick = async () => {
      if (isStopped) return;

      if (
        isCameraActive &&
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          try {
            const jsQRModule = (await import("jsqr")).default;
            const code = jsQRModule(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });

            if (code && code.data) {
              console.log("Captured real-time optical barcode data link in Audit:", code.data);
              const foundAsset = parseScannedData(code.data, db.assets);
              
              if (foundAsset) {
                // Succeeded! Load result details
                setSelectedAssetId(foundAsset.id);
                setIsModalOpen(true);
                setIsScannerOpen(false);
                stopCamera();
                isStopped = true;

                addAuditRecord(
                  currentUserId,
                  userRole,
                  "QR Audit Lookup",
                  `Identified and selected asset Tag "${foundAsset.assetTag}" via physical QR camera scan for inventory audit.`
                );
                triggerNotification(
                  currentUserId,
                  "Asset QR Scanned",
                  `Asset ${foundAsset.assetTag} successfully parsed and selected.`,
                  "success"
                );
                return;
              } else {
                setCameraScanError(`Scanned unrecognized code: "${code.data.substring(0, 35)}"`);
              }
            }
          } catch (err) {
            console.error("Critical error in frame parsing execution loop:", err);
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isCameraActive) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      isStopped = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraActive, selectedCameraId, db.assets]);

  // Clean-up routines
  useEffect(() => {
    if (!isScannerOpen) {
      stopCamera();
    } else {
      getCameraDevices();
    }
  }, [isScannerOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const handleNetworkChange = () => {
      setOffline(isOffline());
      setOfflineVerifications(getBufferedVerifications());
    };
    const handleBufferChange = () => {
      setOfflineVerifications(getBufferedVerifications());
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

  useEffect(() => {
    if (directAssetIdForVerification) {
      if (can(userRole, "asset:verification")) {
        setSelectedAssetId(directAssetIdForVerification);
        setIsModalOpen(true);
      }
      if (resetVerificationSelection) resetVerificationSelection();
    }
  }, [directAssetIdForVerification, resetVerificationSelection, userRole]);

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  const canPerformVerification = useMemo(() => {
    return can(userRole, "asset:verification");
  }, [userRole]);

  const handlePerformAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformVerification) {
      alert("Your role can view verification records but cannot create verification records.");
      return;
    }
    if (!selectedAssetId) {
      alert("Please select target asset.");
      return;
    }

    const currentDB = getDatabaseState();
    const assetObj = currentDB.assets.find(a => a.id === selectedAssetId);
    if (!assetObj) return;
    if (userRole === UserRole.DEPT_MANAGER) {
      const currentUser = currentDB.users.find(user => user.id === currentUserId);
      if (currentUser && assetObj.departmentId !== currentUser.departmentId) {
        alert("Department Managers can only verify assets within their own department.");
        return;
      }
    }

    // Map result type to Asset state Status
    let targetStatus = AssetStatus.ACTIVE;
    if (result === VerificationResult.MISSING) {
      targetStatus = AssetStatus.LOST;
    } else if (result === VerificationResult.DAMAGED) {
      targetStatus = AssetStatus.DAMAGED;
    }

    // 2. Add verification record
    const reviewerUser = currentDB.users.find(u => u.id === currentUserId);
    const reviewerName = reviewerUser ? reviewerUser.name : userRole;

    const nextVerification: VerificationRecord = {
      id: `vrf-${Date.now()}`,
      assetId: selectedAssetId,
      verificationDate: new Date().toISOString().split("T")[0],
      verifiedBy: reviewerName,
      status: targetStatus,
      condition,
      result,
      notes
    };

    if (isOffline()) {
      addBufferedVerification(nextVerification);
      addAuditRecord(
        currentUserId,
        userRole,
        "Offline Asset Verification Buffered",
        `[OFFLINE COMPLIANCE] Audited item Tag: ${assetObj.assetTag} (${assetObj.name}). Concluded results: ${result} / state: ${targetStatus}. Buffered in local queue.`
      );
      alert("[Offline Mode Enabled] Inspection details saved securely inside client browser cache. The record will synchronize automatically when connection is re-established.");
    } else {
      // 1. Update Asset variables inside DB state directly
      assetObj.condition = condition;
      assetObj.status = targetStatus;

      currentDB.verifications.unshift(nextVerification);
      saveDatabaseState(currentDB);
      addAuditRecord(
        currentUserId,
        userRole,
        "Asset Audit Verified",
        `Audited item Tag: ${assetObj.assetTag} (${assetObj.name}). Concluded results: ${result} / state: ${targetStatus}`
      );
      
      triggerNotification(
        "all",
        "Asset Audit Completed",
        `Asset ${assetObj.assetTag} verification concluded: ${result}.`,
        result === VerificationResult.VERIFIED ? "success" : "error"
      );
    }

    setIsModalOpen(false);
    setSelectedAssetId("");
    setNotes("");
    refreshDb();
  };

  // Summaries
  const verifiedStats = useMemo(() => {
    const list = db.verifications;
    return {
      verified: list.filter(v => v.result === VerificationResult.VERIFIED).length,
      missing: list.filter(v => v.result === VerificationResult.MISSING).length,
      damaged: list.filter(v => v.result === VerificationResult.DAMAGED).length,
    };
  }, [db.verifications]);

  return (
    <div className="space-y-6">
      
      {/* 3 columns Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Checked & Mapped</span>
            <h3 className="text-xl font-bold font-display text-emerald-600">{verifiedStats.verified} Verified</h3>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">✓</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Inspected Damaged</span>
            <h3 className="text-xl font-bold font-display text-rose-600">{verifiedStats.damaged} Defective</h3>
          </div>
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-bold">⚠</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Unresolved Missing</span>
            <h3 className="text-xl font-bold font-display text-slate-700">{verifiedStats.missing} Lost / Misplaced</h3>
          </div>
          <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-bold">?</div>
        </div>
      </div>

      {/* Primary table box */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600 animate-pulse" /> FAIMS Physical Ledger Verification
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Oversee inventory physical audits. Assess equipment condition grades, flags broken items, and check ledger matches.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-audits-qr-scan"
              onClick={() => setIsScannerOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-400 animate-pulse" /> Camera QR Scanner
            </button>

            {canPerformVerification && (
              <button
                onClick={() => {
                  const currentUser = db.users.find(user => user.id === currentUserId);
                  const availableAssets = userRole === UserRole.DEPT_MANAGER && currentUser
                    ? db.assets.filter(asset => asset.departmentId === currentUser.departmentId)
                    : db.assets;
                  if (availableAssets.length === 0) return;
                  setSelectedAssetId(availableAssets[0].id);
                  setIsModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Perform Physical Verification
              </button>
            )}
          </div>
        </div>

        {/* Data list lists */}
        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          {/* OFFLINE BUFFERED TRANSACTIONS QUEUE ACCORDION PANEL */}
          {offlineVerifications.length > 0 && (
            <div className="bg-amber-500/5 px-6 py-5 border-b border-amber-300/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] bg-amber-500 text-slate-900 font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    PENDING OFFLINE INSPECTION BUFFER ({offlineVerifications.length} UN-SYNCED)
                  </span>
                </div>
                {!offline && (
                  <button
                    onClick={() => syncOfflineData()}
                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded transition-colors"
                  >
                    Sync Queue Now
                  </button>
                )}
              </div>
              <p className="text-slate-500 mb-4 text-[11px] leading-relaxed">
                The following physical status checks were recorded while disconnected. These records are cached locally and survive system reloads. Once connection is Online, they integrate immediately.
              </p>
              
              <div className="divide-y divide-amber-200/40 border-t border-amber-200/30">
                {offlineVerifications.map(v => {
                  const asset = db.assets.find(a => a.id === v.assetId);
                  return (
                    <div key={v.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[9px]">
                            {asset ? asset.assetTag : "GPL-AST"}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Offline Result: {v.result}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-800">{asset ? asset.name : "Target item details"}</h5>
                        {v.notes && <p className="text-[10px] text-amber-900 italic text-amber-850">“{v.notes}”</p>}
                      </div>
                      <div className="text-left sm:text-right shrink-0 text-[10px] font-mono text-slate-500">
                        <span className="block font-semibold">User: {v.verifiedBy}</span>
                        <span className="block">Date Offline: {v.verificationDate}</span>
                        <span className="block text-amber-600 font-bold">● Waiting state sync</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {db.verifications.length === 0 && offlineVerifications.length === 0 ? (
            <p className="text-slate-400 text-center py-12 italic">No verification records logged in active folder databases.</p>
          ) : (
            db.verifications.map(v => {
              const asset = db.assets.find(a => a.id === v.assetId);
              return (
                <div key={v.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                        {asset ? asset.assetTag : "GPL-DEL"}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        v.result === VerificationResult.VERIFIED ? "bg-emerald-100 text-emerald-800" :
                        v.result === VerificationResult.DAMAGED ? "bg-rose-100 text-rose-850" :
                        "bg-red-200 text-red-900 font-bold"
                      }`}>
                        Outcome: {v.result}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-950 font-display truncate">
                      {asset ? asset.name : "System purged database record"}
                    </h4>

                    {v.notes && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-50 py-1.5 px-3 rounded-lg max-w-lg truncate">{v.notes}</p>
                    )}
                  </div>

                  {/* Inspector details and metadata */}
                  <div className="text-left sm:text-right shrink-0 text-[10px] leading-tight space-y-0.5 text-slate-400 font-medium font-mono">
                    <span className="block text-slate-600 font-semibold flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Assessor: {v.verifiedBy}
                    </span>
                    <span className="block">Audited on Date: {v.verificationDate}</span>
                    <span className="block text-slate-500">Inventory Status Set: {v.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Physical Audit Modal dialog form */}
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
              <h3 className="text-base font-display font-semibold">Perform Fixed Asset Audit</h3>
              <p className="text-[10px] text-slate-300">Sets master inventory parameters upon verification.</p>
            </div>

            <form onSubmit={handlePerformAudit} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 font-display">Select Audited Asset *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScannerOpen(true);
                    }}
                    className="text-emerald-600 hover:text-emerald-500 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Scan QR Label
                  </button>
                </div>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {db.assets.filter(a => {
                    if (a.status === AssetStatus.DISPOSED) return false;
                    if (userRole !== UserRole.DEPT_MANAGER) return true;
                    const currentUser = db.users.find(user => user.id === currentUserId);
                    return currentUser ? a.departmentId === currentUser.departmentId : false;
                  }).map(ast => (
                    <option key={ast.id} value={ast.id}>{ast.assetTag} - {ast.name} (S/N: {ast.serialNumber})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Verification Outcome *</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as VerificationResult)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {Object.values(VerificationResult).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Assessed Condition grade *</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AssetCondition)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  {Object.values(AssetCondition).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-display">Inspector Audit comment report *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Clearly detail observations, e.g. barcode tag intact, minor surface scuffs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CAMERA SCANNER DIALOG MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-display font-semibold flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400 animate-pulse" /> Ledger QR Scanning Hub
                </h3>
                <p className="text-[10px] text-slate-300">Scan hardware asset labels with a camera or use live register lookup</p>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setIsScannerOpen(false);
                  setCameraScanError(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector tabs */}
            <div className="p-4 pb-0 bg-slate-50 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setCameraScanTab("camera");
                  }}
                  className={`py-1.5 rounded-md font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    cameraScanTab === "camera" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" /> Web Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setCameraScanTab("simulation");
                  }}
                  className={`py-1.5 rounded-md font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    cameraScanTab === "simulation" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" /> Register Lookup
                </button>
              </div>
            </div>

            {/* Main scanner canvas and register lookup view */}
            <div className="p-6 space-y-4 overflow-y-auto">
              
              {cameraScanTab === "camera" ? (
                // REAL LIVE WEBCAM SCANNER
                <div className="space-y-4">
                  <div className="aspect-video bg-slate-950 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-0 border-4 border-slate-900 shadow-inner">
                    {isCameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        />
                        {/* VIEW FINDER OVERLAY */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                          <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-lg relative flex items-center justify-center">
                            {/* Handcrafted precise corners */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500" />
                            {/* Sweeping physical lasers */}
                            <div className="absolute w-full h-[2.5px] bg-rose-500 shadow-[0_0_12px_#ef4444] rounded animate-bounce" />
                          </div>
                          <span className="text-[9.5px] font-mono font-bold text-white bg-slate-900/85 px-2.5 py-1 rounded mt-4 tracking-widest uppercase animate-pulse">
                            Align QR asset tag Code inside boundary
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center space-y-3.5 text-slate-400">
                        <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">Hardware Camera Capture Node</p>
                          <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1">
                            Click start to hook into matching browser cameras. Align code label in front of webcam lens.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-all inline-flex items-center gap-2 shadow"
                        >
                          <Camera className="w-4 h-4" /> Enable Device Camera
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Settings section */}
                  {isCameraActive && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-2 rounded text-[10px] cursor-pointer"
                      >
                        🔒 Deactivate camera
                      </button>

                      {cameraDevices.length > 1 && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 font-semibold">Source device lens:</span>
                          <select
                            className="bg-white border border-slate-200 rounded p-1 text-[10px] font-medium"
                            value={selectedCameraId}
                            onChange={(e) => {
                              setSelectedCameraId(e.target.value);
                              setTimeout(() => {
                                startCamera();
                              }, 50);
                            }}
                          >
                            {cameraDevices.map((device, idx) => (
                              <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                // Optical lookup fallback when camera access is unavailable.
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-3 font-medium">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Audit Lookup Console</span>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Enter an active asset tag from the live register when camera scanning is unavailable.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type standard tag ID, e.g., GPL-AST-0001"
                        value={manualTagInput}
                        onChange={(e) => setManualTagInput(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 px-3 py-2.5 rounded-lg text-xs font-mono font-bold flex-1 focus:outline-none focus:border-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const asset = parseScannedData(manualTagInput, db.assets);
                          if (asset) {
                            setSelectedAssetId(asset.id);
                            setIsModalOpen(true);
                            setIsScannerOpen(false);
                            addAuditRecord(
                              currentUserId,
                              userRole,
                              "QR Audit Lookup",
                              `Identified and selected asset Tag "${asset.assetTag}" via manual barcode query`
                            );
                            triggerNotification(
                              currentUserId,
                              "Asset Decoded",
                              `Asset tag matched successfully. Selected Asset: ${asset.name}.`,
                              "success"
                            );
                          } else {
                            alert(`Error: No active database asset matched string values: "${manualTagInput}"`);
                          }
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold cursor-pointer"
                      >
                        Dispatch Lookup
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Available Register Tags</span>
                    <div className="grid grid-cols-2 gap-2">
                      {db.assets.slice(0, 4).map(ast => (
                        <button
                          key={ast.id}
                          type="button"
                          onClick={() => {
                            setManualTagInput(ast.assetTag);
                          }}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 text-left transition-colors flex flex-col gap-1 cursor-pointer"
                        >
                          <span className="font-mono font-bold text-slate-800">{ast.assetTag}</span>
                          <span className="text-[10px] text-slate-400 truncate w-full">{ast.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {cameraScanError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 font-medium flex gap-2">
                  <span className="text-sm font-bold">⚠</span>
                  <div>{cameraScanError}</div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 font-semibold gap-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsScannerOpen(false);
                  setCameraScanError(null);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg cursor-pointer"
              >
                Close Portal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
