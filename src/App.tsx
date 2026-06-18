/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Building,
  Activity,
  ArrowRight,
  UserCheck2,
  MoveHorizontal,
  Wrench,
  ClipboardList,
  ArchiveRestore,
  FileText,
  Settings,
  Users,
  LayoutDashboard,
  LogOut,
  Bell,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  FolderTree,
  X,
  FileBadge,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  BarChart3,
  Package,
  RefreshCcw,
  TrendingUp,
  ShieldCheck,
  Menu
} from "lucide-react";
import {
  getDatabaseState,
  saveDatabaseState,
  addAuditRecord,
  isOffline,
  setOfflineMode,
  getOfflineBufferLengths,
  syncOfflineData,
  checkAndAutoTriggerMaintenance,
  startReminderScheduler,
  runReminderEngine,
  completeReminder,
  snoozeReminder,
  formatDate
} from "./db";
import { User, UserRole } from "./types";

// Import modules
import DashboardComponent from "./components/Dashboard";
import AssetManagement from "./components/AssetManagement";
import UserManagement from "./components/UserManagement";
import ModulesAdministration from "./components/ModulesAdministration";
import AssetAssignmentComponent from "./components/AssetAssignment";
import AssetTransferComponent from "./components/AssetTransfer";
import AssetMaintenance from "./components/AssetMaintenance";
import AssetVerification from "./components/AssetVerification";
import AssetDisposal from "./components/AssetDisposal";
import ReportingModule from "./components/ReportingModule";
import AuditLogs from "./components/AuditLogs";
import SystemSettingsComponent from "./components/SystemSettings";
import ProfileComponent from "./components/Profile";
import ClientsManagement from "./components/ClientsManagement";
import ReminderManagement from "./components/ReminderManagement";

type Tab =
  | "Dashboard"
  | "Assets"
  | "Clients"
  | "Operations"
  | "Reports"
  | "UsersSecurity"
  | "Administration"
  | "Settings"
  | "Profile";

export default function App() {
  const [db, setDb] = useState(getDatabaseState());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const currentPreferences = useMemo(() => {
    const defaultTheme = db.settings.systemTheme || "light";
    if (!currentUser) return { theme: defaultTheme as "light" | "dark" | "system", accentColor: "blue" as const, sidebarStyle: "dark" as const, fontSize: "md" as const };
    return currentUser.preferences || { theme: defaultTheme as "light" | "dark" | "system", accentColor: "blue", sidebarStyle: "dark", fontSize: "md" };
  }, [currentUser, db.settings.systemTheme]);

  const [offline, setOffline] = useState(isOffline());
  const [bufferCount, setBufferCount] = useState(getOfflineBufferLengths().total);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto preventive maintenance trigger on app load
  React.useEffect(() => {
    try {
      const { triggeredCount } = checkAndAutoTriggerMaintenance();
      if (triggeredCount > 0) {
        refreshDatabase();
      }
    } catch (e) {
      console.error("Auto-trigger maintenance check failed: ", e);
    }
  }, []);

  React.useEffect(() => {
    const stopReminderScheduler = startReminderScheduler();
    refreshDatabase();
    return stopReminderScheduler;
  }, []);

  React.useEffect(() => {
    const handleNetworkChange = () => {
      setOffline(isOffline());
      setBufferCount(getOfflineBufferLengths().total);
    };
    const handleBufferUpdate = () => {
      setBufferCount(getOfflineBufferLengths().total);
      refreshDatabase();
    };
    const handleDbSynced = () => {
      refreshDatabase();
    };

    window.addEventListener("faims_network_connection_changed", handleNetworkChange);
    window.addEventListener("faims_offline_buffer_updated", handleBufferUpdate);
    window.addEventListener("faims_db_synced", handleDbSynced);

    return () => {
      window.removeEventListener("faims_network_connection_changed", handleNetworkChange);
      window.removeEventListener("faims_offline_buffer_updated", handleBufferUpdate);
      window.removeEventListener("faims_db_synced", handleDbSynced);
    };
  }, []);

  // Theme application effect (handles light, dark, and system themes instantly)
  React.useEffect(() => {
    const applyTheme = () => {
      const activeTheme = currentPreferences?.theme || "light";
      let isDark = false;
      if (activeTheme === "dark") {
        isDark = true;
      } else if (activeTheme === "light") {
        isDark = false;
      } else {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (currentPreferences?.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = () => {
        applyTheme();
      };
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }
  }, [currentPreferences?.theme]);

  const handleConnectionToggle = () => {
    const nextOfflineState = !offline;
    setOfflineMode(nextOfflineState);
  };

  const handleManualSync = () => {
    if (offline) {
      alert("Device is currently configured as OFFLINE. Switch the connection toggle to ONLINE to establish sync pathways.");
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      const stats = syncOfflineData();
      setIsSyncing(false);
      alert(`Synchronization complete! Successfully merged ${stats.verificationsSynced} inspections and ${stats.logsSynced} security records into central registers.`);
    }, 1200);
  };
  
  // Login flow
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Remember Me, recover, and onboarding states
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardName, setOnboardName] = useState("");
  const [onboardPhone, setOnboardPhone] = useState("");
  const [onboardBio, setOnboardBio] = useState("");
  const [onboardAvatar, setOnboardAvatar] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  // Force password change flow
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingChangeUser, setPendingChangeUser] = useState<User | null>(null);

  // Expanded Notification Center support
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "warning" | "reminder" | "assignment" | "system" | "security">("all");

  // Active tab selection
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({
    Dashboard: "EnterpriseOverview",
    Assets: "Overview",
    Operations: "Overview",
    Reports: "Overview",
    UsersSecurity: "Overview",
    Administration: "Overview",
    Settings: "Overview"
  });

  const switchWorkspace = (tab: Tab, subTab?: string) => {
    setActiveTab(tab);
    if (subTab) {
      setActiveSubTabs(prev => ({ ...prev, [tab]: subTab }));
    } else {
      setActiveSubTabs(prev => ({ ...prev, [tab]: "Overview" }));
    }
    setAuditAssetIdRedirect(null);
  };

  // Mobile sidebar drawer state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Notification Drawer
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Asset ID redirection callback state (for immediate verification audit shortcuts)
  const [auditAssetIdRedirect, setAuditAssetIdRedirect] = useState<string | null>(null);

  // Global persistent search states
  const [globalSearch, setGlobalSearch] = useState("");
  const [isGlobalSearchResultsOpen, setIsGlobalSearchResultsOpen] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Keyboard shortcuts HUD state
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Close search on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsGlobalSearchResultsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered Assets for Global Search
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const lowerSearch = globalSearch.toLowerCase().trim();
    return db.assets.filter(
      (asset) =>
        asset.assetTag.toLowerCase().includes(lowerSearch) ||
        asset.name.toLowerCase().includes(lowerSearch) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(lowerSearch))
    );
  }, [globalSearch, db.assets]);

  // Load Remember Me configuration on mount
  React.useEffect(() => {
    const savedEmail = localStorage.getItem("faims_remember_email");
    const savedMe = localStorage.getItem("faims_remember_me");
    if (savedMe === "true" && savedEmail) {
      setEmailInput(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const refreshDatabase = () => {
    const freshDb = getDatabaseState();
    setDb(freshDb);
    if (currentUser) {
      const freshUser = freshDb.users.find(u => u.id === currentUser.id);
      if (freshUser) {
        setCurrentUser(freshUser);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const normalizedEmail = emailInput.trim().toLowerCase();
    const normalizedPassword = passwordInput.trim();
    const currentDB = getDatabaseState();
    const foundUser = currentDB.users.find(u => u.email.trim().toLowerCase() === normalizedEmail);

    if (!foundUser) {
      setLoginError("Credentials unrecognized inside the asset system directory.");
      return;
    }

    const storedPassword = currentDB.passwords[foundUser.id];
    if (storedPassword !== normalizedPassword) {
      setLoginError("Credentials unrecognized inside the asset system directory.");
      return;
    }

    // Save remember me configuration immediately
    if (rememberMe) {
      localStorage.setItem("faims_remember_email", normalizedEmail);
      localStorage.setItem("faims_remember_me", "true");
    } else {
      localStorage.removeItem("faims_remember_email");
      localStorage.removeItem("faims_remember_me");
    }

    // Push browser session metadata available to the client runtime.
    const cleanSessionDevice = typeof navigator !== "undefined" ? navigator.platform || "Browser Client" : "Browser Client";
    const cleanSessionIP = "client-unavailable";
    const cleanSession = {
      id: `sess-${Date.now()}`,
      loginTime: new Date().toISOString(),
      device: cleanSessionDevice,
      browser: typeof navigator !== "undefined" ? navigator.userAgent : "Browser",
      ip: cleanSessionIP
    };

    const userIndex = currentDB.users.findIndex(u => u.id === foundUser.id);
    if (userIndex !== -1) {
      const existingSessions = currentDB.users[userIndex].activeSessions || [];
      existingSessions.unshift(cleanSession);
      currentDB.users[userIndex].activeSessions = existingSessions;
      
      // Also write down login history attempt
      const existingHistory = currentDB.users[userIndex].loginHistory || [];
      existingHistory.unshift({
        timestamp: new Date().toISOString(),
        event: "User Authenticated Portal Sign-In",
        device: cleanSessionDevice,
        browser: typeof navigator !== "undefined" ? navigator.userAgent : "Browser",
        ip: cleanSessionIP,
        status: "success"
      });
      currentDB.users[userIndex].loginHistory = existingHistory;
      
      currentDB.users[userIndex].lastLogin = new Date().toISOString();
      saveDatabaseState(currentDB);
    }

    if (foundUser.forcePasswordChange) {
      setOnboardName(foundUser.name);
      setOnboardPhone(foundUser.phone || "");
      setOnboardBio(foundUser.bio || "");
      setOnboardAvatar(foundUser.avatar || "");
      setPendingChangeUser(foundUser);
      setIsChangingPassword(true);
      return;
    }

    runReminderEngine();
    setCurrentUser(foundUser);
    addAuditRecord(foundUser.id, foundUser.name, "Login Successful", `User authenticated into session under permission level: ${foundUser.role}`);
    refreshDatabase();
  };

  // Forgot Password handler
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage("");

    if (!forgotEmail) {
      setForgotMessage("Error: Corporate email is required.");
      return;
    }

    const currentDB = getDatabaseState();
    const found = currentDB.users.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());

    if (!found) {
      setForgotMessage("Error: The requested email address is not registered in our corporate directories.");
      return;
    }

    currentDB.passwords[found.id] = "CorporateTempPass@123";
    
    const uIdx = currentDB.users.findIndex(u => u.id === found.id);
    if (uIdx !== -1) {
      currentDB.users[uIdx].forcePasswordChange = true;
    }

    saveDatabaseState(currentDB);
    addAuditRecord(found.id, found.name, "Credential Security Triggered", "Temporary reset applied due to recovery request signal.");

    setForgotMessage("Success: SECURE RESET applied. Verification code dispatched. Your temporary password is 'CorporateTempPass@123'. Log in with this credential to initialize onboarding password setup.");
  };

  // Onboarding step 1: Password change
  const handleOnboardStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChangeUser) return;

    if (newPassword.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!pwdRegex.test(newPassword)) {
      alert("Executive security directive: Password must contain at least 1 uppercase letter, 1 number, and 1 special symbol (@$!%*?&).");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Password validation mismatch.");
      return;
    }

    if (!policyAccepted) {
      alert("You must check the box to accept the Corporate Password Security Policy.");
      return;
    }

    // Step 1 done, move to Step 2!
    setOnboardStep(2);
  };

  // Onboarding step 2: Optional details + final verification
  const handleOnboardStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChangeUser) return;

    const currentDB = getDatabaseState();
    
    // Save password
    currentDB.passwords[pendingChangeUser.id] = newPassword;
    
    // Update user onboarding properties & clear forcePasswordChange
    const uIdx = currentDB.users.findIndex(u => u.id === pendingChangeUser.id);
    if (uIdx !== -1) {
      currentDB.users[uIdx].name = onboardName || pendingChangeUser.name;
      currentDB.users[uIdx].phone = onboardPhone;
      currentDB.users[uIdx].bio = onboardBio || "Registered physical auditor.";
      currentDB.users[uIdx].avatar = onboardAvatar;
      currentDB.users[uIdx].forcePasswordChange = false;
      
      saveDatabaseState(currentDB);
      
      // Auto-authenticate this finalized user
      setCurrentUser(currentDB.users[uIdx]);
    }

    addAuditRecord(
      pendingChangeUser.id,
      onboardName || pendingChangeUser.name,
      "First Login Complied",
      "Employee completed first-time onboarding credentials rotation and workspace layout initialization."
    );

    alert("Corporate credentials set successfully! Welcome to your personalized dashboard.");
    setIsChangingPassword(false);
    setPendingChangeUser(null);
    setEmailInput("");
    setPasswordInput("");
    setOnboardStep(1);
    setPolicyAccepted(false);
  };

  // Handle avatar upload during first-activation wizard
  const handleOnboardAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOnboardAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogOut = () => {
    if (currentUser) {
      addAuditRecord(currentUser.id, currentUser.name, "Logout Successful", "Terminated active dashboard session.");
    }
    setCurrentUser(null);
    setActiveTab("Dashboard");
    setIsNotifOpen(false);
  };

  // Define workspaces containing child sub-modules
  type SubModule = {
    id: string;
    name: string;
    icon: React.ReactNode;
    roles: UserRole[];
    description: string;
  };

  type Workspace = {
    id: Tab;
    name: string;
    icon: React.ReactNode;
    roles: UserRole[];
    defaultSubModule: Partial<Record<UserRole, string>>;
    subModules: SubModule[];
  };

  const workspaces: Workspace[] = useMemo(() => [
    {
      id: "Dashboard",
      name: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE],
      defaultSubModule: {
        [UserRole.ADMIN]: "EnterpriseOverview",
        [UserRole.ASSET_MANAGER]: "KPIWidgets",
        [UserRole.DEPT_MANAGER]: "PersonalOverview",
        [UserRole.AUDITOR]: "ActivitySummary",
        [UserRole.EMPLOYEE]: "PersonalOverview"
      },
      subModules: [
        { id: "EnterpriseOverview", name: "Enterprise Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Overview of enterprise assets, maintenance, and status metrics." },
        { id: "PersonalOverview", name: "Personal Overview", icon: <UserCheck2 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Your personal EAM activity, assignments, and quick actions." },
        { id: "ActivitySummary", name: "Activity Summary", icon: <Activity className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Log of recent system notifications and audit activity." },
        { id: "KPIWidgets", name: "KPI Widgets", icon: <BarChart3 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Live performance indicator widgets showing status distributions." }
      ]
    },
    {
      id: "Assets",
      name: "Assets",
      icon: <Package className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE],
      defaultSubModule: {
        [UserRole.ADMIN]: "Overview",
        [UserRole.ASSET_MANAGER]: "AssetRegistry",
        [UserRole.DEPT_MANAGER]: "AssetRegistry",
        [UserRole.AUDITOR]: "AssetRegistry",
        [UserRole.EMPLOYEE]: "AssetAssignments"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Workspace directory map." },
        { id: "AssetPortfolio", name: "Asset Portfolio", icon: <Building className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Interactive building floor plans and spatial asset layout maps." },
        { id: "AssetRegistry", name: "Asset Registry", icon: <FileBadge className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Centralized list of all company assets with advanced filters." },
        { id: "InfrastructureLists", name: "Infrastructure Lists", icon: <Building2 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER], description: "List of departments and locations details." },
        { id: "AssetCategories", name: "Asset Categories", icon: <FolderTree className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER], description: "Add or modify asset classification types." },
        { id: "AssetAssignments", name: "Asset Assignments", icon: <UserCheck2 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Manage direct physical asset allocations and user associations." }
      ]
    },
    {
      id: "Clients",
      name: "Clients",
      icon: <Building2 className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR],
      defaultSubModule: {
        [UserRole.ADMIN]: "ClientDashboard",
        [UserRole.ASSET_MANAGER]: "ClientPortfolio",
        [UserRole.AUDITOR]: "ClientReports"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR], description: "Client workspace directory map." },
        { id: "ClientDashboard", name: "Client Dashboard", icon: <BarChart3 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR], description: "Client KPIs, value, activity, and oversight charts." },
        { id: "ClientProfiles", name: "Client Profiles", icon: <Users className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR], description: "Client information, contacts, registration, and activity history." },
        { id: "ClientPortfolio", name: "Client Asset Portfolio", icon: <Package className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR], description: "Assets by client, category, location, status, and value." },
        { id: "ClientReports", name: "Client Reports", icon: <FileText className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR], description: "Export client registers, valuation, maintenance, transfer, verification, and disposal reports." }
      ]
    },
    {
      id: "Operations",
      name: "Operations",
      icon: <RefreshCcw className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE],
      defaultSubModule: {
        [UserRole.ADMIN]: "Overview",
        [UserRole.ASSET_MANAGER]: "Maintenance",
        [UserRole.DEPT_MANAGER]: "Transfers",
        [UserRole.AUDITOR]: "Verification",
        [UserRole.EMPLOYEE]: "HandoverCheckouts"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Workspace directory map." },
        { id: "HandoverCheckouts", name: "Handover Checkouts", icon: <UserCheck2 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Register asset checkouts, handovers, and returns." },
        { id: "Transfers", name: "Asset Transfers", icon: <MoveHorizontal className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR], description: "Authorize movement and relocation of assets across departments." },
        { id: "Maintenance", name: "Repairs & Maintenance", icon: <Wrench className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE], description: "Report asset defects, schedule cleanings, and log repair costs." },
        { id: "Verification", name: "Physical Verification", icon: <ClipboardList className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.AUDITOR, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER], description: "Reconcile, verify status, and audit physical presence of items." },
        { id: "Disposal", name: "Disposal & Retirement", icon: <ArchiveRestore className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER], description: "Retire or dispose of depreciated/damaged assets." }
      ]
    },
    {
      id: "Reports",
      name: "Reports",
      icon: <TrendingUp className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR],
      defaultSubModule: {
        [UserRole.ADMIN]: "ReportCenter",
        [UserRole.ASSET_MANAGER]: "AssetAnalytics",
        [UserRole.DEPT_MANAGER]: "UtilizationReports",
        [UserRole.AUDITOR]: "VerificationReports"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR], description: "Workspace directory map." },
        { id: "ReportCenter", name: "Report Center", icon: <FileText className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR], description: "Export standard asset details and lists as PDF/Excel/CSV." },
        { id: "AssetAnalytics", name: "Asset Analytics", icon: <BarChart3 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR], description: "Charts displaying asset valuations and category configurations." },
        { id: "UtilizationReports", name: "Utilization Reports", icon: <TrendingUp className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR], description: "Examine allocation metrics and active utilization stats." },
        { id: "VerificationReports", name: "Verification Reports", icon: <ClipboardList className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR], description: "Integrity audits showing verification rate and missing items." },
        { id: "AuditReports", name: "Audit Reports", icon: <Activity className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.AUDITOR], description: "Administrative system logs tracking all data writes." }
      ]
    },
    {
      id: "UsersSecurity",
      name: "Users & Security",
      icon: <ShieldCheck className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.AUDITOR],
      defaultSubModule: {
        [UserRole.ADMIN]: "UserAccounts",
        [UserRole.AUDITOR]: "SecurityAuditLogs"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Workspace directory map." },
        { id: "MyAccount", name: "My Account", icon: <UserCheck2 className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Edit your name, bio, and communication preferences." },
        { id: "UserAccounts", name: "User Accounts", icon: <Users className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Provision and manage system user profile credentials." },
        { id: "RolesPermissions", name: "Roles & Permissions", icon: <Lock className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Manage global user role permission schemes." },
        { id: "SecurityAuditLogs", name: "Security Audit Logs", icon: <Activity className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.AUDITOR], description: "Track login audits, credential rotations, and access logs." },
        { id: "SessionManagement", name: "Session Management", icon: <ShieldCheck className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Monitor active login terminals and kill remote sessions." }
      ]
    },
    {
      id: "Administration",
      name: "Administration",
      icon: <Building2 className="w-5 h-5" />,
      roles: [UserRole.ADMIN],
      defaultSubModule: {
        [UserRole.ADMIN]: "Departments"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Workspace directory map." },
        { id: "Departments", name: "Departments", icon: <Building2 className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Manage corporate divisions and department profiles." },
        { id: "Locations", name: "Locations", icon: <Building className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Configure physical sites, rooms, and office buildings." },
        { id: "Categories", name: "Categories", icon: <FolderTree className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Manage asset types and classification categories." },
        { id: "ReminderEngine", name: "Reminder Engine", icon: <Bell className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Create automated obligations, renewals, payments, and task reminders." },
        { id: "SystemConfigurations", name: "System Configurations", icon: <Settings className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Global settings for organization name and branding." }
      ]
    },
    {
      id: "Settings",
      name: "Settings",
      icon: <Settings className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE],
      defaultSubModule: {
        [UserRole.ADMIN]: "OrganizationProfile",
        [UserRole.ASSET_MANAGER]: "ThemeManagement",
        [UserRole.DEPT_MANAGER]: "ThemeManagement",
        [UserRole.AUDITOR]: "ThemeManagement",
        [UserRole.EMPLOYEE]: "ThemeManagement"
      },
      subModules: [
        { id: "Overview", name: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Workspace directory map." },
        { id: "OrganizationProfile", name: "Organization Profile", icon: <Settings className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Configure system name and corporate identity." },
        { id: "CompanyLogo", name: "Company Logo", icon: <Building2 className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Update portal initials and logo banner text." },
        { id: "ThemeManagement", name: "Theme Management", icon: <Settings className="w-4 h-4" />, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE], description: "Manage personal theme style settings and visual color accents." },
        { id: "CurrencySettings", name: "Currency Settings", icon: <BarChart3 className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Set native currency configurations and symbols." },
        { id: "TimezoneSettings", name: "Timezone Settings", icon: <Activity className="w-4 h-4" />, roles: [UserRole.ADMIN], description: "Adjust system times to target timezone location." },
        { id: "NotificationSettings", name: "Notification Settings", icon: <Bell className="w-3.5 h-3.5" />, roles: [UserRole.ADMIN], description: "Configure notification dispatch settings." }
      ]
    }
  ], []);

  const permittedWorkspaces = useMemo(() => {
    if (!currentUser) return [];
    return workspaces
      .filter(ws => ws.roles.includes(currentUser.role))
      .map(ws => ({
        ...ws,
        subModules: ws.subModules.filter(sm => sm.roles.includes(currentUser.role))
      }))
      .filter(ws => ws.subModules.length > 0);
  }, [currentUser, workspaces]);

  const getDefaultSubModule = (ws: Workspace) => {
    if (!currentUser) return ws.subModules[0]?.id || "Overview";
    const roleDefault = ws.defaultSubModule[currentUser.role];
    if (roleDefault && ws.subModules.some(sm => sm.id === roleDefault && sm.roles.includes(currentUser.role))) {
      return roleDefault;
    }
    return ws.subModules.find(sm => sm.id !== "Overview" && sm.roles.includes(currentUser.role))?.id ||
      ws.subModules.find(sm => sm.roles.includes(currentUser.role))?.id ||
      "Overview";
  };

  const getActiveSubModule = (ws: { id: Tab; subModules: { id: string }[] }) => {
    const selected = activeSubTabs[ws.id];
    if (selected && ws.subModules.some(sm => sm.id === selected)) {
      return selected;
    }
    return getDefaultSubModule(ws as Workspace);
  };

  const canOpenWorkspace = (tab: Tab, subTab?: string) => {
    if (tab === "Profile") return true;
    const ws = permittedWorkspaces.find(item => item.id === tab);
    if (!ws) return false;
    if (!subTab) return true;
    return ws.subModules.some(sm => sm.id === subTab);
  };

  const openWorkspace = (tab: Tab, subTab?: string) => {
    if (!canOpenWorkspace(tab, subTab)) return;
    const ws = permittedWorkspaces.find(item => item.id === tab);
    switchWorkspace(tab, subTab || (ws ? getDefaultSubModule(ws) : undefined));
  };

  // Flat list for keyboard shortcuts and permission checks (backward-compat)
  const tabsList = useMemo(() => {
    return permittedWorkspaces.flatMap(w => w.subModules.map(sm => ({ tab: w.id, name: sm.name, roles: sm.roles })));
  }, [permittedWorkspaces]);

  const activeBreadcrumb = useMemo(() => {
    if (activeTab === "Profile") {
      return { group: "User Hub", item: "My Account" };
    }
    const ws = permittedWorkspaces.find(w => w.id === activeTab);
    if (ws) {
      const activeSub = getActiveSubModule(ws);
      const sm = ws.subModules.find(m => m.id === activeSub);
      return { group: ws.name, item: sm ? sm.name : "Overview" };
    }
    return { group: db.settings.logo || "CA", item: activeTab };
  }, [activeTab, permittedWorkspaces, activeSubTabs, db.settings.logo]);

  // Keyboard Shortcuts Hook (Registered here safely after tabsList has been resolved)
  React.useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for modifier keys
      const isMod = e.ctrlKey || e.metaKey;

      // Handle Shift + ? trigger
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
        return;
      }

      // Escape key to close search, panels, or shortcuts help
      if (e.key === "Escape") {
        setIsGlobalSearchResultsOpen(false);
        setIsNotifOpen(false);
        setIsShortcutsHelpOpen(false);
        const searchInput = document.getElementById("global-asset-search");
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
        }
        return;
      }

      if (isMod) {
        let matchedTab: Tab | null = null;
        
        switch (e.key.toLowerCase()) {
          case "k":
            e.preventDefault();
            const searchInput = document.getElementById("global-asset-search");
            if (searchInput) {
              searchInput.focus();
              setIsGlobalSearchResultsOpen(true);
            }
            break;
          case "d":
            matchedTab = "Dashboard";
            break;
          case "a":
            matchedTab = "Assets";
            break;
          case "m":
            e.preventDefault();
            openWorkspace("Operations", "Maintenance");
            break;
          case "i":
            e.preventDefault();
            openWorkspace("Operations", "Verification");
            break;
          case "o":
            matchedTab = "Operations";
            break;
          case "p":
            matchedTab = "Profile";
            break;
          case "s":
            if (!["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
              matchedTab = "Settings";
            }
            break;
          case "u":
            e.preventDefault();
            openWorkspace("UsersSecurity", "UserAccounts");
            break;
          case "l":
            e.preventDefault();
            openWorkspace("UsersSecurity", "SecurityAuditLogs");
            break;
          case "t":
            e.preventDefault();
            const currentOffline = isOffline();
            setOfflineMode(!currentOffline);
            break;
          default:
            break;
        }

        if (matchedTab) {
          e.preventDefault();
          openWorkspace(matchedTab as Tab);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentUser, tabsList, permittedWorkspaces]);

  const allNotifications = useMemo(() => {
    if (!currentUser) return [];
    return db.notifications.filter(n => n.userId === "all" || n.userId === currentUser.id);
  }, [db.notifications, currentUser]);

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(n => {
      if (notifFilter === "unread") return !n.isRead;
      if (notifFilter === "warning") return n.type === "warning" || n.type === "error";
      if (notifFilter === "reminder") return Boolean(n.reminderId) || n.title.toLowerCase().includes("due") || n.title.toLowerCase().includes("overdue");
      if (notifFilter === "assignment") {
        const titleL = n.title.toLowerCase();
        const msgL = n.message.toLowerCase();
        return titleL.includes("assign") || msgL.includes("assign") || titleL.includes("transfer") || msgL.includes("transfer");
      }
      if (notifFilter === "security") {
        const titleL = n.title.toLowerCase();
        const msgL = n.message.toLowerCase();
        return titleL.includes("security") || msgL.includes("security") || titleL.includes("password") || msgL.includes("password") || titleL.includes("credential") || msgL.includes("credential");
      }
      if (notifFilter === "system") {
        return n.type === "info" || n.type === "success";
      }
      return true; // "all"
    });
  }, [allNotifications, notifFilter]);

  const activeNotifications = useMemo(() => {
    return allNotifications.filter(n => !n.isRead);
  }, [allNotifications]);

  const handleDismissNotification = (notifId: string) => {
    const currentDB = getDatabaseState();
    const idx = currentDB.notifications.findIndex(n => n.id === notifId);
    if (idx !== -1) {
      currentDB.notifications[idx].isRead = true;
      currentDB.notifications[idx].readAt = new Date().toISOString();
      currentDB.auditLogs.unshift({
        id: `log-notification-read-${Date.now()}`,
        userId: currentUser?.id || "System",
        userName: currentUser?.name || "System",
        action: "Notification Read",
        details: `Notification '${currentDB.notifications[idx].title}' marked as read.`,
        timestamp: new Date().toISOString(),
        ipAddress: "client-unavailable"
      });
      saveDatabaseState(currentDB);
      refreshDatabase();
    }
  };

  const handleDeleteNotification = (notifId: string) => {
    const currentDB = getDatabaseState();
    currentDB.notifications = currentDB.notifications.filter(n => n.id !== notifId);
    saveDatabaseState(currentDB);
    refreshDatabase();
  };

  const handleMarkAllNotificationsRead = () => {
    const currentDB = getDatabaseState();
    currentDB.notifications.forEach(n => {
      if (n.userId === "all" || n.userId === currentUser?.id) {
        n.isRead = true;
        n.readAt = n.readAt || new Date().toISOString();
      }
    });
    currentDB.auditLogs.unshift({
      id: `log-notification-read-all-${Date.now()}`,
      userId: currentUser?.id || "System",
      userName: currentUser?.name || "System",
      action: "Notification Read",
      details: "All visible notifications marked as read.",
      timestamp: new Date().toISOString(),
      ipAddress: "client-unavailable"
    });
    saveDatabaseState(currentDB);
    refreshDatabase();
  };

  const handleSnoozeNotificationReminder = (reminderId: string, days: number) => {
    if (!currentUser) return;
    snoozeReminder(reminderId, days, currentUser.id, currentUser.name);
    refreshDatabase();
  };

  const handleCompleteNotificationReminder = (reminderId: string) => {
    if (!currentUser) return;
    completeReminder(reminderId, currentUser.id, currentUser.name);
    refreshDatabase();
  };

  // Safe check if logged out, display portal arena
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        {isChangingPassword ? (
          /* MANDATORY ONBOARDING WIZARD SCREEN */
          <div className="bg-[#121214] rounded-2xl max-w-md w-full border border-[#27272a] shadow-2xl p-8 space-y-6 text-xs text-white">
            <div className="space-y-1 text-center">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mx-auto shadow-md">
                G
              </div>
              <h2 className="text-sm font-bold tracking-tight uppercase mt-2">
                Corporate Verification Advisor
              </h2>
              <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 mt-2">
                <span className="text-zinc-400 font-bold uppercase text-[9.5px]">AUTHENTICATION SETUP</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                  Step {onboardStep} of 2
                </span>
              </div>
            </div>

            {onboardStep === 1 ? (
              <form onSubmit={handleOnboardStep1} className="space-y-4">
                <div className="space-y-1">
                  <span className="font-bold text-zinc-300">Set New Security Password *</span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters, with capital, digit, symbol"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-zinc-650"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-zinc-300">Confirm Password Match *</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm secure password"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-zinc-650"
                  />
                </div>

                {/* Secure Password Policy checklist strictly enforced */}
                <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 border-zinc-800 space-y-2.5 text-zinc-400 leading-relaxed">
                  <span className="font-bold block text-zinc-300 text-[10px] uppercase font-mono tracking-wider">
                    Required Security Constraints:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[10px]">
                    <li>Minimum complexity of at least 8 alphanumeric characters.</li>
                    <li>At least one capital uppercase letter & one lowercase letter.</li>
                    <li>At least one numeric digit [0-9] and one special character (e.g. @$!%*?&).</li>
                  </ul>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-850 border-zinc-800">
                    <input
                      type="checkbox"
                      id="policy-chk"
                      required
                      checked={policyAccepted}
                      onChange={(e) => setPolicyAccepted(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-800 rounded cursor-pointer focus:ring-0"
                    />
                    <label htmlFor="policy-chk" className="font-bold text-zinc-300 cursor-pointer text-[10px] select-none leading-tight">
                      I understand and accept the Corporate Security Password Policy *
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md transition-colors text-xs"
                >
                  Proceed to Onboarding Profile Details
                </button>
              </form>
            ) : (
              <form onSubmit={handleOnboardStep2} className="space-y-4">
                <div className="space-y-1">
                  <span className="font-bold text-zinc-300">Change Full Name Details *</span>
                  <input
                    type="text"
                    required
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    placeholder="e.g. George Mtambe"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-white font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-zinc-300">Set Technical / Office Phone</span>
                  <input
                    type="text"
                    value={onboardPhone}
                    onChange={(e) => setOnboardPhone(e.target.value)}
                    placeholder="e.g. +254 700 111 222"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-zinc-300">Short Operational Assignment Bio</span>
                  <textarea
                    value={onboardBio}
                    onChange={(e) => setOnboardBio(e.target.value)}
                    placeholder="Brief description of your function/department responsibilities"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-lg text-white focus:outline-none h-16 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-zinc-300">Set Profile Picture (Avatar Upload)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOnboardAvatarUpload}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded-lg text-zinc-400 focus:outline-none cursor-pointer"
                  />
                  {onboardAvatar && (
                    <div className="flex items-center gap-2 pt-1 bg-[#10b981]/5 px-3 py-2 rounded-lg border border-emerald-950/20">
                      <img src={onboardAvatar} className="w-10 h-10 rounded-full object-cover border border-zinc-700 bg-slate-805" alt="Preview" />
                      <span className="text-emerald-400 font-bold">✓ Profile avatar loaded.</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md transition-colors"
                >
                  Confirm & Finalize Node Onboarding
                </button>
              </form>
            )}
          </div>
        ) : loginMode === "forgot" ? (
          /* FORGOT PASSWORD RESET MECHANISM Form */
          <div className="bg-[#121214] rounded-2xl max-w-sm w-full border border-[#27272a] shadow-2xl p-8 space-y-6 text-xs text-white">
            <div className="space-y-1 text-center">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mx-auto shadow-md">
                F
              </div>
              <h2 className="text-sm font-bold tracking-tight uppercase mt-2">
                Security Recovery Hub
              </h2>
              <p className="text-zinc-500 uppercase font-bold tracking-wider font-mono text-[9px]">
                Fixed Asset Recovery Service
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {forgotMessage && (
                <div
                  className={`p-3.5 rounded-xl border font-bold font-sans text-[11px] leading-relaxed ${
                    forgotMessage.includes("Error")
                      ? "bg-red-950/40 border-red-900/50 text-red-400"
                      : "bg-emerald-950/40 border-emerald-900/50 text-emerald-400"
                  }`}
                >
                  {forgotMessage}
                </div>
              )}

              <div className="space-y-1">
                <span className="font-bold text-zinc-300">Registered Corporate Email *</span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. admin@faims.local"
                    className="w-full bg-zinc-900 border border-zinc-800 pl-10 pr-3.5 py-2.5 rounded-lg text-white font-medium focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-colors"
              >
                Send Secure Reset Signal
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("login");
                    setForgotMessage("");
                  }}
                  className="text-zinc-400 hover:text-white font-bold underline cursor-pointer"
                >
                  Return to Portal Authenticator
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* MANDATORY LOGIN FORM - NO SEEDED CREDENTIALS DISPLAYED */
          <div className="bg-[#121214] rounded-2xl max-w-sm w-full border border-[#27272a] shadow-2xl overflow-hidden flex flex-col text-xs text-white">
            
            <div className="bg-[#18181b] border-b border-[#27272a] p-8 space-y-3 text-center">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mx-auto shadow-md">
                F
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight uppercase">
                  {db.settings.orgName || "Fixed Asset Management System"}
                </h1>
                <p className="text-[9.5px] text-zinc-500 uppercase font-bold tracking-wider font-mono">
                  Fixed Asset Management System
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="p-8 space-y-5">
              {loginError && (
                <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-400 rounded-lg font-bold">
                  {loginError}
                </div>
              )}

              <div className="space-y-1">
                <span className="font-bold text-zinc-300">Authorized Corporate Email Address *</span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. admin@faims.local"
                    className="w-full bg-zinc-900 border border-zinc-800 pl-10 pr-3.5 py-2.5 rounded-lg text-white font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-zinc-300">Security Password *</span>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Security key"
                    className="w-full bg-zinc-900 border border-zinc-800 pl-10 pr-10 py-2.5 rounded-lg text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me and Forgot Password Container */}
              <div className="flex items-center justify-between text-[11px] pt-1 select-none">
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="remember-me-chk"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-800 rounded cursor-pointer focus:ring-0"
                  />
                  <label htmlFor="remember-me-chk" className="font-semibold text-zinc-400 cursor-pointer hover:text-zinc-300">
                    Remember Me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("forgot");
                    setForgotEmail("");
                    setForgotMessage("");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer transition-colors text-xs"
              >
                Secure Portal Authenticate
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  const isLight = currentPreferences.theme === "light";
  const isCompact = currentPreferences.sidebarStyle === "compact";
  const fontSizeClass = 
    currentPreferences.fontSize === "sm" ? "text-[12px] md:text-[12px]" :
    currentPreferences.fontSize === "lg" ? "text-[14px] md:text-[15px]" :
    "text-[13px] md:text-[13px]";

  // Define dynamic colors based on preferences and theme state
  const appBg = isLight ? "bg-[#f8fafc] text-slate-800" : "bg-[#09090b] text-[#fafafa]";
  const headerBg = isLight ? "bg-white border-b border-slate-200" : "bg-[#09090b]/80 border-b border-[#27272a] backdrop-blur-md";
  const asideBg = isCompact 
    ? (isLight ? "bg-white border-r border-slate-200" : "bg-[#121214] border-r border-[#27272a]") 
    : (currentPreferences.sidebarStyle === "light" ? "bg-white border-r border-slate-200" : "bg-[#121214] border-r border-[#27272a]");
  const sidebarTextColor = (isLight || currentPreferences.sidebarStyle === "light") ? "text-slate-600" : "text-zinc-400";
  const sidebarHeaderBorder = (isLight || currentPreferences.sidebarStyle === "light") ? "border-b border-slate-200" : "border-b border-[#27272a]";

  // Accent mapping
  const accentColorId = currentPreferences.accentColor || "blue";
  
  // Tab highlight active class mapping
  const activeTabClass = 
    accentColorId === "emerald" ? "bg-emerald-600/10 text-emerald-600 font-semibold" :
    accentColorId === "rose" ? "bg-rose-600/10 text-rose-600 font-semibold" :
    accentColorId === "amber" ? "bg-amber-600/10 text-amber-600 font-semibold" :
    accentColorId === "violet" ? "bg-violet-600/10 text-violet-600 font-semibold" :
    accentColorId === "indigo" ? "bg-indigo-600/10 text-indigo-600 font-semibold" :
    "bg-blue-600/10 text-blue-500 font-semibold";

  const bannerDotClass = 
    accentColorId === "emerald" ? "bg-emerald-600" :
    accentColorId === "rose" ? "bg-rose-600" :
    accentColorId === "amber" ? "bg-amber-600" :
    accentColorId === "violet" ? "bg-violet-600" :
    accentColorId === "indigo" ? "bg-indigo-600" :
    "bg-blue-600";

  // Reusable sidebar content builder
  const renderSidebarContent = (onItemClick?: () => void) => {
    const sidebarIsLight = isLight || currentPreferences.sidebarStyle === "light";
    return (
      <>
        <div className="space-y-5 flex-1 overflow-y-auto">
          {/* Brand header */}
          <div className={`flex items-center ${isCompact ? "justify-center" : "gap-3"} px-2 pb-5 border-b ${sidebarIsLight ? "border-slate-200" : "border-[#27272a]"}`}>
            <div className={`w-8 h-8 ${bannerDotClass} rounded-lg flex items-center justify-center font-bold text-white font-display text-sm uppercase shadow-md shrink-0`}>
              F
            </div>
            {!isCompact && (
              <div className="min-w-0">
                <h2 className={`text-sm font-bold tracking-tight uppercase ${sidebarIsLight ? "text-slate-900" : "text-white"}`}>
                  {db.settings.logo || "CA"}
                </h2>
                <span className="text-[10px] text-zinc-500 font-medium mt-0.5 block truncate max-w-[140px]">
                  {db.settings.orgName || "Fixed Asset Management System"}
                </span>
              </div>
            )}
          </div>

          {/* FLAT WORKSPACE NAV — no expandable items */}
          <nav className="space-y-0.5 text-xs font-medium">
            {permittedWorkspaces.map(ws => {
              const isActive = activeTab === ws.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => { openWorkspace(ws.id); onItemClick?.(); }}
                  className={`w-full flex items-center ${
                    isCompact ? "justify-center py-2.5 rounded-lg" : "gap-2.5 px-2.5 py-2 rounded-lg"
                  } cursor-pointer transition-all duration-150 ${
                    isActive
                      ? activeTabClass + " shadow-sm"
                      : sidebarIsLight
                        ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-100"
                  }`}
                  title={isCompact ? ws.name : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={`shrink-0 ${
                    isActive ? "" : sidebarIsLight ? "text-slate-400" : "text-zinc-500"
                  }`}>{ws.icon}</span>
                  {!isCompact && <span className="truncate text-[12px] font-semibold">{ws.name}</span>}
                  {!isCompact && isActive && (
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${
                      accentColorId === "emerald" ? "bg-emerald-500" :
                      accentColorId === "rose" ? "bg-rose-500" :
                      accentColorId === "amber" ? "bg-amber-500" :
                      accentColorId === "violet" ? "bg-violet-500" :
                      accentColorId === "indigo" ? "bg-indigo-500" :
                      "bg-blue-500"
                    }`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User panel */}
        <div className={`pt-4 border-t ${sidebarIsLight ? "border-slate-200" : "border-[#27272a]"} space-y-3 px-2 text-xs shrink-0`}>
          <button
            onClick={() => { setActiveTab("Profile"); onItemClick?.(); }}
            className={`w-full flex items-center ${isCompact ? "justify-center" : "gap-2.5"} text-left hover:opacity-85 transition-opacity`}
            title="Edit profile"
          >
            <div className={`w-8 h-8 rounded-full ${sidebarIsLight ? "bg-slate-200 text-slate-800 border-slate-300" : "bg-zinc-800 text-white border-zinc-700"} flex items-center justify-center border overflow-hidden text-xs font-bold uppercase font-mono shrink-0`}>
              {currentUser.avatar
                ? <img src={currentUser.avatar} className="w-full h-full object-cover" alt="Avatar" />
                : currentUser.name[0]}
            </div>
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold truncate text-[11.5px] leading-tight ${sidebarIsLight ? "text-slate-900" : "text-white"}`}>{currentUser.name}</h4>
                <span className="text-[10px] text-zinc-500 font-semibold tracking-wider font-mono uppercase block mt-0.5 truncate">{currentUser.role}</span>
              </div>
            )}
          </button>
          <button
            onClick={handleLogOut}
            className={`w-full py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors text-xs ${
              sidebarIsLight
                ? "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700"
                : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            {!isCompact && <span>Sign Out</span>}
          </button>
        </div>
      </>
    );
  };

  // Renders the page-owned launcher cards for a given workspace
  const renderWorkspaceLauncher = (ws: { id: Tab; name: string; icon: React.ReactNode; subModules: { id: string; name: string; icon: React.ReactNode; description: string; roles: UserRole[] }[] }, compact = false) => {
    const permitted = ws.subModules.filter(sm => sm.id !== "Overview" && currentUser && sm.roles.includes(currentUser.role));
    const active = permitted.some(sm => sm.id === activeSubTabs[ws.id])
      ? activeSubTabs[ws.id]
      : permitted[0]?.id || "Overview";
    return (
      <section className={`erp-panel mb-5 ${compact ? "py-4" : ""}`}>
        <div className="erp-panel-header">
          <div>
            <h2>{ws.name} Workspace</h2>
            <p>{currentUser.role} workspace functions. Unauthorized modules are hidden from this page.</p>
          </div>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-950/30 text-blue-300"}`}>
            {ws.icon}
          </span>
        </div>
        <div className="erp-quick-actions">
          {permitted.map(sm => (
            <button
              key={sm.id}
              type="button"
              onClick={() => setActiveSubTabs(prev => ({ ...prev, [ws.id]: sm.id }))}
              className={`erp-action-tile ${
                active === sm.id ? "ring-2 ring-blue-500/30 bg-blue-600/5" : ""
              }`}
            >
              <span>{sm.icon}</span>
              <div>
                <strong>{sm.name}</strong>
                <small>{sm.description}</small>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className={`min-h-screen ${appBg} flex flex-col md:flex-row font-sans selection:bg-indigo-600/20 antialiased ${fontSizeClass}`}>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobileNavOpen && (
        <div className="eam-mobile-overlay md:hidden" onClick={() => setIsMobileNavOpen(false)} />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <div className={`eam-mobile-drawer md:hidden flex flex-col py-6 px-4 ${isMobileNavOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 ${bannerDotClass} rounded-lg flex items-center justify-center font-bold text-white text-xs`}>F</div>
            <span className="text-sm font-bold text-white uppercase tracking-tight">{db.settings.logo || "CA"}</span>
          </div>
          <button onClick={() => setIsMobileNavOpen(false)} className="text-zinc-400 hover:text-white p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {renderSidebarContent(() => setIsMobileNavOpen(false))}
      </div>

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className={`hidden md:flex ${isCompact ? "md:w-20" : "md:w-64"} ${asideBg} ${sidebarTextColor} md:min-h-screen flex-col justify-between py-6 px-4 shrink-0 transition-all duration-200`}>
        {renderSidebarContent()}
      </aside>

      {/* CORE PORTAL DESPATCH AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* ENTERPRISE TOP HEADER */}
        <header className={`h-14 flex items-center justify-between px-4 md:px-6 z-10 shrink-0 ${headerBg}`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs font-medium min-w-0" aria-label="Breadcrumb">
              <span className={`shrink-0 hidden sm:block ${isLight ? "text-slate-400" : "text-zinc-600"}`}>{db.settings.logo || "CA"}</span>
              <span className={`shrink-0 hidden sm:block ${isLight ? "text-slate-300" : "text-zinc-700"}`}>/</span>
              <span className={`shrink-0 ${isLight ? "text-slate-500" : "text-zinc-400"}`}>{activeBreadcrumb.group}</span>
              <span className={`shrink-0 ${isLight ? "text-slate-300" : "text-zinc-700"}`}>/</span>
              <span className={`font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>{activeBreadcrumb.item}</span>
            </nav>
          </div>

          {/* GLOBAL PERSISTENT SEARCH BAR */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-[12rem] sm:max-w-[16rem] md:max-w-xs lg:max-w-md mx-4 select-none">
            <div className={`relative flex items-center rounded-lg border text-xs transition-all duration-150 ${
              isLight 
                ? "bg-slate-55 border-slate-200 text-slate-800 focus-within:border-slate-300 bg-slate-50 focus-within:bg-white" 
                : "bg-zinc-900 border-zinc-805 border-zinc-800 text-zinc-100 focus-within:border-zinc-700 focus-within:bg-zinc-950"
            }`}>
              <Search className="w-4 h-4 text-zinc-500 ml-3 shrink-0" />
              <input
                id="global-asset-search"
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsGlobalSearchResultsOpen(true);
                }}
                onFocus={() => setIsGlobalSearchResultsOpen(true)}
                placeholder="Search assets by tag, name, or serial number..."
                className="w-full bg-transparent px-2.5 py-1.5 focus:outline-none placeholder-zinc-500 text-xs"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch("");
                    setIsGlobalSearchResultsOpen(false);
                  }}
                  className="p-1 px-2 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* RESULTS FLYOVER PANEL */}
            {isGlobalSearchResultsOpen && globalSearch.trim().length > 0 && (
              <div className={`absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl border shadow-2xl z-50 text-xs divide-y ${
                isLight 
                  ? "bg-white border-slate-200 divide-slate-100 text-slate-700 shadow-slate-200/50" 
                  : "bg-[#121214] border-[#27272a] divide-[#27272a] text-zinc-300 shadow-black/80"
              }`}>
                {globalSearchResults.length === 0 ? (
                  <p className="p-4 text-center text-zinc-500 italic">No matching asset records found.</p>
                ) : (
                  globalSearchResults.map(asset => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setAuditAssetIdRedirect(asset.id);
                        openWorkspace("Assets", "AssetRegistry");
                        setGlobalSearch("");
                        setIsGlobalSearchResultsOpen(false);
                      }}
                      className={`w-full text-left p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isLight ? "hover:bg-slate-50" : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            accentColorId === "emerald" ? "bg-emerald-600/10 text-emerald-500" :
                            accentColorId === "rose" ? "bg-rose-600/10 text-rose-500" :
                            accentColorId === "amber" ? "bg-amber-600/10 text-amber-500" :
                            accentColorId === "violet" ? "bg-violet-600/10 text-violet-500" :
                            accentColorId === "indigo" ? "bg-indigo-600/10 text-indigo-500" :
                            "bg-blue-600/10 text-blue-500"
                          }`}>
                            {asset.assetTag}
                          </span>
                          <span className="font-semibold text-[11.5px] truncate max-w-[140px] sm:max-w-[180px]">{asset.name}</span>
                        </div>
                        {asset.serialNumber && (
                          <div className="text-[10px] text-zinc-500 font-mono">S/N: {asset.serialNumber}</div>
                        )}
                      </div>
                      <div className="flex md:flex-col items-start md:items-end text-[10px] font-mono leading-tight shrink-0 gap-1.5 md:gap-0.5">
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          asset.status === "Active" ? "bg-emerald-500/10 text-emerald-500 font-bold" :
                          asset.status === "Under Maintenance" ? "bg-amber-500/10 text-amber-500 font-bold" :
                          asset.status === "Damaged" ? "bg-red-500/10 text-red-500 font-bold" :
                          "bg-zinc-500/10 text-zinc-500 font-bold"
                        }`}>
                          {asset.status}
                        </span>
                        <span className="text-zinc-500 font-medium">Cond: {asset.condition}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right side alert notifications */}
          <div className="flex items-center gap-4">
            {/* Offline mode switcher & sync pending badge */}
            <div className="flex items-center gap-2">
              <button
                id="btn-connection-toggle"
                onClick={handleConnectionToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                  offline
                    ? "bg-amber-500/10 border-amber-500/35 text-amber-500"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                }`}
                title={offline ? "Offline Mode. Click to switch ONLINE." : "Active Online Connection. Click to go OFFLINE."}
              >
                {offline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Offline Mode</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-450 animate-pulse" />
                    <span>Online Sync Ready</span>
                  </>
                )}
              </button>

              {bufferCount > 0 && (
                <button
                  id="btn-manual-sync"
                  onClick={handleManualSync}
                  disabled={offline || isSyncing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                    offline
                      ? "bg-zinc-800/30 border-zinc-700/40 text-zinc-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm"
                  }`}
                  title={offline ? "Must go Online to trigger central DB Sync" : "Sync operations waiting. Click to finalize!"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>Sync Pending ({bufferCount})</span>
                </button>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer relative ${
                  isLight 
                    ? "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200" 
                    : "text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800"
                }`}
              >
                <Bell className="w-4 h-4" />
                {activeNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-[#09090b] text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                    {activeNotifications.length}
                  </span>
                )}
              </button>

              {/* Dismissible Alerts Drawer drop List (Interactive Category filter) */}
              {isNotifOpen && (
                <div className={`absolute right-0 mt-2.5 w-80 rounded-xl border shadow-2xl overflow-hidden z-50 text-xs text-white ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-[#121214] border-[#27272a]"
                }`}>
                  <div className={`p-3.5 text-white border-b font-bold flex justify-between items-center ${
                    isLight ? "bg-slate-800 border-slate-700" : "bg-[#18181b] border-[#27272a]"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-zinc-400" />
                      <span>Notifications Center</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleMarkAllNotificationsRead} 
                        className="text-[10px] text-zinc-350 hover:text-white font-semibold underline cursor-pointer"
                        title="Mark all as read"
                      >
                        Read All
                      </button>
                      <button onClick={() => setIsNotifOpen(false)} className="text-zinc-350 hover:text-white cursor-pointer">
                        <X className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Categories Tab Picker */}
                  <div className={`flex p-1 gap-1 text-[9px] font-mono font-bold uppercase overflow-x-auto select-none border-b ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-[#161619] border-[#27272a]"
                  }`}>
                    {["all", "unread", "reminder", "warning", "assignment", "security", "system"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setNotifFilter(cat as any)}
                        className={`flex-1 py-1 rounded text-center whitespace-nowrap px-1.5 transition-colors cursor-pointer ${
                          notifFilter === cat 
                            ? (isLight ? "bg-slate-300 text-slate-900 font-bold" : "bg-zinc-800 text-white font-bold") 
                            : (isLight ? "text-slate-500 hover:bg-slate-200" : "text-zinc-500 hover:text-zinc-350")
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* List display with Delete features */}
                  <div className={`divide-y max-h-72 overflow-y-auto ${
                    isLight ? "divide-slate-200 bg-white" : "divide-[#27272a] bg-[#121214]"
                  }`}>
                    {filteredNotifications.length === 0 ? (
                      <p className={`italic text-center py-8 text-[11px] font-medium ${isLight ? "text-slate-400" : "text-zinc-500"}`}>
                        {allNotifications.length === 0 ? "No notifications available." : "No matching notifications"}
                      </p>
                    ) : (
                      filteredNotifications.map(item => (
                        <div 
                          key={item.id} 
                          className={`p-3.5 transition-all relative group flex flex-col gap-1 ${
                            !item.isRead 
                              ? (isLight ? "bg-slate-50" : "bg-[#1d1d23]/20") 
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 pr-4">
                            <h4 className={`font-bold text-[11.5px] leading-snug ${
                              isLight 
                                ? (!item.isRead ? "text-slate-950 font-extrabold" : "text-slate-500") 
                                : (!item.isRead ? "text-white" : "text-zinc-400")
                            }`}>
                              {item.title}
                            </h4>
                            <span className={`text-[8px] font-mono self-start whitespace-nowrap px-1 py-0.5 rounded uppercase font-bold border ${
                              item.type === "warning" || item.type === "error"
                                ? "bg-red-950/20 text-red-500 border-red-900/30"
                                : (isLight ? "bg-slate-100 text-slate-600 border-slate-200 shrink-0" : "bg-zinc-950 text-zinc-400 border-zinc-800 shrink-0")
                            }`}>
                              {item.type}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-relaxed select-text ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                            {item.message}
                          </p>
                          <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block font-medium">
                            {formatDate(item.createdAt)} {item.status ? `- ${item.status}` : ""}
                          </span>
                          
                          <div className="flex items-center gap-2 mt-1.5 self-end opacity-90 group-hover:opacity-100 transition-all">
                            {item.reminderId && (
                              <>
                                <button
                                  onClick={() => handleSnoozeNotificationReminder(item.reminderId!, 1)}
                                  className="text-[9.5px] text-amber-500 hover:text-amber-400 font-bold bg-amber-950/10 px-1.5 py-0.5 rounded border border-amber-900/20 cursor-pointer"
                                >
                                  Snooze
                                </button>
                                <button
                                  onClick={() => handleCompleteNotificationReminder(item.reminderId!)}
                                  className="text-[9.5px] text-blue-500 hover:text-blue-400 font-bold bg-blue-950/10 px-1.5 py-0.5 rounded border border-blue-900/20 cursor-pointer"
                                >
                                  Complete
                                </button>
                              </>
                            )}
                            {!item.isRead && (
                              <button
                                onClick={() => handleDismissNotification(item.id)}
                                className="text-[9.5px] text-emerald-500 hover:text-emerald-400 font-bold bg-emerald-950/10 px-1.5 py-0.5 rounded border border-emerald-900/20 cursor-pointer"
                              >
                                Mark Read
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(item.id)}
                              className="text-[9.5px] text-red-500 hover:text-red-400 font-bold bg-red-950/10 px-1.5 py-0.5 rounded border border-red-900/20 cursor-pointer"
                              title="Delete notification permanently"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Theme Switcher button */}
            <button
              type="button"
              onClick={() => {
                const nextTheme = currentPreferences.theme === "light" ? "dark" : currentPreferences.theme === "dark" ? "system" : "light";
                const state = getDatabaseState();
                if (currentUser) {
                  const userIndex = state.users.findIndex((u) => u.id === currentUser.id);
                  if (userIndex !== -1) {
                    state.users[userIndex].preferences = {
                      ...(state.users[userIndex].preferences || {
                        theme: "light",
                        accentColor: "blue",
                        layout: "grid",
                        sidebarStyle: "dark",
                        fontSize: "md",
                        emailNotif: true,
                        desktopNotif: true,
                        assignmentNotif: true
                      }),
                      theme: nextTheme
                    };
                    saveDatabaseState(state);
                    setCurrentUser(state.users[userIndex]);
                  }
                } else {
                  state.settings.systemTheme = nextTheme;
                  saveDatabaseState(state);
                }
                refreshDatabase();
                window.dispatchEvent(new Event("faims_db_synced"));
              }}
              className={`px-2.5 py-2 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isLight 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200" 
                  : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              title={`Aesthetic theme: ${currentPreferences.theme}. Click to cycle.`}
            >
              {currentPreferences.theme === "light" && "☀️ Light"}
              {currentPreferences.theme === "dark" && "🌙 Dark"}
              {currentPreferences.theme === "system" && "💻 System"}
            </button>

            {/* Keyboard Shortcuts Trigger Button */}
            <button
              onClick={() => setIsShortcutsHelpOpen(true)}
              className={`px-2.5 py-2 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                isLight 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200" 
                  : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              title="Keyboard Shortcuts Guide (Press ?)"
            >
              ⌨️ Keyboard Shortcuts
            </button>

            <div className={`p-2 rounded-lg text-[10px] font-mono ${
              isLight 
                ? "bg-slate-100 text-slate-500 border border-slate-200" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-500"
            }`}>
              ASSET_SYS_ONLINE
            </div>
          </div>
        </header>

        {/* ACTIVE SCREEN CONTENT DISPLAY AND SELECTION PANEL */}
        <section className="erp-screen flex-1 p-4 md:p-6 xl:p-8 overflow-y-auto max-w-7xl w-full mx-auto">

          {/* ─── DASHBOARD ─── */}
          {activeTab === "Dashboard" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Dashboard");
            const activeSub = ws ? getActiveSubModule(ws) : "EnterpriseOverview";
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, true)}
                <DashboardComponent
                  userRole={currentUser.role}
                  onNavigate={(tabName) => {
                    // Map old tab names to new workspaces
                    const legacyMap: Record<string, Tab> = {
                      Assets: "Assets", Verification: "Operations",
                      Clients: "Clients",
                      Transfers: "Operations", Maintenance: "Operations",
                      Assignments: "Operations", Reporting: "Reports",
                      BaseModules: "Administration", Users: "UsersSecurity",
                      AuditLogs: "UsersSecurity", Settings: "Settings", Profile: "Profile"
                    };
                    const subMap: Record<string, string> = {
                      Verification: "Verification", Transfers: "Transfers",
                      Maintenance: "Maintenance", Assignments: "HandoverCheckouts",
                      BaseModules: "Departments", Users: "UserAccounts",
                      AuditLogs: "SecurityAuditLogs"
                    };
                    const newTab = legacyMap[tabName] || (tabName as Tab);
                    const newSub = subMap[tabName];
                    openWorkspace(newTab, newSub);
                  }}
                  onSelectAsset={(assetId) => {
                    setAuditAssetIdRedirect(assetId);
                    openWorkspace("Assets", "AssetRegistry");
                  }}
                  subTab={activeSub}
                  currentUser={currentUser}
                  onUpdateCurrentUser={(updated) => {
                    setCurrentUser(updated);
                    const currentDB = getDatabaseState();
                    const idx = currentDB.users.findIndex(u => u.id === updated.id);
                    if (idx !== -1) { currentDB.users[idx] = updated; saveDatabaseState(currentDB); }
                    refreshDatabase();
                  }}
                />
              </>
            );
          })()}

          {/* ─── ASSETS ─── */}
          {activeTab === "Assets" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Assets");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                {(activeSub === "AssetPortfolio" || activeSub === "AssetRegistry") && (
                  <AssetManagement
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                    selectedAssetIdFromDashboard={auditAssetIdRedirect}
                    resetDashboardSelection={() => setAuditAssetIdRedirect(null)}
                    initialViewMode={activeSub === "AssetPortfolio" ? "floorplan" : "list"}
                    onNavigateToMaintenance={() => openWorkspace("Operations", "Maintenance")}
                    onNavigateToVerification={(assetId) => {
                      setAuditAssetIdRedirect(assetId);
                      openWorkspace("Operations", "Verification");
                    }}
                  />
                )}
                {(activeSub === "InfrastructureLists" || activeSub === "AssetCategories") && (
                  <ModulesAdministration
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                    initialTab={activeSub === "InfrastructureLists" ? "Locations" : "Categories"}
                  />
                )}
                {activeSub === "AssetAssignments" && (
                  <AssetAssignmentComponent
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                  />
                )}
              </>
            );
          })()}

          {/* ─── CLIENTS ─── */}
          {activeTab === "Clients" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Clients");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            const clientViewMap: Record<string, "Dashboard" | "Profiles" | "Portfolio" | "Reports"> = {
              Overview: "Dashboard",
              ClientDashboard: "Dashboard",
              ClientProfiles: "Profiles",
              ClientPortfolio: "Portfolio",
              ClientReports: "Reports"
            };
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                <ClientsManagement
                  userRole={currentUser.role}
                  currentUserId={currentUser.id}
                  initialView={clientViewMap[activeSub] || "Dashboard"}
                />
              </>
            );
          })()}

          {/* ─── OPERATIONS ─── */}
          {activeTab === "Operations" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Operations");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                {activeSub === "HandoverCheckouts" && (
                  <AssetAssignmentComponent userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
                {activeSub === "Transfers" && (
                  <AssetTransferComponent userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
                {activeSub === "Maintenance" && (
                  <AssetMaintenance userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
                {activeSub === "Verification" && (
                  <AssetVerification
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                    directAssetIdForVerification={auditAssetIdRedirect}
                    resetVerificationSelection={() => setAuditAssetIdRedirect(null)}
                  />
                )}
                {activeSub === "Disposal" && (
                  <AssetDisposal userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
              </>
            );
          })()}

          {/* ─── REPORTS ─── */}
          {activeTab === "Reports" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Reports");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            const reportMap: Record<string, "Register" | "Department" | "Valuation" | "Maintenance" | "Verification" | "Transfer" | "Disposal" | "Audit"> = {
              ReportCenter: "Register",
              AssetAnalytics: "Valuation",
              UtilizationReports: "Department",
              VerificationReports: "Verification",
              AuditReports: "Audit"
            };
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                {activeSub !== "Overview" && (
                  <ReportingModule
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                    initialReport={reportMap[activeSub]}
                  />
                )}
              </>
            );
          })()}

          {/* ─── USERS & SECURITY ─── */}
          {activeTab === "UsersSecurity" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "UsersSecurity");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                {activeSub === "MyAccount" && (
                  <ProfileComponent
                    currentUser={currentUser}
                    initialTab="personal"
                    onUpdateUser={(updated) => {
                      setCurrentUser(updated);
                      const currentDB = getDatabaseState();
                      const idx = currentDB.users.findIndex(u => u.id === updated.id);
                      if (idx !== -1) { currentDB.users[idx] = updated; saveDatabaseState(currentDB); }
                      refreshDatabase();
                    }}
                    onThemeChanged={() => refreshDatabase()}
                  />
                )}
                {activeSub === "SessionManagement" && (
                  <ProfileComponent
                    currentUser={currentUser}
                    initialTab="security"
                    onUpdateUser={(updated) => {
                      setCurrentUser(updated);
                      const currentDB = getDatabaseState();
                      const idx = currentDB.users.findIndex(u => u.id === updated.id);
                      if (idx !== -1) { currentDB.users[idx] = updated; saveDatabaseState(currentDB); }
                      refreshDatabase();
                    }}
                    onThemeChanged={() => refreshDatabase()}
                  />
                )}
                {(activeSub === "UserAccounts" || activeSub === "RolesPermissions") && (
                  <UserManagement userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
                {(activeSub === "SecurityAuditLogs") && (
                  <AuditLogs userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
              </>
            );
          })()}

          {/* ─── ADMINISTRATION ─── */}
          {activeTab === "Administration" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Administration");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            const adminTabMap: Record<string, "Categories" | "Departments" | "Locations" | "Suppliers"> = {
              Departments: "Departments", Locations: "Locations", Categories: "Categories"
            };
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                {(activeSub === "Departments" || activeSub === "Locations" || activeSub === "Categories") && (
                  <ModulesAdministration
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                    initialTab={adminTabMap[activeSub]}
                  />
                )}
                {activeSub === "ReminderEngine" && (
                  <ReminderManagement userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
                {activeSub === "SystemConfigurations" && (
                  <SystemSettingsComponent userRole={currentUser.role} currentUserId={currentUser.id} />
                )}
              </>
            );
          })()}

          {/* ─── SETTINGS ─── */}
          {activeTab === "Settings" && (() => {
            const ws = permittedWorkspaces.find(w => w.id === "Settings");
            const activeSub = ws ? getActiveSubModule(ws) : "Overview";
            return (
              <>
                {ws && renderWorkspaceLauncher(ws, activeSub !== "Overview")}
                {activeSub !== "Overview" && (
                  <SystemSettingsComponent
                    userRole={currentUser.role}
                    currentUserId={currentUser.id}
                    focusSection={activeSub}
                  />
                )}
              </>
            );
          })()}

          {/* ─── PROFILE (avatar click shortcut) ─── */}
          {activeTab === "Profile" && (
            <ProfileComponent
              currentUser={currentUser}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                const currentDB = getDatabaseState();
                const idx = currentDB.users.findIndex(u => u.id === updated.id);
                if (idx !== -1) { currentDB.users[idx] = updated; saveDatabaseState(currentDB); }
                refreshDatabase();
              }}
              onThemeChanged={() => refreshDatabase()}
            />
          )}

        </section>

      </main>

      {isShortcutsHelpOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 text-xs transition-all ${
            isLight 
              ? "bg-white border-slate-200 text-slate-800 shadow-xl" 
              : "bg-[#121214] border-[#27272a] text-zinc-300 shadow-2xl"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
              isLight ? "border-slate-200" : "border-zinc-800"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight uppercase">Keyboard Shortcuts Guide</span>
                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold">POWER USER HUD</span>
              </div>
              <button
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-400 mb-4 leading-relaxed text-[11px]">
              Accelerate your workflow with these hotkeys. Modifiers support <kbd className={`px-1 rounded font-mono text-[10px] ${isLight ? "bg-slate-100 text-slate-707 text-slate-700 font-bold" : "bg-zinc-800 text-zinc-200"}`}>Ctrl</kbd> on Windows/Linux and <kbd className={`px-1 rounded font-mono text-[10px] ${isLight ? "bg-slate-100 text-slate-707 text-slate-700 font-bold" : "bg-zinc-800 text-zinc-200"}`}>Cmd</kbd> on macOS.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <h4 className="font-bold uppercase font-mono text-[10px] text-zinc-500 tracking-wider">🚀 Interface actions</h4>
                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Focus Search</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>K</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Toggle Offline Mode</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>T</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Toggle Shortcuts HUD</span>
                  <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>?</kbd>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Dismiss / Escape</span>
                  <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Esc</kbd>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold uppercase font-mono text-[10px] text-zinc-500 tracking-wider">📂 navigation jumps</h4>
                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Dashboard Overview</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>D</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Asset Portfolio</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>A</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Repairs & Maintenance</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>M</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-605 text-slate-600" : "text-zinc-400"}>Physical Verification</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>I</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>User Accounts</span>
                  <div className="flex gap-1 items-center">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>U</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Security Audit Ledgers</span>
                  <div className="flex gap-1 items-center">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>L</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-600" : "text-zinc-400"}>System Settings</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>S</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center group">
                  <span className={isLight ? "text-slate-606 text-slate-600" : "text-zinc-400"}>Account Profile</span>
                  <div className="flex gap-1">
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-800 text-zinc-100 border-zinc-700"}`}>Ctrl</kbd>
                    <span className="text-zinc-500 self-center">+</span>
                    <kbd className={`px-1.5 py-0.5 font-mono text-[10px] rounded border shadow-sm ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-zinc-805 bg-zinc-800 text-zinc-100 border-zinc-700"}`}>P</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t text-[10px] text-center font-mono font-medium ${isLight ? "border-slate-200 text-slate-500" : "border-zinc-800 text-zinc-500"}`}>
              Key bindings adapt atomically and only grant transition access allowed by your active user clearance level ({currentUser.role}).
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
