/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  QrCode,
  Calendar,
  DollarSign,
  Briefcase,
  Sliders,
  X,
  MapPin,
  ClipboardCheck,
  Zap,
  Tag,
  Wrench,
  User,
  ShieldAlert,
  Download,
  Camera,
  LayoutGrid,
  List,
  Sparkles,
  Building2
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, generateAssetQRCodeSVG, formatCurrency, formatDate } from "../db";
import { Asset, AssetStatus, AssetCondition, Client, UserRole, TransferStatus, MALAWI_CLIENT_TYPES, MALAWI_DISTRICTS, MALAWI_REGIONS, MalawiRegion } from "../types";
import { can } from "../permissions";
import { QRCodeCanvas } from "qrcode.react";
import InteractiveFloorPlan from "./InteractiveFloorPlan";

interface CategoryBlueprintSVGProps {
  categoryId: string;
  imageValue: string;
  assetTag: string;
}

export function CategoryBlueprintSVG({ categoryId, imageValue, assetTag }: CategoryBlueprintSVGProps) {
  const isBlueprint = imageValue.startsWith("blueprint-");

  const renderBlueprintGrid = () => {
    return (
      <>
        <rect width="200" height="140" fill="#08152e" rx="8" />
        {/* Grid horizontal lines */}
        <line x1="0" y1="20" x2="200" y2="20" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="0" y1="40" x2="200" y2="40" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="0" y1="60" x2="200" y2="60" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="0" y1="80" x2="200" y2="80" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="0" y1="120" x2="200" y2="120" stroke="#0f264d" strokeWidth="0.5" />
        {/* Grid vertical lines */}
        <line x1="30" y1="0" x2="30" y2="140" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="60" y1="0" x2="60" y2="140" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="90" y1="0" x2="90" y2="140" stroke="#112d5c" strokeWidth="0.8" />
        <line x1="120" y1="0" x2="120" y2="140" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="150" y1="0" x2="150" y2="140" stroke="#0f264d" strokeWidth="0.5" />
        <line x1="180" y1="0" x2="180" y2="140" stroke="#0f264d" strokeWidth="0.5" />
        {/* Blueprint technical border & target circles */}
        <rect x="5" y="5" width="190" height="130" fill="none" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
        <circle cx="15" cy="15" r="3" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
        <circle cx="185" cy="15" r="3" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
        <circle cx="15" cy="125" r="3" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
        <circle cx="185" cy="125" r="3" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
      </>
    );
  };

  const renderIsometricBg = () => {
    return (
      <>
        <rect width="200" height="140" fill="#0f172a" rx="8" />
        <path d="M 0 70 L 100 20 L 200 70 L 100 120 Z" fill="#1e293b" opacity="0.3" />
        <path d="M 0 70 L 100 120 L 200 70" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="100" y1="20" x2="100" y2="120" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
      </>
    );
  };

  if (isBlueprint) {
    if (categoryId === "cat-1") {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <rect x="50" y="30" width="100" height="60" rx="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="54" y="34" width="92" height="48" rx="2" fill="none" stroke="#0ea5e9" strokeWidth="0.8" />
          <path d="M 60 45 L 85 45 M 60 52 L 105 52 M 60 59 L 90 59 M 60 66 L 75 66" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          <path d="M 115 70 L 120 62 L 128 65 L 134 50 L 140 58" fill="none" stroke="#10b981" strokeWidth="1" strokeLinecap="round" />
          <rect x="85" y="90" width="30" height="4" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <path d="M 40 94 L 160 94 L 152 102 L 48 102 Z" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="88" y="96" width="24" height="5" rx="1" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">SPEC: 14" WORKSTATION | TAG: {assetTag}</text>
        </svg>
      );
    } else if (categoryId === "cat-2") {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <rect x="35" y="45" width="130" height="48" rx="2" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="30" y1="50" x2="35" y2="50" stroke="#38bdf8" strokeWidth="2" />
          <line x1="30" y1="88" x2="35" y2="88" stroke="#38bdf8" strokeWidth="2" />
          <line x1="165" y1="50" x2="170" y2="50" stroke="#38bdf8" strokeWidth="2" />
          <line x1="165" y1="88" x2="170" y2="88" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="32" cy="69" r="1.5" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          <circle cx="168" cy="69" r="1.5" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          <rect x="42" y="52" width="75" height="15" rx="1" fill="none" stroke="#0ea5e9" strokeWidth="0.8" />
          <path d="M 46 56 H 51 V 61 H 46 Z M 55 56 H 60 V 61 H 55 Z M 64 56 H 69 V 61 H 64 Z M 73 56 H 78 V 61 H 73 Z M 82 56 H 87 V 61 H 82 Z M 91 56 H 96 V 61 H 91 Z" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <circle cx="48" cy="64" r="1" fill="#10b981" />
          <circle cx="57" cy="64" r="1" fill="#10b981" />
          <circle cx="66" cy="64" r="1" fill="#f59e0b" />
          <circle cx="75" cy="64" r="1" fill="#10b981" />
          <rect x="42" y="72" width="40" height="14" rx="1" fill="none" stroke="#0ea5e9" strokeWidth="0.8" />
          <circle cx="138" cy="69" r="14" fill="none" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="3,1" />
          <circle cx="138" cy="69" r="4" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">SYSTEM: 10GBPS LAN ROUTER | TAG: {assetTag}</text>
        </svg>
      );
    } else if (categoryId === "cat-3") {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <path d="M 45 45 L 155 45 L 155 105 L 45 105 Z" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="52" y="35" width="96" height="10" rx="1.5" fill="none" stroke="#0ea5e9" strokeWidth="1" />
          <line x1="52" y1="41" x2="148" y2="41" stroke="#38bdf8" strokeWidth="0.8" />
          <path d="M 60 70 L 140 70 L 135 85 L 65 85 Z" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <path d="M 70 75 L 130 75" fill="none" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="2,2" />
          <rect x="52" y="52" width="18" height="14" rx="1" fill="none" stroke="#0ea5e9" strokeWidth="0.8" />
          <circle cx="56" cy="59" r="1.5" fill="#3189be" />
          <circle cx="62" cy="59" r="1" fill="#10b981" />
          <path d="M 75 73 L 125 73 L 128 83 L 72 83 Z" fill="none" stroke="#10b981" strokeWidth="0.8" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">SYSTEM: MULTIFUNCTION ENGINE | TAG: {assetTag}</text>
        </svg>
      );
    } else if (categoryId === "cat-4") {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <rect x="35" y="45" width="130" height="10" rx="1.5" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="42" y="55" width="30" height="48" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <line x1="42" y1="71" x2="72" y2="71" stroke="#0ea5e9" strokeWidth="0.8" />
          <line x1="42" y1="87" x2="72" y2="87" stroke="#0ea5e9" strokeWidth="0.8" />
          <rect x="54" y="61" width="6" height="2" rx="0.5" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="54" y="77" width="6" height="2" rx="0.5" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="54" y="93" width="6" height="2" rx="0.5" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="150" y="55" width="10" height="48" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <line x1="150" y1="55" x2="150" y2="103" stroke="#38bdf8" strokeWidth="1" />
          <path d="M 130 35 L 134 45 H 126 Z" fill="none" stroke="#10b981" strokeWidth="0.8" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">SOLID HARDWOOD ELEVATION | TAG: {assetTag}</text>
        </svg>
      );
    } else if (categoryId === "cat-5") {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <path d="M 45 92 A 11 11 0 0 1 67 92" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M 133 92 A 11 11 0 0 1 155 92" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M 30 92 H 45 C 45 80, 67 80, 67 92 H 133 C 133 80, 155 80, 155 92 H 170 V 62 C 170 56, 164 52, 145 52 H 48 L 32 64 V 92 Z M 32 64 H 48 M 48 52 V 64" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="56" cy="92" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="144" cy="92" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="167" y="75" width="3" height="10" rx="0.5" fill="#ef4444" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">CHASSIS UTILITY CAR ELEVATION | TAG: {assetTag}</text>
        </svg>
      );
    } else if (categoryId === "cat-6") {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <circle cx="95" cy="65" r="22" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,2" />
          <circle cx="95" cy="65" r="16" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
          <line x1="95" y1="40" x2="95" y2="90" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5,15" />
          <line x1="70" y1="65" x2="120" y2="65" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5,15" />
          <circle cx="127" cy="80" r="12" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
          <circle cx="127" cy="80" r="8" fill="none" stroke="#0ea5e9" strokeWidth="1.2" />
          <path d="M 35 100 H 165" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="54" cy="50" r="10" fill="none" stroke="#10b981" strokeWidth="1.2" />
          <line x1="54" y1="50" x2="61" y2="44" stroke="#10b981" strokeWidth="1" strokeLinecap="round" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">ROTATIONAL MACHINERY SECTOR | TAG: {assetTag}</text>
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
          {renderBlueprintGrid()}
          <rect x="55" y="30" width="90" height="85" rx="3" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="100" y1="30" x2="100" y2="115" stroke="#38bdf8" strokeWidth="1" />
          <line x1="55" y1="52" x2="145" y2="52" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
          <rect x="91" y="65" width="3" height="15" rx="0.5" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="89" cy="48" r="4.5" fill="none" stroke="#10b981" strokeWidth="0.8" />
          <text x="10" y="132" fill="#38bdf8" fontSize="5.5" fontFamily="Montserrat, sans-serif" opacity="0.8">SECURE COMPARTMENT UNIT | TAG: {assetTag}</text>
        </svg>
      );
    }
  }

  // Isometric Vector rendering
  if (categoryId === "cat-1") {
    return (
      <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
        {renderIsometricBg()}
        <g transform="translate(10, 0)">
          <path d="M 50 90 L 90 73 L 130 90 L 90 107 Z" fill="#1e293b" />
          <path d="M 50 90 L 90 107 L 130 90 L 130 94 L 90 111 L 50 94 Z" fill="#0f172a" />
          <path d="M 47 88 L 90 106 L 133 88 Z" fill="#38bdf8" opacity="0.1" />
          <path d="M 60 70 L 60 40 L 90 27 L 90 57 Z" fill="#0284c7" />
          <path d="M 90 57 L 90 27 L 120 40 L 120 70 Z" fill="#0369a1" />
          <path d="M 92 30 L 118 41 L 118 66 L 92 55 Z" fill="#38bdf8" />
          <path d="M 95 33 L 110 39" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
          <path d="M 58 83 L 88 71" stroke="#475569" strokeWidth="1" />
          <path d="M 64 87 L 94 75" stroke="#475569" strokeWidth="1" />
        </g>
        <rect x="8" y="8" width="55" height="13" rx="3" fill="#0f172a" opacity="0.75" />
        <text x="12" y="17" fill="#38bdf8" fontSize="5" fontFamily="Montserrat, sans-serif" fontWeight="700">VECTOR RENDER</text>
      </svg>
    );
  } else if (categoryId === "cat-2") {
    return (
      <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
        {renderIsometricBg()}
        <g transform="translate(10, -5)">
          <path d="M 60 70 L 100 53 L 140 70 L 100 87 Z" fill="#1e293b" />
          <path d="M 60 70 L 100 87 L 140 70 L 140 90 L 100 107 L 60 90 Z" fill="#0f172a" />
          <path d="M 60 70 L 100 87 L 100 107 L 60 90 Z" fill="#0ea5e9" />
          <path d="M 100 87 L 140 70 L 140 90 L 100 107 Z" fill="#0284c7" />
          <circle cx="75" cy="81" r="1.5" fill="#10b981" />
          <circle cx="83" cy="84" r="1.5" fill="#10b981" />
          <circle cx="91" cy="87" r="1.5" fill="#f59e0b" />
          <circle cx="115" cy="85" r="1.5" fill="#38bdf8" />
          <circle cx="125" cy="81" r="1.5" fill="#38bdf8" />
        </g>
        <rect x="8" y="8" width="55" height="13" rx="3" fill="#0f172a" opacity="0.75" />
        <text x="12" y="17" fill="#38bdf8" fontSize="5" fontFamily="Montserrat, sans-serif" fontWeight="700">SWITCH ROUTER</text>
      </svg>
    );
  } else if (categoryId === "cat-4") {
    return (
      <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
        {renderIsometricBg()}
        <g transform="translate(10, -5)">
          <path d="M 50 70 L 90 53 L 130 70 L 90 87 Z" fill="#b45309" />
          <path d="M 50 70 L 90 87 L 130 70 L 130 74 L 90 91 L 50 74 Z" fill="#78350f" />
          <path d="M 55 74 L 75 66 L 75 96 L 55 104 Z" fill="#0f172a" />
          <path d="M 75 66 L 85 70 L 85 92 L 75 96 Z" fill="#1e293b" />
          <path d="M 115 76 L 125 72 L 125 92 L 115 96 Z" fill="#0f172a" />
        </g>
        <rect x="8" y="8" width="55" height="13" rx="3" fill="#0f172a" opacity="0.75" />
        <text x="12" y="17" fill="#f59e0b" fontSize="5" fontFamily="Montserrat, sans-serif" fontWeight="700">FURNITURE DECK</text>
      </svg>
    );
  } else {
    // Default system isometric
    return (
      <svg viewBox="0 0 200 140" className="w-full h-full rounded-lg">
        {renderIsometricBg()}
        <g transform="translate(10, 0)">
          <path d="M 70 70 L 100 53 L 130 70 L 100 87 Z" fill="#6366f1" />
          <path d="M 70 70 L 100 87 L 100 115 L 70 98 Z" fill="#4f46e5" />
          <path d="M 100 87 L 130 70 L 130 98 L 100 115 Z" fill="#3730a3" />
          <path d="M 100 48 L 110 42" stroke="#818cf8" strokeWidth="1" />
          <path d="M 100 38 L 115 30" stroke="#818cf8" strokeWidth="1" />
        </g>
        <rect x="8" y="8" width="55" height="13" rx="3" fill="#0f172a" opacity="0.75" />
        <text x="12" y="17" fill="#818cf8" fontSize="5" fontFamily="Montserrat, sans-serif" fontWeight="700">SYSTEM ASSET</text>
      </svg>
    );
  }
}

interface CategoryBlueprintMiniProps {
  categoryId: string;
  styleCode: string;
}

export function CategoryBlueprintMini({ categoryId, styleCode }: CategoryBlueprintMiniProps) {
  if (categoryId === "cat-1") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
        <line x1="5" y1="16" x2="19" y2="16" />
      </svg>
    );
  } else if (categoryId === "cat-2") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" className="w-5 h-5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="6" y1="9" x2="18" y2="9" strokeDasharray="2 2" />
        <line x1="6" y1="15" x2="18" y2="15" />
        <circle cx="7" cy="15" r="1" fill="#10b981" />
        <circle cx="11" cy="15" r="1" fill="#10b981" />
      </svg>
    );
  } else if (categoryId === "cat-4") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="w-5 h-5">
        <path d="M3 3h18v4H3z" />
        <path d="M5 7v13h14V7" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </svg>
    );
  } else {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M21 12H3" />
        <path d="M12 3v18" />
      </svg>
    );
  }
}

interface AssetManagementProps {
  userRole: UserRole;
  currentUserId: string;
  selectedAssetIdFromDashboard: string | null;
  resetDashboardSelection: () => void;
  onNavigateToMaintenance: (assetId: string) => void;
  onNavigateToVerification: (assetId: string) => void;
  initialViewMode?: "list" | "floorplan";
}

export default function AssetManagement({
  userRole,
  currentUserId,
  selectedAssetIdFromDashboard,
  resetDashboardSelection,
  onNavigateToMaintenance,
  onNavigateToVerification,
  initialViewMode
}: AssetManagementProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("assetTag");
  const [viewMode, setViewMode] = useState<"list" | "floorplan">(initialViewMode || "list");

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);
  
  // Modals & Panels
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  // Asset Photo / Visual Representation Generator states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [selectedGenStyle, setSelectedGenStyle] = useState<"photo" | "blueprint" | "isometric">("blueprint");

  const handleGenerateAssetRepresentation = (assetId: string) => {
    setIsGenerating(true);
    setGenerationStep("Deconstructing category parameters...");

    setTimeout(() => {
      setGenerationStep("Compiling vector coordinates & nodes...");
      setTimeout(() => {
        setGenerationStep("Synthesizing surface texture layouts...");
        setTimeout(() => {
          setGenerationStep("Rasterizing design layers & specs...");
          setTimeout(() => {
            let finalImageValue = "";
            const currentAsset = db.assets.find(a => a.id === assetId);
            if (!currentAsset) return;

            if (selectedGenStyle === "photo") {
              finalImageValue = `catalog-${currentAsset.categoryId}`;
            } else if (selectedGenStyle === "blueprint") {
              finalImageValue = `blueprint-${currentAsset.categoryId}`;
            } else if (selectedGenStyle === "isometric") {
              finalImageValue = `isometric-${currentAsset.categoryId}`;
            }

            const currentDB = getDatabaseState();
            const index = currentDB.assets.findIndex(a => a.id === assetId);
            if (index !== -1) {
              currentDB.assets[index] = {
                ...currentDB.assets[index],
                image: finalImageValue
              };
              saveDatabaseState(currentDB);
              setDb(currentDB);
              
              // Reactive update to the details drawer
              const updatedAsset = currentDB.assets[index];
              setSelectedAsset(updatedAsset);

              addAuditRecord(
                currentUserId,
                userRole,
                "Visual Asset Synthesized",
                `Generated a visual representation of style "${selectedGenStyle}" for asset Tag ${updatedAsset.assetTag}`
              );

              triggerNotification(
                currentUserId,
                "Visual representation Created",
                `Asset ${updatedAsset.assetTag} visual photo has been successfully synthesized.`,
                "success"
              );
            }

            setIsGenerating(false);
            setGenerationStep("");
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };
  
  // Interactive scanner lookup states for QR Code Scanner
  const [qrConsoleOpen, setQrConsoleOpen] = useState(false);
  const [scannerInput, setScannerInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Asset | null>(null);

  // QR Code Download/Export Modal State
  const [exportQrAsset, setExportQrAsset] = useState<Asset | null>(null);
  const [qrSize, setQrSize] = useState<number>(256);
  const [qrFgColor, setQrFgColor] = useState<string>("#ffffff"); // Sophisticated white foreground default inside dark card preview or standard printable colors
  const [qrBgColor, setQrBgColor] = useState<string>("#121214"); // Sophisticated dark background default
  const [includeLabel, setIncludeLabel] = useState<boolean>(true);
  const [qrValueFormat, setQrValueFormat] = useState<string>("url"); // "url", "json", "tag"

  // Real Camera Scan States
  const [scanTab, setScanTab] = useState<"camera" | "simulation">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraScanError, setCameraScanError] = useState<string | null>(null);

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

    // 3. Strict or inclusion tag matching
    const upperScanned = cleaned.toUpperCase();
    for (const asset of assetsList) {
      const upperTag = asset.assetTag.toUpperCase();
      if (upperScanned === upperTag || upperScanned.includes(upperTag)) {
        return asset;
      }
    }

    return null;
  };

  // Enumerate camera devices
  const getCameraDevices = async () => {
    try {
      // Prompt permissions once so labels can be obtained correctly
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        // default to back camera / environment if possible
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
              console.log("Captured real-time optical barcode data link:", code.data);
              const foundAsset = parseScannedData(code.data, db.assets);
              
              if (foundAsset) {
                // Succeeded! Load result details
                setScanResult(foundAsset);
                setSelectedAsset(foundAsset);
                stopCamera();
                isStopped = true;

                addAuditRecord(
                  currentUserId,
                  userRole,
                  "QR Scan Verification",
                  `Verified asset tag "${foundAsset.assetTag}" via physical camera scanner.`
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
    if (!qrConsoleOpen) {
      stopCamera();
    } else {
      getCameraDevices();
    }
  }, [qrConsoleOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Form states (Create / Edit)
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formPurchaseCost, setFormPurchaseCost] = useState("");
  const [formSerialNumber, setFormSerialNumber] = useState("");
  const [formWarrantyExpiry, setFormWarrantyExpiry] = useState("");
  const [formCondition, setFormCondition] = useState(AssetCondition.EXCELLENT);
  const [formStatus, setFormStatus] = useState(AssetStatus.ACTIVE);
  const [formAssignedUser, setFormAssignedUser] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formClientMode, setFormClientMode] = useState<"existing" | "new">("existing");
  const [formClientId, setFormClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCode, setNewClientCode] = useState("");
  const [newClientContact, setNewClientContact] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientOrgType, setNewClientOrgType] = useState("Private Company");
  const [newClientRegion, setNewClientRegion] = useState<MalawiRegion>("Central Region");
  const [newClientDistrict, setNewClientDistrict] = useState("Lilongwe");
  const [newClientPostalAddress, setNewClientPostalAddress] = useState("");
  const [newClientRegistrationNumber, setNewClientRegistrationNumber] = useState("");
  const [newClientTinNumber, setNewClientTinNumber] = useState("");
  const [newClientStatus, setNewClientStatus] = useState<Client["status"]>("Active");

  // Handle direct dashboard navigation link
  useEffect(() => {
    if (selectedAssetIdFromDashboard) {
      const ast = db.assets.find(a => a.id === selectedAssetIdFromDashboard);
      if (ast) {
        setSelectedAsset(ast);
        setIsEdit(false);
      }
      resetDashboardSelection();
    }
  }, [selectedAssetIdFromDashboard, db, resetDashboardSelection]);

  // Sync state
  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  const generateClientCode = (name: string, clients: Client[]) => {
    let candidate = `CLI-MWI-${String(clients.length + 1).padStart(4, "0")}`;
    let index = clients.length + 1;
    while (clients.some(client => client.code.toLowerCase() === candidate.toLowerCase())) {
      index += 1;
      candidate = `CLI-MWI-${String(index).padStart(4, "0")}`;
    }
    return candidate;
  };

  const resetNewClientForm = (clients = db.clients) => {
    setNewClientName("");
    setNewClientCode(generateClientCode("", clients));
    setNewClientContact("");
    setNewClientPhone("");
    setNewClientEmail("");
    setNewClientAddress("");
    setNewClientOrgType("Private Company");
    setNewClientRegion("Central Region");
    setNewClientDistrict("Lilongwe");
    setNewClientPostalAddress("");
    setNewClientRegistrationNumber("");
    setNewClientTinNumber("");
    setNewClientStatus("Active");
  };

  const findDuplicateClient = (clients: Client[]) => {
    const normalizedName = newClientName.trim().toLowerCase();
    const normalizedPhone = newClientPhone.trim().toLowerCase();
    const normalizedEmail = newClientEmail.trim().toLowerCase();
    return clients.find(client =>
      (!!normalizedName && client.name.trim().toLowerCase() === normalizedName) ||
      (!!normalizedPhone && client.phone.trim().toLowerCase() === normalizedPhone) ||
      (!!normalizedEmail && client.email.trim().toLowerCase() === normalizedEmail)
    );
  };

  const buildClientFromForm = (clients: Client[]): Client | null => {
    if (!newClientName.trim() || !newClientContact.trim()) {
      alert("Client name and contact person are required.");
      return null;
    }
    const duplicate = findDuplicateClient(clients);
    if (duplicate) {
      alert(`A matching client already exists: ${duplicate.name}. Select the existing client instead.`);
      setFormClientMode("existing");
      setFormClientId(duplicate.id);
      return null;
    }
    return {
      id: `cli-${Date.now()}`,
      name: newClientName.trim(),
      code: (newClientCode || generateClientCode(newClientName, clients)).trim().toUpperCase(),
      contactPerson: newClientContact.trim(),
      phone: newClientPhone.trim(),
      email: newClientEmail.trim(),
      address: newClientAddress.trim(),
      organizationType: newClientOrgType.trim() || "Private Company",
      region: newClientRegion,
      district: newClientDistrict,
      postalAddress: newClientPostalAddress.trim(),
      registrationNumber: newClientRegistrationNumber.trim(),
      tinNumber: newClientTinNumber.trim(),
      registrationDate: new Date().toISOString().split("T")[0],
      status: newClientStatus,
      departmentId: formDepartment || undefined
    };
  };

  const saveQuickClient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!can(userRole, "client:create")) {
      alert("Your role cannot create clients from the asset form.");
      return;
    }
    const currentDB = getDatabaseState();
    const newClient = buildClientFromForm(currentDB.clients);
    if (!newClient) return;

    currentDB.clients.unshift(newClient);
    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "Client Created", `Created client profile ${newClient.code} (${newClient.name}) from asset registration`);
    triggerNotification("all", "Client Registry Updated", `Client ${newClient.name} was created from asset registration.`, "success");
    setFormClientMode("existing");
    setFormClientId(newClient.id);
    setClientSearch(newClient.name);
    resetNewClientForm(currentDB.clients);
    setIsQuickClientOpen(false);
    refreshDb();
  };

  const filteredClientOptions = useMemo(() => {
    const normalized = clientSearch.trim().toLowerCase();
    return db.clients.filter(client =>
      !normalized ||
      client.name.toLowerCase().includes(normalized) ||
      client.code.toLowerCase().includes(normalized) ||
      client.contactPerson.toLowerCase().includes(normalized) ||
      client.email.toLowerCase().includes(normalized) ||
      (client.district || "").toLowerCase().includes(normalized) ||
      (client.region || "").toLowerCase().includes(normalized)
    );
  }, [clientSearch, db.clients]);

  // Floating bulk action toolbar states
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<"transfer" | "maintenance" | "disposal" | null>(null);

  // Bulk action input states
  const [bulkTransferDept, setBulkTransferDept] = useState("");
  const [bulkTransferLoc, setBulkTransferLoc] = useState("");
  const [bulkTransferRemarks, setBulkTransferRemarks] = useState("");

  const [bulkMaintProvider, setBulkMaintProvider] = useState("");
  const [bulkMaintTechnician, setBulkMaintTechnician] = useState("");
  const [bulkMaintCost, setBulkMaintCost] = useState("");
  const [bulkMaintNotes, setBulkMaintNotes] = useState("");

  const [bulkDisposalMethod, setBulkDisposalMethod] = useState("Sold");
  const [bulkDisposalReason, setBulkDisposalReason] = useState("");

  // Handler for clearing selections
  const clearBulkSelection = () => {
    setSelectedAssetIds([]);
    setBulkActionType(null);
  };

  const handleExecuteBulkAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssetIds.length === 0) return;

    const currentDB = getDatabaseState();
    const nowStr = new Date().toISOString().split("T")[0];

    if (bulkActionType === "transfer") {
      if (!can(userRole, "asset:transfer")) {
        alert("Your role cannot transfer assets.");
        return;
      }
      if (!bulkTransferDept || !bulkTransferLoc) {
        alert("Please select both a destination department and physically tracked site.");
        return;
      }
      const targetDept = currentDB.departments.find(d => d.id === bulkTransferDept);
      const targetLoc = currentDB.locations.find(l => l.id === bulkTransferLoc);

      selectedAssetIds.forEach(astId => {
        const asset = currentDB.assets.find(a => a.id === astId);
        if (asset) {
          const prevDeptId = asset.departmentId;
          const prevLocId = asset.locationId;

          // Reassign asset metadata
          asset.departmentId = bulkTransferDept;
          asset.locationId = bulkTransferLoc;

          // Add Transfer Record
          const transferId = `TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
          const transferRecord = {
            id: transferId,
            assetId: astId,
            sourceDepartmentId: prevDeptId,
            destDepartmentId: bulkTransferDept,
            sourceLocationId: prevLocId,
            destLocationId: bulkTransferLoc,
            status: TransferStatus.APPROVED,
            transferDate: nowStr,
            authorizedBy: currentUserId,
            remarks: bulkTransferRemarks || "Processed via Bulk Action Toolbar."
          };
          currentDB.transfers.unshift(transferRecord);

          addAuditRecord(
            currentUserId,
            userRole,
            "Bulk Asset Transfer",
            `Batch relocated asset ${asset.assetTag} (${asset.name}) to department "${targetDept?.name || 'N/A'}" at site "${targetLoc?.name || 'N/A'}".`
          );
        }
      });

      triggerNotification(
        "all",
        "Batch Transfer Succeeded",
        `Successfully transferred ${selectedAssetIds.length} assets to ${targetDept?.name || "new sector"}.`,
        "success"
      );

    } else if (bulkActionType === "maintenance") {
      if (!can(userRole, "asset:maintenance")) {
        alert("Your role cannot schedule maintenance.");
        return;
      }
      const estimatedCostVal = parseFloat(bulkMaintCost) || 0;

      selectedAssetIds.forEach(astId => {
        const asset = currentDB.assets.find(a => a.id === astId);
        if (asset) {
          asset.status = AssetStatus.UNDER_MAINTENANCE;

          // Add Maintenance Record
          const recordId = `MN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
          const maintRecord = {
            id: recordId,
            assetId: astId,
            requestBy: currentUserId,
            technician: bulkMaintTechnician || "Specialist Dispatch",
            serviceProvider: bulkMaintProvider || "Vendor Partner Services",
            cost: estimatedCostVal,
            maintenanceDate: nowStr,
            notes: bulkMaintNotes || "Initiated via Bulk Maintenance system scheduling.",
            status: "Pending" as any
          };
          currentDB.maintenance.unshift(maintRecord);

          addAuditRecord(
            currentUserId,
            userRole,
            "Bulk Maintenance Scheduled",
            `Enrolled physical asset ${asset.assetTag} into the bulk repairs pipeline.`
          );
        }
      });

      triggerNotification(
        "all",
        "Batch Servicing Dispatched",
        `Enrolled ${selectedAssetIds.length} assets into the current maintenance pipeline.`,
        "success"
      );

    } else if (bulkActionType === "disposal") {
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.ASSET_MANAGER) {
        alert("Your role cannot retire or dispose assets.");
        return;
      }
      if (!bulkDisposalReason.trim()) {
        alert("Please state the decommission and disposal justification details.");
        return;
      }

      selectedAssetIds.forEach(astId => {
        const asset = currentDB.assets.find(a => a.id === astId);
        if (asset) {
          asset.status = AssetStatus.DISPOSED;

          // Add Disposal Record
          const disposalId = `DS-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
          const wasteRecord = {
            id: disposalId,
            assetId: astId,
            disposalDate: nowStr,
            method: bulkDisposalMethod,
            reason: bulkDisposalReason,
            authorizedBy: currentUserId,
            supportingDocuments: "E-Waste / Inventory Write-Off Batch Approval"
          };
          currentDB.disposals.unshift(wasteRecord);

          addAuditRecord(
            currentUserId,
            userRole,
            "Bulk Disposal Request",
            `Authorized batch decomission for ${asset.assetTag} (${asset.name}) using method: ${bulkDisposalMethod}.`
          );
        }
      });

      triggerNotification(
        "all",
        "Batch Disposal Completed",
        `Fully decommissioned and logged disposal history for ${selectedAssetIds.length} assets.`,
        "success"
      );
    }

    saveDatabaseState(currentDB);
    clearBulkSelection();
    setBulkTransferDept("");
    setBulkTransferLoc("");
    setBulkTransferRemarks("");
    setBulkMaintProvider("");
    setBulkMaintTechnician("");
    setBulkMaintCost("");
    setBulkMaintNotes("");
    setBulkDisposalMethod("Sold");
    setBulkDisposalReason("");
    refreshDb();
  };

  // Generate next Tag dynamically based on existing counts
  const generatedNextTag = useMemo(() => {
    let index = db.assets.length + 1;
    let candidate = `AST-MWI-${String(index).padStart(6, "0")}`;
    while (db.assets.some(asset => asset.assetTag === candidate)) {
      index += 1;
      candidate = `AST-MWI-${String(index).padStart(6, "0")}`;
    }
    return candidate;
  }, [db.assets]);

  // Filter logic
  const filteredAssets = useMemo(() => {
    return db.assets.filter(asset => {
      // Role restrictions: employees see assigned assets, department managers see department assets.
      if (userRole === UserRole.EMPLOYEE && asset.assignedUserId !== currentUserId) {
        return false;
      }
      if (userRole === UserRole.DEPT_MANAGER) {
        const currentUser = db.users.find(user => user.id === currentUserId);
        if (currentUser && asset.departmentId !== currentUser.departmentId) return false;
      }

      const matchSearch =
        asset.name.toLowerCase().includes(search.toLowerCase()) ||
        asset.assetTag.toLowerCase().includes(search.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(search.toLowerCase());

      const matchCat = categoryFilter === "all" || asset.categoryId === categoryFilter;
      const matchDept = deptFilter === "all" || asset.departmentId === deptFilter;
      const matchLoc = locationFilter === "all" || asset.locationId === locationFilter;
      const matchStatus = statusFilter === "all" || asset.status === statusFilter;

      return matchSearch && matchCat && matchDept && matchLoc && matchStatus;
    }).sort((a, b) => {
      if (sortBy === "purchaseCost") return b.purchaseCost - a.purchaseCost;
      if (sortBy === "purchaseDate") return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.assetTag.localeCompare(b.assetTag);
    });
  }, [db.assets, db.users, search, categoryFilter, deptFilter, locationFilter, statusFilter, sortBy, userRole, currentUserId]);

  // Actions
  const handleOpenCreate = () => {
    setFormName("");
    setFormCategory(db.categories[0]?.id || "");
    setFormDepartment(db.departments[0]?.id || "");
    setFormLocation(db.locations[0]?.id || "");
    setFormSupplier(db.suppliers[0]?.id || "");
    setFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setFormPurchaseCost("500");
    setFormSerialNumber("");
    setFormWarrantyExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setFormCondition(AssetCondition.EXCELLENT);
    setFormStatus(AssetStatus.ACTIVE);
    setFormAssignedUser("");
    setFormNotes("");
    setFormClientMode("existing");
    setFormClientId(db.clients[0]?.id || "");
    setClientSearch("");
    resetNewClientForm(db.clients);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormName(asset.name);
    setFormCategory(asset.categoryId);
    setFormDepartment(asset.departmentId);
    setFormLocation(asset.locationId);
    setFormSupplier(asset.supplierId);
    setFormPurchaseDate(asset.purchaseDate);
    setFormPurchaseCost(asset.purchaseCost.toString());
    setFormSerialNumber(asset.serialNumber);
    setFormWarrantyExpiry(asset.warrantyExpiry);
    setFormCondition(asset.condition);
    setFormStatus(asset.status);
    setFormAssignedUser(asset.assignedUserId || "");
    setFormNotes(asset.notes);
    setFormClientMode("existing");
    setFormClientId(asset.clientId || "");
    setIsEdit(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!can(userRole, "asset:create")) {
      alert("Your role cannot create assets.");
      return;
    }
    if (!formName || !formPurchaseCost || !formSerialNumber) {
      alert("Please satisfy all required fields.");
      return;
    }

    const currentDB = getDatabaseState();
    let linkedClientId = formClientId || undefined;

    if (formClientMode === "existing") {
      if (!linkedClientId) {
        alert("Select an existing client before saving the asset.");
        return;
      }
    } else {
      if (!can(userRole, "client:create")) {
        alert("Your role cannot create clients from the asset form.");
        return;
      }
      const newClient = buildClientFromForm(currentDB.clients);
      if (!newClient) return;
      currentDB.clients.unshift(newClient);
      linkedClientId = newClient.id;
      addAuditRecord(currentUserId, userRole, "Client Created", `Created client profile ${newClient.code} (${newClient.name}) during asset registration`);
    }

    const tag = generatedNextTag;
    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      assetTag: tag,
      name: formName,
      clientId: linkedClientId,
      categoryId: formCategory,
      departmentId: formDepartment,
      locationId: formLocation,
      supplierId: formSupplier,
      purchaseDate: formPurchaseDate,
      purchaseCost: parseFloat(formPurchaseCost) || 0,
      serialNumber: formSerialNumber,
      warrantyExpiry: formWarrantyExpiry,
      condition: formCondition,
      status: formStatus,
      assignedUserId: formAssignedUser || undefined,
      notes: formNotes,
      qrCode: generateAssetQRCodeSVG(`https://faims.local/assets/profile/${tag}`)
    };

    currentDB.assets.push(newAsset);
    
    // Add Assignment log too if assigned on creation
    if (formAssignedUser) {
      currentDB.assignments.push({
        id: `asg-${Date.now()}`,
        assetId: newAsset.id,
        userId: formAssignedUser,
        departmentId: formDepartment,
        assignedDate: formPurchaseDate,
        status: "Active",
        remarks: "Auto assigned on asset registration"
      });
    }

    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Asset Creation",
      `Registered asset tag: ${tag} (${formName}) under cost ${formatCurrency(parseFloat(formPurchaseCost) || 0)}`
    );
    triggerNotification("all", "New Asset Registered", `Asset ${tag} - ${formName} was registered successfully.`, "success");
    
    setIsCreateOpen(false);
    resetNewClientForm(currentDB.clients);
    refreshDb();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!can(userRole, "asset:edit")) {
      alert("Your role cannot edit assets.");
      return;
    }
    if (!selectedAsset) return;

    const currentDB = getDatabaseState();
    const index = currentDB.assets.findIndex(a => a.id === selectedAsset.id);
    if (index === -1) return;

    const previousStatus = currentDB.assets[index].status;
    const previousAssigned = currentDB.assets[index].assignedUserId;

    const updatedAsset: Asset = {
      ...selectedAsset,
      name: formName,
      categoryId: formCategory,
      departmentId: formDepartment,
      locationId: formLocation,
      supplierId: formSupplier,
      purchaseDate: formPurchaseDate,
      purchaseCost: parseFloat(formPurchaseCost) || 0,
      serialNumber: formSerialNumber,
      warrantyExpiry: formWarrantyExpiry,
      condition: formCondition,
      status: formStatus,
      assignedUserId: formAssignedUser || undefined,
      notes: formNotes
    };

    currentDB.assets[index] = updatedAsset;

    // Assignment state handling if state shifted
    if (formAssignedUser && formAssignedUser !== previousAssigned) {
      currentDB.assignments.push({
        id: `asg-${Date.now()}`,
        assetId: selectedAsset.id,
        userId: formAssignedUser,
        departmentId: formDepartment,
        assignedDate: new Date().toISOString().split("T")[0],
        status: "Active",
        remarks: "Reassigned on asset edit update"
      });
    }

    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Asset Update",
      `Updated asset details for Tag: ${selectedAsset.assetTag} (${formName})`
    );
    
    setIsEdit(false);
    setSelectedAsset(updatedAsset);
    refreshDb();
  };

  const handleDeleteAsset = (id: string, tag: string) => {
    if (!can(userRole, "asset:delete")) {
      alert("Only Administrators can permanently delete asset records. Use disposal or inactive lifecycle status instead.");
      return;
    }
    if (!confirm(`Are you absolutely sure you want to permanently delete asset ${tag}?`)) return;

    const currentDB = getDatabaseState();
    currentDB.assets = currentDB.assets.filter(a => a.id !== id);
    currentDB.assignments = currentDB.assignments.filter(a => a.assetId !== id);
    currentDB.transfers = currentDB.transfers.filter(t => t.assetId !== id);
    currentDB.maintenance = currentDB.maintenance.filter(m => m.assetId !== id);
    
    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "Asset Deletion", `Force deleted asset tag: ${tag} from databases`);
    triggerNotification("all", "Asset Deleted", `Warning: Asset tag ${tag} was permanently removed by Admin.`, "error");
    
    setSelectedAsset(null);
    refreshDb();
  };

  const openQrLookup = (asset: Asset) => {
    setQrConsoleOpen(true);
    setIsScanning(true);
    setScannerInput(asset.assetTag);
    
    setTimeout(() => {
      setIsScanning(false);
      setScanResult(asset);
    }, 1100);
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      const match = db.assets.find(
        a => a.assetTag.toLowerCase() === scannerInput.toLowerCase().trim() ||
        a.serialNumber.toLowerCase() === scannerInput.toLowerCase().trim()
      );
      if (match) {
        setScanResult(match);
      } else {
        alert("No asset with corresponding tag or serial number detected in database.");
      }
    }, 1200);
  };

  const handleDownloadQR = (assetTag: string) => {
    let canvas = document.getElementById(`qr-canvas-export-generator-${assetTag}`) as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.getElementById(`qr-canvas-export-${assetTag}`) as HTMLCanvasElement;
    }
    if (!canvas) {
      alert("Error: QR Code Canvas was not found.");
      return;
    }
    try {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_CODE_${assetTag}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      addAuditRecord(
        currentUserId,
        userRole,
        "QR Code Export",
        `Exported downloadable QR label for asset: ${assetTag}`
      );
    } catch (err) {
      console.error("Failed to export QR code as canvas image", err);
    }
  };

  const isEditable = useMemo(() => {
    return can(userRole, "asset:edit");
  }, [userRole]);

  const canCreateAsset = useMemo(() => can(userRole, "asset:create"), [userRole]);
  const canCreateClient = useMemo(() => can(userRole, "client:create"), [userRole]);
  const canDeleteAsset = useMemo(() => can(userRole, "asset:delete"), [userRole]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" /> Organizational Asset Register
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {userRole === UserRole.EMPLOYEE 
              ? "View and review assets assigned specifically to your workstation"
              : "Complete physical asset tracking list, barcode bindings, conditions, and controls"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* View Mode Toggle Switch */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200 mr-1.5 select-none">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`py-1.5 px-3.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white text-slate-805 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5 animate-pulse" /> Registry list
            </button>
            <button
              type="button"
              id="floorplan-view-toggle"
              onClick={() => setViewMode("floorplan")}
              className={`py-1.5 px-3.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                viewMode === "floorplan"
                  ? "bg-white text-indigo-705 shadow-xs border border-slate-200/50"
                  : "text-slate-505 hover:text-indigo-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Interactive Floor Plan
            </button>
          </div>

          {canCreateAsset && (
            <button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Register Asset
            </button>
          )}
          <button
            onClick={() => setQrConsoleOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4" /> QR Barcode Console
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column filters */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Refine Search Range</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600">Keyword Lookup</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tag, Name, Serial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600">By Asset Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
              >
                <option value="all">All Categories ({db.categories.length})</option>
                {db.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600">By Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
              >
                <option value="all">All Departments ({db.departments.length})</option>
                {db.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600">By Physical Site</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
              >
                <option value="all">All Locations ({db.locations.length})</option>
                {db.locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600">Asset Condition Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
              >
                <option value="all">All Lifecycles states</option>
                {Object.values(AssetStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="space-y-1.5 pt-2">
              <label className="font-semibold text-slate-600">Sort Ordering</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-slate-400 font-medium cursor-pointer"
              >
                <option value="assetTag">Asset Tag ID Code</option>
                <option value="name">Alpabetical Desc</option>
                <option value="purchaseCost">Book Value (High to Low)</option>
                <option value="purchaseDate">Purchase Date (Recent first)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right column: Results listing */}
        <div className="lg:col-span-3 space-y-4">
          {viewMode === "floorplan" ? (
            <InteractiveFloorPlan
              userRole={userRole}
              currentUserId={currentUserId}
              filteredAssets={filteredAssets}
              onStateChange={refreshDb}
              onReviewDossier={(asset) => setSelectedAsset(asset)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
                <div className="flex items-center gap-2">
                  {isEditable && filteredAssets.length > 0 && (
                    <input
                      type="checkbox"
                      checked={filteredAssets.length > 0 && filteredAssets.every(a => selectedAssetIds.includes(a.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssetIds(filteredAssets.map(a => a.id));
                        } else {
                          setSelectedAssetIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer w-4 h-4"
                      title="Select all filtered assets"
                    />
                  )}
                  <span>
                    Showing <strong>{filteredAssets.length}</strong> matching assets
                    {selectedAssetIds.length > 0 && (
                      <span className="bg-slate-900 text-white font-semibold font-mono text-[10px] px-2 py-0.5 rounded-full ml-2">
                        {selectedAssetIds.length} Selected
                      </span>
                    )}
                  </span>
                </div>
                <span className="font-mono">Real-time DB synced</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs space-y-3 flex flex-col items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-slate-300" />
                    <p className="font-semibold text-slate-500">
                      {db.assets.length === 0 ? "No assets have been registered." : "No assets match current criteria or permissions limitations."}
                    </p>
                    {db.assets.length === 0 && canCreateAsset && (
                      <button
                        onClick={handleOpenCreate}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm mt-1"
                      >
                        <Plus className="w-4 h-4" /> Register Asset
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAssets.map(asset => {
                    const category = db.categories.find(c => c.id === asset.categoryId);
                    const department = db.departments.find(d => d.id === asset.departmentId);
                    const location = db.locations.find(l => l.id === asset.locationId);
                    const userMatched = db.users.find(u => u.id === asset.assignedUserId);

                    const isSelected = selectedAssetIds.includes(asset.id);

                    return (
                      <div
                        key={asset.id}
                        className={`p-5 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 ${isSelected ? "bg-slate-50/80" : ""}`}
                      >
                        {isEditable && (
                          <div className="shrink-0 flex items-center pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAssetIds(prev =>
                                  prev.includes(asset.id)
                                    ? prev.filter(id => id !== asset.id)
                                    : [...prev, asset.id]
                                );
                              }}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer w-4 h-4"
                            />
                          </div>
                        )}
                        {/* Left Column: Visual Thumbnail */}
                        <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-lg shrink-0 flex items-center justify-center p-0.5 overflow-hidden">
                          {asset.image ? (
                            asset.image.startsWith("http") ? (
                              <img
                                src={asset.image}
                                alt={asset.name}
                                className="w-full h-full object-cover rounded"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full transform scale-90">
                                <CategoryBlueprintSVG
                                  categoryId={asset.categoryId}
                                  imageValue={asset.image}
                                  assetTag={asset.assetTag}
                                />
                              </div>
                            )
                          ) : (
                            <CategoryBlueprintMini
                              categoryId={asset.categoryId}
                              styleCode="default"
                            />
                          )}
                        </div>

                        <div className="space-y-2 flex-1 min-w-0 w-full">
                          {/* Upper row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded font-mono shadow-sm">
                              {asset.assetTag}
                            </span>
                            <span className="text-[10px] uppercase font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {category?.name || "Corporate Asset"}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              asset.condition === AssetCondition.EXCELLENT ? "bg-emerald-50 text-emerald-700" :
                              asset.condition === AssetCondition.GOOD ? "bg-green-50 text-green-700" :
                              "bg-orange-50 text-orange-700"
                            }`}>
                              {asset.condition} Condition
                            </span>
                          </div>

                          {/* Title & Secondary descriptive lines */}
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 font-display leading-tight">{asset.name}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-[11px] text-slate-500 mt-2 font-medium">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {location?.name || "Unplaced"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {department?.name || "Office Group"}
                              </span>
                              {userMatched && (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {userMatched.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side options: Price, Actions, and QR Preview */}
                        <div className="flex flex-row md:flex-col justify-between items-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                          {/* Cost visual */}
                          <div className="text-left md:text-right">
                            <span className="text-xs text-slate-400">Inventory Valuation:</span>
                            <p className="text-base font-bold text-slate-900 font-mono">
                              {formatCurrency(asset.purchaseCost)}
                            </p>
                          </div>

                          {/* Status badge and functional actions */}
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              asset.status === AssetStatus.ACTIVE ? "bg-emerald-500 text-white shadow-sm" :
                              asset.status === AssetStatus.UNDER_MAINTENANCE ? "bg-amber-500 text-white shadow-sm" :
                              asset.status === AssetStatus.DAMAGED ? "bg-rose-500 text-white shadow-sm" :
                              "bg-slate-500 text-white shadow-sm"
                            }`}>
                              {asset.status}
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedAsset(asset)}
                              title="Review Dossier"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg hover:text-slate-900 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(asset)}
                                title="Modify Asset details"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg hover:text-slate-900 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openQrLookup(asset)}
                              title="Interactive scan QR code"
                              className="p-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg cursor-pointer transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setExportQrAsset(asset)}
                              title="Generate & Download Real QR Code"
                              className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Asset Full Dossier slidepanel/modal */}
      {selectedAsset && !isEdit && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Upper Info */}
            <div className="bg-slate-950 text-white p-6 relative">
              <button
                onClick={() => setSelectedAsset(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold tracking-wider font-mono text-emerald-400">FAIMS REGISTER PASSPORT</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-display font-medium">{selectedAsset.name}</h3>
                </div>
                <p className="text-slate-300 text-xs font-mono">Registry Token ID: {selectedAsset.id} • Barcode: {selectedAsset.assetTag}</p>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Side: Photo Generator Panel & QR Code Stacked */}
                <div className="space-y-4">
                  {/* Photo Section */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between text-center relative overflow-hidden">
                    <span className="font-semibold text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-2">
                      Asset Photograph
                    </span>

                    {isGenerating ? (
                      <div className="w-full h-32 bg-slate-950 rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                          <div className="w-16 h-16 border-2 border-dashed border-emerald-400 rounded-lg relative flex items-center justify-center">
                            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-500" />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-500" />
                            <div className="absolute w-full h-[1.5px] bg-emerald-500 shadow-[0_0_8px_#10b981] rounded animate-bounce" />
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 mt-2 animate-pulse uppercase max-w-[130px] line-clamp-1">
                          {generationStep}
                        </span>
                      </div>
                    ) : selectedAsset.image ? (
                      <div className="space-y-3">
                        <div className="aspect-video w-full rounded-lg bg-slate-950 border border-slate-700/60 overflow-hidden relative flex items-center justify-center p-0.5">
                          {selectedAsset.image.startsWith("http") ? (
                            <img
                              src={selectedAsset.image}
                              alt={selectedAsset.name}
                              className="w-full h-full object-cover rounded-md"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full">
                              <CategoryBlueprintSVG
                                categoryId={selectedAsset.categoryId}
                                imageValue={selectedAsset.image}
                                assetTag={selectedAsset.assetTag}
                              />
                            </div>
                          )}
                        </div>

                        {/* Quick Style Switcher / Regenerator control */}
                        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800/80 gap-1">
                            <button
                              onClick={() => setSelectedGenStyle("blueprint")}
                              className={`flex-1 py-1 text-[8px] font-bold rounded cursor-pointer transition-colors ${selectedGenStyle === "blueprint" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Blueprint
                            </button>
                            <button
                              onClick={() => setSelectedGenStyle("isometric")}
                              className={`flex-1 py-1 text-[8px] font-bold rounded cursor-pointer transition-colors ${selectedGenStyle === "isometric" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Iso 3D
                            </button>
                            <button
                              onClick={() => setSelectedGenStyle("photo")}
                              className={`flex-1 py-1 text-[8px] font-bold rounded cursor-pointer transition-colors ${selectedGenStyle === "photo" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Photo
                            </button>
                          </div>
                          <button
                            onClick={() => handleGenerateAssetRepresentation(selectedAsset.id)}
                            className="py-1 bg-slate-850 hover:bg-slate-800 text-[9px] font-semibold text-slate-300 rounded cursor-pointer border border-slate-800 transition-colors flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-400" /> Synthesize Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="h-28 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center p-3 text-center">
                          <Eye className="w-6 h-6 text-slate-700 mb-1.5" />
                          <span className="text-[10px] font-semibold text-slate-500">Image Asset Missing</span>
                          <span className="text-[8.5px] text-slate-600 mt-0.5 line-clamp-2">No photo configured for this physical asset.</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800/80 gap-1 justify-between">
                            <button
                              onClick={() => setSelectedGenStyle("blueprint")}
                              className={`flex-1 py-1 text-[8px] font-bold rounded cursor-pointer transition-colors ${selectedGenStyle === "blueprint" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Blueprint
                            </button>
                            <button
                              onClick={() => setSelectedGenStyle("isometric")}
                              className={`flex-1 py-1 text-[8px] font-bold rounded cursor-pointer transition-colors ${selectedGenStyle === "isometric" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Iso 3D
                            </button>
                            <button
                              onClick={() => setSelectedGenStyle("photo")}
                              className={`flex-1 py-1 text-[8px] font-bold rounded cursor-pointer transition-colors ${selectedGenStyle === "photo" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Photo
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleGenerateAssetRepresentation(selectedAsset.id)}
                            className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[9px] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Synthesize Photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visual QR Code section */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-[#27272a] flex flex-col items-center justify-center space-y-2 text-center">
                    <span className="font-semibold text-zinc-500 font-mono text-[10px]">REAL-TIME QR CODE</span>
                    <div className="p-1.5 bg-white rounded border border-zinc-700">
                      <QRCodeCanvas
                        id={`qr-canvas-export-${selectedAsset.assetTag}`}
                        value={`https://faims.local/assets/profile/${selectedAsset.assetTag}`}
                        size={100}
                        bgColor="#ffffff"
                        fgColor="#121214"
                        level="H"
                      />
                    </div>
                    <span className="text-[10px] text-blue-400 font-mono font-bold mt-1">{selectedAsset.assetTag}</span>
                    <button
                      onClick={() => {
                        setExportQrAsset(selectedAsset);
                      }}
                      className="w-full mt-2 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-[10px] cursor-pointer transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Exporter & Print
                    </button>
                  </div>
                </div>

                {/* Core Parameters grid */}
                <div className="md:col-span-2 grid grid-cols-2 gap-x-4 gap-y-3 font-medium text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Current Asset Class:</span>
                    <span className="text-slate-900 text-xs">
                      {db.categories.find(c => c.id === selectedAsset.categoryId)?.name || "Default Category"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cost Value:</span>
                    <span className="text-slate-900 text-xs font-mono font-bold">
                      {formatCurrency(selectedAsset.purchaseCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Designated Group:</span>
                    <span className="text-slate-900 text-xs">
                      {db.departments.find(d => d.id === selectedAsset.departmentId)?.name || "Corporate Team"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Physical Room Location:</span>
                    <span className="text-slate-900 text-xs">
                      {db.locations.find(l => l.id === selectedAsset.locationId)?.name || "Warehouse Desk"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Manufacturer Serial S/N:</span>
                    <span className="text-slate-900 text-xs font-mono select-all">
                      {selectedAsset.serialNumber || "N/A - Internal"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Warranty Policy Limit:</span>
                    <span className="text-rose-600 text-xs font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" /> {formatDate(selectedAsset.warrantyExpiry) || "Expired Policy"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vendor Vendor Supplier:</span>
                    <span className="text-slate-900 text-xs">
                      {db.suppliers.find(s => s.id === selectedAsset.supplierId)?.name || "Indirect Procurement"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Responsible Party:</span>
                    <span className="text-slate-900 text-xs font-semibold">
                      {db.users.find(u => u.id === selectedAsset.assignedUserId)?.name || "Not Bound/Shared Desk"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance & Verification Timeline logs under specific asset context */}
              <div className="space-y-3">
                <span className="font-bold uppercase tracking-wider text-slate-600 block text-[10px]">Asset Operational Diagnostics & Diagnostics history</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Maintenance block */}
                  <div className="bg-slate-55 p-3 rounded-lg border border-slate-100">
                    <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" /> Professional Service Cycles
                    </h5>
                    {db.maintenance.filter(m => m.assetId === selectedAsset.id).length === 0 ? (
                      <p className="text-slate-400 text-[10px] italic">No active maintenance record log registered.</p>
                    ) : (
                      <div className="space-y-2">
                        {db.maintenance.filter(m => m.assetId === selectedAsset.id).map(m => (
                          <div key={m.id} className="text-[11px] pb-1.5 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                            <div className="flex justify-between font-semibold text-slate-800">
                              <span>Maint-ID: {m.id}</span>
                              <span className="text-amber-700">{m.status}</span>
                            </div>
                            <p className="text-slate-500 mt-0.5">{m.notes}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Verification block */}
                  <div className="bg-slate-55 p-3 rounded-lg border border-slate-100">
                    <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Verification inspections
                    </h5>
                    {db.verifications.filter(v => v.assetId === selectedAsset.id).length === 0 ? (
                      <p className="text-slate-400 text-[10px] italic">Ready for first physical inspection verification.</p>
                    ) : (
                      <div className="space-y-2">
                        {db.verifications.filter(v => v.assetId === selectedAsset.id).map(v => (
                          <div key={v.id} className="text-[11px] pb-1.5 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                            <div className="flex justify-between font-semibold text-slate-800">
                              <span>Date: {v.verificationDate}</span>
                              <span className="text-emerald-700 font-bold">{v.result}</span>
                            </div>
                            <p className="text-slate-500 mt-0.5">{v.notes}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Remarks/Notes */}
              <div className="bg-slate-50 p-3.5 rounded-lg text-slate-600">
                <span className="font-bold block text-slate-700 text-[10px] mb-1">Administrative Notes / Context:</span>
                <p className="leading-relaxed italic">{selectedAsset.notes || "No special administrative notes bind this portfolio register."}</p>
              </div>

            </div>

            {/* Panel footer operations */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-400 font-mono">Status: {selectedAsset.status} • {selectedAsset.condition} Condition</span>
              <div className="flex gap-2">
                {isEditable && (
                  <button
                    onClick={() => handleOpenEdit(selectedAsset)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Edit Details
                  </button>
                )}
                <button
                  onClick={() => { setSelectedAsset(null); onNavigateToMaintenance(selectedAsset.id); }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Configure Service
                </button>
                <button
                  onClick={() => { setSelectedAsset(null); onNavigateToVerification(selectedAsset.id); }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Verify Audit Status
                </button>
                {canDeleteAsset && (
                  <button
                    onClick={() => handleDeleteAsset(selectedAsset.id, selectedAsset.assetTag)}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer/90"
                  >
                    Delete Entry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Create Form Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-display font-semibold">Register Corporate Capital Asset</h3>
              <p className="text-xs text-slate-300 font-mono">Assigns physical tag: {generatedNextTag}</p>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell UltraSharp 32-inch 4K Monitor"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Classification Category *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {db.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Department Holder *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                  >
                    {db.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Physical Site Room Location *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  >
                    {db.locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 font-mono">MANUFACTURER SERIAL S/N *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-W889100234X"
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Acquisition Vendor Supplier *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                  >
                    {db.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Assigned Accountability User (Optional)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formAssignedUser}
                    onChange={(e) => setFormAssignedUser(e.target.value)}
                  >
                    <option value="">Leave unassigned / Shared</option>
                    {db.users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 md:col-span-2 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-600" /> Client Section *
                      </label>
                      <p className="text-[10px] text-slate-500 mt-0.5">Select an existing client or create one without leaving registration.</p>
                    </div>
                    {canCreateClient && (
                      <button
                        type="button"
                        onClick={() => {
                          resetNewClientForm(db.clients);
                          setIsQuickClientOpen(true);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Client
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formClientMode === "existing"}
                        onChange={() => setFormClientMode("existing")}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      Select Existing Client
                    </label>
                    {canCreateClient && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formClientMode === "new"}
                          onChange={() => {
                            setFormClientMode("new");
                            resetNewClientForm(db.clients);
                          }}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        Create New Client
                      </label>
                    )}
                  </div>

                  {formClientMode === "existing" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Search Client</label>
                        <input
                          type="search"
                          placeholder="Search by client, code, contact, or email"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Select Client *</label>
                        <select
                          required
                          value={formClientId}
                          onChange={(e) => setFormClientId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                        >
                          <option value="">Select client</option>
                          {filteredClientOptions.map(client => (
                            <option key={client.id} value={client.id}>{client.name} ({client.code}) - {client.district || "District N/A"}, {client.region || "Region N/A"}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Client Name / Organization Name *</label>
                        <input required value={newClientName} onChange={(e) => { setNewClientName(e.target.value); setNewClientCode(generateClientCode(e.target.value, db.clients)); }} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Client Code (Auto Generate)</label>
                        <input readOnly value={newClientCode} className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-slate-600 font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Contact Person *</label>
                        <input required value={newClientContact} onChange={(e) => setNewClientContact(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Phone Number</label>
                        <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Email Address</label>
                        <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Client Type</label>
                        <select value={newClientOrgType} onChange={(e) => setNewClientOrgType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                          {MALAWI_CLIENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Region</label>
                        <select value={newClientRegion} onChange={(e) => {
                          const region = e.target.value as MalawiRegion;
                          setNewClientRegion(region);
                          setNewClientDistrict(MALAWI_DISTRICTS[region][0]);
                        }} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                          {MALAWI_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">District</label>
                        <select value={newClientDistrict} onChange={(e) => setNewClientDistrict(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                          {MALAWI_DISTRICTS[newClientRegion].map(district => <option key={district} value={district}>{district}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Physical Address</label>
                        <input value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Postal Address</label>
                        <input value={newClientPostalAddress} onChange={(e) => setNewClientPostalAddress(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Registration Number (Optional)</label>
                        <input value={newClientRegistrationNumber} onChange={(e) => setNewClientRegistrationNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">TIN Number (Optional)</label>
                        <input value={newClientTinNumber} onChange={(e) => setNewClientTinNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Status</label>
                        <select value={newClientStatus} onChange={(e) => setNewClientStatus(e.target.value as Client["status"])} className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Acquisition Cost Code *</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1500"
                      value={formPurchaseCost}
                      onChange={(e) => setFormPurchaseCost(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Acquisition Date *</label>
                  <input
                    type="date"
                    required
                    value={formPurchaseDate}
                    onChange={(e) => setFormPurchaseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Warranty Expiration Limit *</label>
                  <input
                    type="date"
                    required
                    value={formWarrantyExpiry}
                    onChange={(e) => setFormWarrantyExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Asset Condition *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as AssetCondition)}
                  >
                    {Object.values(AssetCondition).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700 font-display">Administrative notes</label>
                  <textarea
                    rows={3}
                    placeholder="State any specific serial parameters, accessory bindings, or operational context..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-semibold cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQuickClientOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-end p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="bg-slate-900 text-white p-5">
              <button
                type="button"
                onClick={() => setIsQuickClientOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" /> Create Client
              </h3>
              <p className="text-xs text-slate-300 font-mono">Saved client will populate the asset registration field.</p>
            </div>

            <form onSubmit={saveQuickClient} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Client Name / Organization Name *</label>
                  <input
                    required
                    value={newClientName}
                    onChange={(e) => {
                      setNewClientName(e.target.value);
                      setNewClientCode(generateClientCode(e.target.value, db.clients));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Code</label>
                  <input readOnly value={newClientCode} className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-slate-600 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contact Person *</label>
                  <input required value={newClientContact} onChange={(e) => setNewClientContact(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Physical Address</label>
                  <input value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Type</label>
                  <select value={newClientOrgType} onChange={(e) => setNewClientOrgType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    {MALAWI_CLIENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Region</label>
                  <select value={newClientRegion} onChange={(e) => {
                    const region = e.target.value as MalawiRegion;
                    setNewClientRegion(region);
                    setNewClientDistrict(MALAWI_DISTRICTS[region][0]);
                  }} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    {MALAWI_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">District</label>
                  <select value={newClientDistrict} onChange={(e) => setNewClientDistrict(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    {MALAWI_DISTRICTS[newClientRegion].map(district => <option key={district} value={district}>{district}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select value={newClientStatus} onChange={(e) => setNewClientStatus(e.target.value as Client["status"])} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Postal Address</label>
                  <input value={newClientPostalAddress} onChange={(e) => setNewClientPostalAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Registration Number (Optional)</label>
                  <input value={newClientRegistrationNumber} onChange={(e) => setNewClientRegistrationNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">TIN Number (Optional)</label>
                  <input value={newClientTinNumber} onChange={(e) => setNewClientTinNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl -mx-6 -mb-6">
                <button type="button" onClick={() => setIsQuickClientOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-semibold cursor-pointer">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Edit Form Modal */}
      {isEdit && selectedAsset && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5">
              <button
                onClick={() => setIsEdit(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-display font-semibold">Modify Registered Asset</h3>
              <p className="text-slate-300 text-xs font-mono">Modifying parameters of Tag: {selectedAsset.assetTag}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Classification Category *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {db.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Department Holder *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                  >
                    {db.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 font-mono">MANUFACTURER SERIAL S/N *</label>
                  <input
                    type="text"
                    required
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Supplier Vendor *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                  >
                    {db.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Physical Site Room Location *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  >
                    {db.locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Assigned Accountability User (Optional)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formAssignedUser}
                    onChange={(e) => setFormAssignedUser(e.target.value)}
                  >
                    <option value="">Leave unassigned / Shared</option>
                    {db.users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Acquisition Cost Code *</label>
                  <input
                    type="number"
                    required
                    value={formPurchaseCost}
                    onChange={(e) => setFormPurchaseCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Warranty Expiration Limit *</label>
                  <input
                    type="date"
                    required
                    value={formWarrantyExpiry}
                    onChange={(e) => setFormWarrantyExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 font-display">Asset Condition *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as AssetCondition)}
                  >
                    {Object.values(AssetCondition).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 font-display">Asset Lifecycle Status *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AssetStatus)}
                  >
                    {Object.values(AssetStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700 font-display">Administrative notes</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl mt-4">
                <button
                  type="button"
                  onClick={() => setIsEdit(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-semibold cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Barcode / QR Scan and manual live-register lookup console */}
      {qrConsoleOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-display font-semibold flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400 animate-pulse" /> FAIMS Optical Scanning Hub
                </h3>
                <p className="text-[10px] text-slate-300">Scan physical asset QR labels with camera or use live register lookup</p>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setQrConsoleOpen(false);
                  setScanResult(null);
                  setScannerInput("");
                  setCameraScanError(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Selector Tabs */}
            {!scanResult && (
              <div className="p-4 pb-0 bg-slate-50 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setScanTab("camera");
                    }}
                    className={`py-1.5 rounded-md font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      scanTab === "camera" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" /> Device Camera Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setScanTab("simulation");
                    }}
                    className={`py-1.5 rounded-md font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      scanTab === "simulation" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" /> Register Lookup
                  </button>
                </div>
              </div>
            )}

            {/* Live view screen */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {!scanResult ? (
                <div className="space-y-4">
                  
                  {scanTab === "camera" ? (
                    // REAL WEB CAMERA SCANNER VIEW
                    <div className="space-y-4">
                      <div className="aspect-video bg-slate-950 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-0 border-4 border-slate-900">
                        {isCameraActive ? (
                          <>
                            <video
                              ref={videoRef}
                              className="w-full h-full object-cover"
                              playsInline
                              muted
                            />
                            {/* Scanning Viewfinder HUD overlay */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                              <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-lg relative flex items-center justify-center">
                                {/* Corners */}
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-rose-500" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-rose-500" />
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-rose-500" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-rose-500" />
                                {/* Scanning line */}
                                <div className="absolute w-full h-[3px] bg-rose-500 shadow-[0_0_12px_#ef4444] rounded animate-bounce" />
                              </div>
                              <span className="text-[9.5px] font-mono font-bold text-white bg-slate-900/85 px-2.5 py-1 rounded mt-4 tracking-widest uppercase animate-pulse">
                                Align asset barcode inside grid
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="p-6 text-center space-y-3.5 text-slate-400">
                            <Camera className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
                            <div>
                              <p className="font-semibold text-slate-200">Hardware Camera Integration</p>
                              <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1">
                                Lock camera to automatically parse, scan, decode and immediately load custom tags or prints
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={startCamera}
                              className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2 shadow"
                            >
                              <Camera className="w-4 h-4" /> Start Video Stream
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Hardware controllers menu option */}
                      {isCameraActive && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-1.5 rounded text-[10px] cursor-pointer animate-fade-in"
                          >
                            🔒 Close Feed
                          </button>

                          {cameraDevices.length > 1 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-medium">Select Source Lens:</span>
                              <select
                                className="bg-white border border-slate-200 rounded p-1 text-[10px]"
                                value={selectedCameraId}
                                onChange={(e) => {
                                  setSelectedCameraId(e.target.value);
                                  // restart stream with new camera ID
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

                      {cameraScanError && (
                        <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg font-medium leading-relaxed">
                          ⚠️ {cameraScanError}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Manual lookup fallback when camera access is unavailable.
                    <div className="space-y-4">
                      {/* Digital Viewfinder Box */}
                      <div className="aspect-video bg-slate-950 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-4 text-center border-4 border-emerald-500/20">
                        {/* Corner Reticles */}
                        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br" />

                        {isScanning ? (
                          <div className="space-y-3">
                            {/* Red scanner horizontal sweeps */}
                            <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_8px_rgb(239,68,68)] animate-[bounce_1.5s_infinite]" />
                            <p className="text-emerald-400 font-mono text-[11px] tracking-widest animate-pulse font-semibold">DECODING DIGITAL MATRIX...</p>
                            <p className="text-slate-500 text-[10px]">Tag: {scannerInput}</p>
                          </div>
                        ) : (
                          <div className="space-y-2 text-slate-400">
                            <QrCode className="w-12 h-12 stroke-slate-700 mx-auto" />
                            <p className="font-semibold text-slate-300">Optical Finder Core Standby</p>
                            <p className="text-[10px] max-w-sm mx-auto text-slate-500">Pick any asset from register index and press the QR scan button, or type tag id manually below</p>
                          </div>
                        )}
                      </div>

                      {/* Manual input box with autocomplete quick lists */}
                      <form onSubmit={handleManualScanSubmit} className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Or Target Tag Input / Asset S/N Identifier</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={scannerInput}
                              onChange={(e) => setScannerInput(e.target.value)}
                              placeholder="e.g. GPL-AST-0002"
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-mono text-slate-800 uppercase"
                            />
                            <button
                              type="submit"
                              disabled={isScanning}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg px-4 py-2 cursor-pointer transition-colors shrink-0 disabled:opacity-40"
                            >
                              Analyze Tag
                            </button>
                          </div>
                        </div>

                        {/* Quick Seed tags checklist */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-semibold">Available register tags:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {db.assets.map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => { setScannerInput(a.assetTag); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[9px] px-2 py-1 rounded cursor-pointer"
                              >
                                {a.assetTag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                </div>
              ) : (
                /* Successful QR Target dossier binding */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                    <Zap className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs">DECODED PASSPORT DETECTED</h4>
                      <p className="text-[10px] text-emerald-600 font-mono mt-0.5">Asset matches Tag binding {scanResult.assetTag}</p>
                    </div>
                  </div>

                  {/* Micro dashboard layout of result */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{scanResult.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Serial: {scanResult.serialNumber}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-900 text-white rounded">
                        {scanResult.assetTag}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Class Category:</span>
                        {db.categories.find(c => c.id === scanResult.categoryId)?.name || "Corporate Class"}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Physical Location Room:</span>
                        {db.locations.find(l => l.id === scanResult.locationId)?.name || "Main Offices"}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Purchase Cost Policy:</span>
                        <strong className="text-slate-900 font-mono">{formatCurrency(scanResult.purchaseCost)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Designated Team Name:</span>
                        {db.departments.find(d => d.id === scanResult.departmentId)?.name || "HQ Admin"}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Assigned Accountability:</span>
                        <strong className="text-slate-900">{db.users.find(u => u.id === scanResult.assignedUserId)?.name || "Shared"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Condition Condition Current:</span>
                        <span className="text-rose-600 font-semibold">{scanResult.condition}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setScanResult(null)}
                      className="flex-1 text-center py-2 border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Scan Another Asset Tag
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAsset(scanResult);
                        setQrConsoleOpen(false);
                        setScanResult(null);
                        setScannerInput("");
                      }}
                      className="flex-1 text-center py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Open Full Document Dossier
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-slate-400 text-[10px]">
              FAIMS optical recognition system router • Giant Plus Limited
            </div>
          </div>
        </div>
      )}
      {/* EXPORTABLE QR CODE GENERATOR & PRINTER MODAL */}
      {exportQrAsset && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-[#27272a] rounded-2xl max-w-3xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            {/* Header */}
            <div className="bg-[#18181b] border-b border-[#27272a] p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-display font-semibold flex items-center gap-2 text-white">
                  <QrCode className="w-5 h-5 text-blue-500 animate-pulse" /> Digital QR Code Asset Label Generator
                </h3>
                <p className="text-[10px] text-zinc-400">Generate, customize, and download high-resolution labels for corporate inventories</p>
              </div>
              <button
                onClick={() => setExportQrAsset(null)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left pane: Options */}
              <div className="space-y-4">
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3.5">
                  <h4 className="font-bold text-zinc-300 uppercase tracking-wide text-[10px] border-b border-zinc-800 pb-2">Customization Options</h4>
                  
                  {/* Format */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400">QR Code Embedded Content Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setQrValueFormat("url")}
                        className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${
                          qrValueFormat === "url" ? "bg-blue-600 text-white font-bold" : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Web URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrValueFormat("tag")}
                        className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${
                          qrValueFormat === "tag" ? "bg-blue-600 text-white font-bold" : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Raw Tag ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrValueFormat("json")}
                        className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${
                          qrValueFormat === "json" ? "bg-blue-600 text-white font-bold" : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        JSON Spec
                      </button>
                    </div>
                  </div>

                  {/* Size Preset */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400">Resolution Sizing Preset</label>
                    <select
                      value={qrSize}
                      onChange={(e) => setQrSize(parseInt(e.target.value))}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded py-2 px-3 text-white font-semibold cursor-pointer"
                    >
                      <option value="128">Micro Label (128 x 128 px)</option>
                      <option value="256">Standard Tag (256 x 256 px)</option>
                      <option value="384">High Res Desk Sticker (384 x 384 px)</option>
                      <option value="512">Ultra Durable Asset Placard (512 x 512 px)</option>
                    </select>
                  </div>

                  {/* Themes / Colors presets */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400">Sticker Palette Color Presets</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setQrFgColor("#121214"); setQrBgColor("#ffffff"); }}
                        className="py-2 px-3 rounded bg-white text-zinc-900 border border-zinc-300 font-bold hover:bg-zinc-50 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        📋 Light Label
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQrFgColor("#ffffff"); setQrBgColor("#121214"); }}
                        className="py-2 px-3 rounded bg-[#121214] text-white border border-zinc-700 font-bold hover:bg-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        🖤 Dark Slate
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQrFgColor("#10b981"); setQrBgColor("#121214"); }}
                        className="py-2 px-3 rounded bg-[#121214] text-emerald-400 border border-[#27272a] font-bold hover:bg-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        💚 Terminal Green
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQrFgColor("#3b82f6"); setQrBgColor("#121214"); }}
                        className="py-2 px-3 rounded bg-[#121214] text-blue-400 border border-[#27272a] font-bold hover:bg-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        💙 Solid Blue
                      </button>
                    </div>
                  </div>

                  {/* Label options */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="toggle-label"
                      checked={includeLabel}
                      onChange={(e) => setIncludeLabel(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 bg-[#09090b] border-zinc-800 cursor-pointer"
                    />
                    <label htmlFor="toggle-label" className="font-semibold text-zinc-300 cursor-pointer">Include Human Readable Tag & Specs on Sticker</label>
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-zinc-400 leading-normal font-sans">
                  <span className="font-bold text-zinc-300 block mb-1">Optical Verification Note:</span>
                  Embedding format <strong>{qrValueFormat === "url" ? "Web Service Redirection URL" : qrValueFormat === "tag" ? "Raw Asset Tag Code" : "Asset JSON Entity Descriptor"}</strong> makes this asset scan compatible with all standard corporate network scanners or customized external terminals.
                </div>
              </div>

              {/* Right pane: Visual Sticker Preview Card */}
              <div className="flex flex-col items-center justify-center bg-[#18181b] border border-[#27272a] rounded-xl p-6 relative">
                <span className="absolute top-2.5 left-3 text-[9px] uppercase font-mono tracking-widest text-zinc-500">Live Calibration Preview</span>
                
                {/* Bounding cutout line */}
                <div 
                  className="rounded-lg shadow-xl p-6 flex flex-col items-center justify-center space-y-4 max-w-[280px] w-full text-center border-2 border-dashed border-zinc-700 transition-all font-sans"
                  style={{ backgroundColor: qrBgColor, color: qrFgColor }}
                >
                  <p className="text-[10px] font-bold tracking-widest uppercase opacity-75 font-display">GIANT PLUS 固定資産</p>
                  
                  <div className="p-2.5 rounded-xl shadow-inner border border-zinc-850" style={{ backgroundColor: qrBgColor }}>
                    <QRCodeCanvas
                      id={`qr-canvas-export-generator-${exportQrAsset.assetTag}`}
                      value={
                        qrValueFormat === "url" 
                          ? `https://faims.local/assets/profile/${exportQrAsset.assetTag}`
                          : qrValueFormat === "tag"
                          ? exportQrAsset.assetTag
                          : JSON.stringify({ tag: exportQrAsset.assetTag, sn: exportQrAsset.serialNumber, name: exportQrAsset.name })
                      }
                      size={qrSize}
                      bgColor={qrBgColor}
                      fgColor={qrFgColor}
                      level="H"
                      style={{ width: "100%", height: "auto", maxWidth: "180px" }}
                    />
                  </div>

                  {includeLabel && (
                    <div className="space-y-1 font-mono">
                      <p className="text-xs font-bold leading-tight uppercase tracking-wide truncate max-w-[240px]">{exportQrAsset.name}</p>
                      <p className="text-[11px] font-bold tracking-wider">{exportQrAsset.assetTag}</p>
                      <p className="text-[8px] opacity-75">S/N: {exportQrAsset.serialNumber || "INTERNAL"}</p>
                    </div>
                  )}
                </div>

                <div className="w-full mt-5 flex gap-2">
                  <button
                    onClick={() => handleDownloadQR(exportQrAsset.assetTag)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Download className="w-4 h-4" /> Save Tag PNG
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg flex items-center justify-center cursor-pointer text-xs"
                    title="Send to client labels printer"
                  >
                    Print Label
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#18181b] border-t border-[#27272a] flex justify-end">
              <button
                type="button"
                onClick={() => setExportQrAsset(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-5 py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                Close Generator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS TOOLBAR */}
      {selectedAssetIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans">
          <form onSubmit={handleExecuteBulkAction}>
            {bulkActionType === null ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-slate-850 rounded-xl text-yellow-400 font-bold border border-slate-800 flex items-center justify-center">
                    <Sliders className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">Bulk Actions Controller</h4>
                    <p className="text-[11px] text-slate-400">
                      You have selected <strong className="text-white font-mono">{selectedAssetIds.length}</strong> assets. Select a bulk procedure below:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkActionType("transfer");
                      // Initialize default selection dropdown values
                      if (db.departments.length > 0) setBulkTransferDept(db.departments[0].id);
                      if (db.locations.length > 0) setBulkTransferLoc(db.locations[0].id);
                    }}
                    className="flex-1 md:flex-initial py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>🚀</span> Batch Transfer
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkActionType("maintenance")}
                    className="flex-1 md:flex-initial py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>🔧</span> Schedule Repair
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkActionType("disposal")}
                    className="flex-1 md:flex-initial py-2 px-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>🗑️</span> Request Disposal
                  </button>

                  <button
                    type="button"
                    onClick={clearBulkSelection}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header for the specific action */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {bulkActionType === "transfer" && "🚀"}
                      {bulkActionType === "maintenance" && "🔧"}
                      {bulkActionType === "disposal" && "🗑️"}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold capitalize">
                        Batch {bulkActionType} Procedure
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Applying changes to {selectedAssetIds.length} selected assets.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkActionType(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4 text-slate-405" />
                  </button>
                </div>

                {/* Body details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {bulkActionType === "transfer" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Destination Department
                        </label>
                        <select
                          required
                          value={bulkTransferDept}
                          onChange={(e) => setBulkTransferDept(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {db.departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Destination Location Site
                        </label>
                        <select
                          required
                          value={bulkTransferLoc}
                          onChange={(e) => setBulkTransferLoc(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {db.locations.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Transfer Remarks / Reason
                        </label>
                        <input
                          type="text"
                          value={bulkTransferRemarks}
                          onChange={(e) => setBulkTransferRemarks(e.target.value)}
                          placeholder="e.g. Relocating to new branch division"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>
                    </>
                  )}

                  {bulkActionType === "maintenance" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Service Provider / Team
                        </label>
                        <input
                          type="text"
                          value={bulkMaintProvider}
                          required
                          onChange={(e) => setBulkMaintProvider(e.target.value)}
                          placeholder="e.g. Acme Tech Support"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Technician Name
                        </label>
                        <input
                          type="text"
                          value={bulkMaintTechnician}
                          required
                          onChange={(e) => setBulkMaintTechnician(e.target.value)}
                          placeholder="e.g. John Doe, Lead Clerk"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Est Cost Per Asset ($)
                          </label>
                        </div>
                        <input
                          type="number"
                          value={bulkMaintCost}
                          onChange={(e) => setBulkMaintCost(e.target.value)}
                          placeholder="e.g. 150"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Scope of Maintenance / Repair Notes
                        </label>
                        <input
                          type="text"
                          value={bulkMaintNotes}
                          onChange={(e) => setBulkMaintNotes(e.target.value)}
                          placeholder="e.g. Routine diagnostics, software upgrade & terminal checking."
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>
                    </>
                  )}

                  {bulkActionType === "disposal" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Decommissioning Method
                        </label>
                        <select
                          value={bulkDisposalMethod}
                          onChange={(e) => setBulkDisposalMethod(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:border-rose-500 cursor-pointer"
                        >
                          <option value="Sold">Sold</option>
                          <option value="Scrapped">Scrapped</option>
                          <option value="Donated">Donated</option>
                          <option value="Recycled">Recycled</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Justification Reason
                        </label>
                        <input
                          type="text"
                          required
                          value={bulkDisposalReason}
                          onChange={(e) => setBulkDisposalReason(e.target.value)}
                          placeholder="e.g. End of lifetime cycle, unrepairable equipment failure."
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Footer confirming buttons */}
                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setBulkActionType(null)}
                    className="py-1.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className={`py-1.5 px-4 font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-colors ${
                      bulkActionType === "transfer" ? "bg-indigo-600 hover:bg-indigo-500 text-white" :
                      bulkActionType === "maintenance" ? "bg-amber-500 hover:bg-amber-400 text-slate-950" :
                      "bg-rose-600 hover:bg-rose-400 text-white"
                    }`}
                  >
                    Execute Batch {bulkActionType === "transfer" ? "Transfer" : bulkActionType === "maintenance" ? "Servicing" : "Disposal"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
