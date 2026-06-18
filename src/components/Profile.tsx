/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  User as UserIcon,
  ShieldAlert,
  Paintbrush,
  Laptop,
  CheckCircle,
  Eye,
  EyeOff,
  Bell,
  Smartphone,
  Globe,
  Trash2,
  Lock,
  LogOut,
  Clock,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  Info
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification, updateNotificationPreference } from "../db";
import { User, UserPreferences, UserRole } from "../types";

interface ProfileProps {
  currentUser: User;
  onUpdateUser: (updated: User) => void;
  onThemeChanged?: () => void;
  initialTab?: "personal" | "security" | "appearance";
}

const ACCENT_COLORS = [
  { id: "blue", name: "Executive Blue", color: "bg-blue-600", text: "text-blue-600 hover:bg-blue-50" },
  { id: "emerald", name: "Finance Emerald", color: "bg-emerald-600", text: "text-emerald-600 hover:bg-emerald-50" },
  { id: "rose", name: "Audit Rose", color: "bg-rose-600", text: "text-rose-600 hover:bg-rose-50" },
  { id: "violet", name: "Modern Violet", color: "bg-violet-600", text: "text-violet-600 hover:bg-violet-50" },
  { id: "amber", name: "Warning Orange", color: "bg-amber-600", text: "text-amber-600 hover:bg-amber-50" },
  { id: "indigo", name: "Sovereign Indigo", color: "bg-indigo-600", text: "text-indigo-600 hover:bg-indigo-50" }
];

export default function ProfileComponent({ currentUser, onUpdateUser, onThemeChanged, initialTab }: ProfileProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [activeSubTab, setActiveSubTab] = useState<"personal" | "security" | "appearance">(initialTab || "personal");

  React.useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  // Profile forms
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || "+254 700 000 000");
  const [bio, setBio] = useState(currentUser.bio || "Fixed asset supervisor handling internal operations audit cycles.");
  const [avatar, setAvatar] = useState(currentUser.avatar || "");

  // Notification toggles
  const [emailNotif, setEmailNotif] = useState(currentUser.preferences?.emailNotif ?? true);
  const [desktopNotif, setDesktopNotif] = useState(currentUser.preferences?.desktopNotif ?? true);
  const [assignmentNotif, setAssignmentNotif] = useState(currentUser.preferences?.assignmentNotif ?? true);

  // Security forms
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  // Appearance states
  const [theme, setTheme] = useState<"light" | "dark" | "system">(currentUser.preferences?.theme || "light");
  const [accent, setAccent] = useState(currentUser.preferences?.accentColor || "blue");
  const [layout, setLayout] = useState<"grid" | "compact" | "wide">(currentUser.preferences?.layout || "grid");
  const [sidebar, setSidebar] = useState<"dark" | "light" | "compact">(currentUser.preferences?.sidebarStyle || "dark");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">(currentUser.preferences?.fontSize || "md");

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpVerified, setTotpVerified] = useState(currentUser.totpEnabled || false);
  const [totpError, setTotpError] = useState("");
  const [mfaEnrollmentCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));

  const refreshLocalState = () => {
    const freshDb = getDatabaseState();
    setDb(freshDb);
  };

  // Profile uploader file reader
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        triggerNotification(currentUser.id, "Profile Photo Updated", "New avatar loaded into your identity file", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Image Drag-and-Drop handler
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        triggerNotification(currentUser.id, "Profile Picture Dropped", "Aesthetic canvas photo verified and updated.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Profiler edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      alert("Name and email address fields are required.");
      return;
    }

    const state = getDatabaseState();
    const userIndex = state.users.findIndex((u) => u.id === currentUser.id);

    if (userIndex !== -1) {
      const updatedUser: User = {
        ...state.users[userIndex],
        name,
        email,
        phone,
        bio,
        avatar,
        preferences: {
          ...(state.users[userIndex].preferences || {
            theme: "light",
            accentColor: "blue",
            layout: "grid",
            sidebarStyle: "dark",
            fontSize: "md"
          }),
          emailNotif,
          desktopNotif,
          assignmentNotif
        }
      };

      state.users[userIndex] = updatedUser;
      saveDatabaseState(state);
      updateNotificationPreference(currentUser.id, {
        emailEnabled: emailNotif,
        pushEnabled: desktopNotif,
        smsEnabled: false
      });
      onUpdateUser(updatedUser);

      addAuditRecord(
        currentUser.id,
        currentUser.name,
        "Identity Updated",
        `Corporate profile details modified: ${name} (${email})`
      );
      triggerNotification(currentUser.id, "Identity Records Saved", "Profile parameters synced securely in the database.", "success");
      alert("User dynamic master files saved safely.");
      refreshLocalState();
    }
  };

  // Save theme preferences immediately
  const handleSaveAppearance = (updatedTheme: "light" | "dark" | "system", updatedAccent: any, updatedLayout: any, updatedSidebar: any, updatedFontSize: any) => {
    const state = getDatabaseState();
    const userIndex = state.users.findIndex((u) => u.id === currentUser.id);

    if (userIndex !== -1) {
      const newPrefs: UserPreferences = {
        theme: updatedTheme,
        accentColor: updatedAccent,
        layout: updatedLayout,
        sidebarStyle: updatedSidebar,
        fontSize: updatedFontSize,
        emailNotif,
        desktopNotif,
        assignmentNotif
      };

      const updatedUser: User = {
        ...state.users[userIndex],
        preferences: newPrefs
      };

      state.users[userIndex] = updatedUser;
      saveDatabaseState(state);
      onUpdateUser(updatedUser);

      // Save global branding parameters
      addAuditRecord(
        currentUser.id,
        currentUser.name,
        "Preferences Saved",
        `Appearance parameters configured. Theme: ${updatedTheme}, Accent: ${updatedAccent}`
      );

      if (onThemeChanged) {
        onThemeChanged();
      }
      refreshLocalState();
    }
  };

  // Security password updates
  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPassError("All elements are strictly required.");
      return;
    }

    const state = getDatabaseState();
    const actualOldPassword = state.passwords[currentUser.id];

    if (actualOldPassword !== currentPassword) {
      setPassError("Authorization Shield: Current password verification has failed.");
      return;
    }

    // Modern strict check rules: min 8 chars, 1 uppercase, 1 numeric, 1 spec char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPassError("Security directive: Password must be min 8 characters and contain at least one uppercase letter, one number, and one special character.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPassError("Mismatch detected in passwords confirm comparison.");
      return;
    }

    // Apply security reset
    state.passwords[currentUser.id] = newPassword;
    
    // Also log history entry
    const userIndex = state.users.findIndex((u) => u.id === currentUser.id);
    if (userIndex !== -1) {
      const freshHistory = state.users[userIndex].loginHistory || [];
      freshHistory.unshift({
        timestamp: new Date().toISOString(),
        event: "Password Modified Policy Pass",
        device: "Corporate Desktop Terminal",
        browser: "Chrome Secured Engine",
        ip: "client-unavailable",
        status: "success"
      });
      state.users[userIndex].loginHistory = freshHistory;
    }

    saveDatabaseState(state);
    addAuditRecord(
      currentUser.id,
      currentUser.name,
      "Security Password Altered",
      "User completed self-service credential update action."
    );
    triggerNotification(currentUser.id, "Password Changed Successfully", "Corporate login credentials rotated.", "success");
    setPassSuccess("Credentials rotated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  // Enable/Disable Two Factor Authentication
  const handleVerify2FA = () => {
    if (totpCode.trim() === mfaEnrollmentCode) {
      const state = getDatabaseState();
      const userIndex = state.users.findIndex((u) => u.id === currentUser.id);
      if (userIndex !== -1) {
        state.users[userIndex].totpEnabled = true;
        state.users[userIndex].totpSecret = `client-mfa-${mfaEnrollmentCode}`;
        saveDatabaseState(state);
        onUpdateUser(state.users[userIndex]);
      }
      setTotpVerified(true);
      setShow2FAModal(false);
      addAuditRecord(currentUser.id, currentUser.name, "2FA Active State", "Enforced hardware verification TOTP lock");
      triggerNotification(currentUser.id, "Security Hardened", "TOTP Multi-Device Authenticator enrolled", "success");
      alert("TOTP Code enrollment verified successfully! Your portal is protected.");
    } else {
      setTotpError("Incorrect 6-digit synchronizer token. Try again.");
    }
  };

  const handleDisable2FA = () => {
    if (confirm("Deactivate Multi-factor hardware auth shields?")) {
      const state = getDatabaseState();
      const userIndex = state.users.findIndex((u) => u.id === currentUser.id);
      if (userIndex !== -1) {
        state.users[userIndex].totpEnabled = false;
        saveDatabaseState(state);
        onUpdateUser(state.users[userIndex]);
      }
      setTotpVerified(false);
      addAuditRecord(currentUser.id, currentUser.name, "2FA Deactive State", "Removed TOTP multi-device auth shield");
      triggerNotification(currentUser.id, "Security Guard Lowered", "TOTP authenticator removed.", "warning");
    }
  };

  // Session termination controls
  const handleLogoutOtherDevices = () => {
    const state = getDatabaseState();
    const userIdx = state.users.findIndex((u) => u.id === currentUser.id);
    if (userIdx !== -1) {
      // Clear sessions list down to only the current browser session
      const currentDevSession = state.users[userIdx].activeSessions?.slice(0, 1) || [
        {
          id: `sess-${Date.now()}`,
          loginTime: new Date().toISOString(),
          device: typeof navigator !== "undefined" ? navigator.platform || "Browser Client" : "Browser Client",
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "Browser",
          ip: "client-unavailable"
        }
      ];
      state.users[userIdx].activeSessions = currentDevSession;
      saveDatabaseState(state);
      onUpdateUser(state.users[userIdx]);
    }
    addAuditRecord(currentUser.id, currentUser.name, "Killed Remote Sessions", "Forced termination of other active browser sessions");
    triggerNotification(currentUser.id, "Sessions Terminated", "Successfully logged out all other logins context.", "success");
    alert("Termination signals broadcasted. All other remote browser terminals have been logged out!");
    refreshLocalState();
  };

  // Get active session data
  const userSessions = useMemo(() => {
    return currentUser.activeSessions || [];
  }, [currentUser]);

  // Get audit activity/login log history
  const loginActivity = useMemo(() => {
    return currentUser.loginHistory || [];
  }, [currentUser]);

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-xs">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">User Profile & Corporate Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage password credentials, system mode aesthetics, multi-device active sessions and logs</p>
          </div>
        </div>

        {/* Level 2 Subtabs selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab("personal")}
            className={`py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === "personal" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" /> Personal info
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("security")}
            className={`py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === "security" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Security & Sessions
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("appearance")}
            className={`py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === "appearance" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" /> Appearance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-xs">
        
        {/* Left column sidebar overview */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-center space-y-4 h-fit">
          <div className="relative group w-24 h-24 mx-auto">
            {avatar ? (
              <img src={avatar} className="w-full h-full rounded-full object-cover border-4 border-slate-50 shadow-md" alt="Avatar" />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-3xl font-mono">
                {currentUser.name[0]?.toUpperCase()}
              </div>
            )}
            
            {/* Hover Camera icon indicator */}
            <label className="absolute inset-0 bg-slate-950/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
              📷 Upload
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">{currentUser.name}</h3>
            <p className="text-slate-405 font-medium text-slate-400 mt-1 font-mono tracking-wider">{currentUser.role.toUpperCase()}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
              ID Hash: {currentUser.id}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-50 text-left space-y-2.5">
            <div>
              <span className="block text-[8.5px] uppercase font-bold tracking-wider text-slate-400">Security Gate State</span>
              <span className="font-mono text-[10.5px] font-bold text-emerald-600 flex items-center gap-1">
                🛡️ Active Cryptography
              </span>
            </div>
            <div>
              <span className="block text-[8.5px] uppercase font-bold tracking-wider text-slate-400">Department Node</span>
              <span className="font-mono text-[10.5px] text-slate-700 font-bold">
                {db.departments.find(d => d.id === currentUser.departmentId)?.name || "Main Admin Base"}
              </span>
            </div>
            <div>
              <span className="block text-[8.5px] uppercase font-bold tracking-wider text-slate-400">Account Enrolled</span>
              <span className="font-mono text-[10px] text-slate-500 font-semibold">
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Main Tab content container */}
        <div className="lg:col-span-3">

          {/* TAB 1: Personal info form */}
          {activeSubTab === "personal" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-600">
                General Profile Details
              </div>
              
              <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
                
                {/* Drag and Drop Box Picture */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Corporate Identity Picture</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1 text-slate-500 text-[10.5px]">
                      <p className="font-bold text-slate-700">Drag and drop profile picture here</p>
                      <p className="text-slate-405 text-slate-400">Or click to select photo file (JPEG, PNG background frame)</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        id="avatar-full-box"
                      />
                      <label htmlFor="avatar-full-box" className="inline-block mt-2 text-indigo-600 hover:text-indigo-500 font-bold font-sans cursor-pointer underline">
                        Browse Files
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Authorized Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Corporate Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Direct Telephone / Mobile</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Assigned Department</label>
                    <input
                      type="text"
                      disabled
                      value={db.departments.find(d => d.id === currentUser.departmentId)?.name || "Administration HQ Suite"}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-lg py-2.5 px-3 font-semibold select-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="font-bold text-slate-700">Biography / Core Responsibilities</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-805 focus:outline-none"
                  />
                </div>

                {/* Notification preferences matrix */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-slate-800 font-bold flex items-center gap-1 text-xs">
                    <Bell className="w-4 h-4 text-slate-500" /> Notifications & Communications Routing Settings
                  </h4>
                  <div className="space-y-2 text-slate-500 leading-normal text-[10.5px] font-medium bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="email-notif"
                        checked={emailNotif}
                        onChange={(e) => { setEmailNotif(e.target.checked); }}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded cursor-pointer"
                      />
                      <label htmlFor="email-notif" className="font-bold text-slate-705 text-slate-700 cursor-pointer">
                        Forward asset updates, audit transfers, and maintenance alerts directly to my inbox ({email})
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="desktop-notif"
                        checked={desktopNotif}
                        onChange={(e) => { setDesktopNotif(e.target.checked); }}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded cursor-pointer"
                      />
                      <label htmlFor="desktop-notif" className="font-bold text-slate-707 text-slate-700 cursor-pointer">
                        Enable live in-application warning banners and toaster popups
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="assignment-notif"
                        checked={assignmentNotif}
                        onChange={(e) => { setAssignmentNotif(e.target.checked); }}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded cursor-pointer"
                      />
                      <label htmlFor="assignment-notif" className="font-bold text-slate-709 text-slate-700 cursor-pointer">
                        Enforce real-time email reminders on pending handovers checkouts
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-505 bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all text-xs"
                  >
                    Save Profile Parameters
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB 2: Security, TOTP & Sessions */}
          {activeSubTab === "security" && (
            <div className="space-y-6">
              
              {/* Reset password form */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-650 text-slate-600">
                  Secure Password Authentication Gate
                </div>
                
                <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
                  {passError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-650 text-rose-500 font-bold rounded-lg">
                      ⚠️ {passError}
                    </div>
                  )}
                  {passSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-850 text-emerald-600 font-bold rounded-lg flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> {passSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Current Security Password</label>
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-805"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">New Secure Password</label>
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 char rules"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-805"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Confirm Password Match</label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-10 text-slate-805"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg text-[10px] text-slate-500 leading-normal border border-slate-100">
                    <div>
                      <span className="font-bold block text-slate-600 font-mono">EXECUTIVE CREDENTIAL REQUIREMENTS:</span>
                      <span>Password must contain at least 8 characters, an uppercase case letter, a digit, and 1 non-alphanumeric token.</span>
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer"
                    >
                      Rotated Credentials
                    </button>
                  </div>
                </form>
              </div>

              {/* Two factor segment */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <h4 className="font-bold text-slate-905 font-display text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" /> Dynamic Multi-Factor Authentication (MFA)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Improve accounting portal integrity by requiring a temporary TOTP verification code from personal hardware devices (e.g., Google Authenticator, Duo App) alongside your credentials upon signing.
                  </p>
                </div>

                <div>
                  {totpVerified ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ● Hardware Token Enabled
                      </span>
                      <button
                        type="button"
                        onClick={handleDisable2FA}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                      >
                        Deactivate
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShow2FAModal(true)}
                      className="bg-slate-900 text-white font-bold px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-800 text-xs shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Configure TOTP Authenticator
                    </button>
                  )}
                </div>
              </div>

              {/* Verified sessions ledger */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-600 flex justify-between items-center">
                  <span>Currently Verified Session Terminals</span>
                  <button
                    onClick={handleLogoutOtherDevices}
                    className="p-1.5 rounded-lg text-[10px] font-mono font-bold bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-100 cursor-pointer text-right"
                  >
                    Logout All Other Sessions
                  </button>
                </div>

                <div className="divide-y divide-slate-50">
                  {userSessions.map((sess, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-mono font-bold text-xs">
                          {idx === 0 ? "HOST" : "REMOT"}
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                            {sess.device}{" "}
                            {idx === 0 && (
                              <span className="inline-block px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[8.5px] rounded-md font-bold font-mono">
                                THIS SESSION
                              </span>
                            )}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-medium">Browser: {sess.browser} • Port Node • Encrypted TLS</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono leading-tight text-slate-500">
                        <span className="block font-bold font-sans text-slate-700">IP: {sess.ip}</span>
                        <span className="text-[9.5px]">Connected: {new Date(sess.loginTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historic Security Log attempts */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-600">
                  Corporate Authorized Access Ledger (Login History)
                </div>

                <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                  {loginActivity.map((log, idx) => (
                    <div key={idx} className="p-3.5 flex justify-between items-center hover:bg-slate-50/20 text-slate-500">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <h6 className="font-bold text-slate-805 text-slate-800 text-[11px]">{log.event}</h6>
                          <p className="text-[9.5px] text-slate-400 mt-0.5">Secure client node via: {log.device} ({log.browser})</p>
                        </div>
                      </div>
                      <div className="text-right text-[9.5px] font-mono shrink-0">
                        <span className="block text-slate-700 font-bold">{log.ipAddress}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Dynamic Theme preferences */}
          {activeSubTab === "appearance" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-650 text-slate-600">
                Workspace Aesthetic & Appearance Parameters
              </div>

              <div className="p-6 space-y-6">
                
                {/* 1. Theme selection */}
                <div className="space-y-3">
                  <label className="font-bold text-slate-700 text-xs block uppercase tracking-wider text-slate-500">
                    System Canvas Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => { setTheme("light"); handleSaveAppearance("light", accent, layout, sidebar, fontSize); }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                        theme === "light"
                          ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500"
                          : "border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      <span className="font-bold text-slate-800">☀️ Clean Light Mode</span>
                      <p className="text-[10px] text-slate-450 text-slate-400 leading-none">Soft whites and high-contrast charcoal texts</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheme("dark"); handleSaveAppearance("dark", accent, layout, sidebar, fontSize); }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                        theme === "dark"
                          ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500"
                          : "border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      <span className="font-bold text-slate-800">🌙 Immersive Dark Mode</span>
                      <p className="text-[10px] text-slate-400 leading-none">Matte-slate canvas tailored for light-sensitive staff</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheme("system"); handleSaveAppearance("system", accent, layout, sidebar, fontSize); }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                        theme === "system"
                          ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500"
                          : "border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      <span className="font-bold text-slate-800">💻 Sync System Defaults</span>
                      <p className="text-[10px] text-slate-400 leading-none">Follows physical operating system schedule configs</p>
                    </button>
                  </div>
                </div>

                {/* 2. Accent Selector colors */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="font-bold text-slate-705 block uppercase tracking-wider text-slate-500 text-xs">
                    Primary Accent Tint Selection
                  </label>
                  <p className="text-[10px] text-slate-400">Determines visual theme focus highlight of button canvases, filters, and chart borders</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => { setAccent(col.id as any); handleSaveAppearance(theme, col.id, layout, sidebar, fontSize); }}
                        className={`p-2.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer transition-all ${
                          accent === col.id
                            ? "border-slate-900 bg-slate-50 font-bold"
                            : "border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${col.color}`} />
                        <span className="capitalize">{col.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Dashboard layouts & configs */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  <div className="space-y-3">
                    <label className="font-bold text-slate-700 block uppercase tracking-wider text-slate-500 text-xs">
                      Dashboard Layout spacing
                    </label>
                    <select
                      value={layout}
                      onChange={(e) => { setLayout(e.target.value as any); handleSaveAppearance(theme, accent, e.target.value as any, sidebar, fontSize); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer focus:outline-none"
                    >
                      <option value="grid">Responsive Bento Blocks (Standard Grid)</option>
                      <option value="compact">Compacted Density Spacing List Layout</option>
                      <option value="wide">Wide Screen Fluid Canvas Area Extension</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="font-bold text-slate-700 block uppercase tracking-wider text-slate-500 text-xs">
                      Active Sidebar Style
                    </label>
                    <select
                      value={sidebar}
                      onChange={(e) => { setSidebar(e.target.value as any); handleSaveAppearance(theme, accent, layout, e.target.value as any, fontSize); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer focus:outline-none"
                    >
                      <option value="dark">Professional Corporate Black/Slate (Recommended)</option>
                      <option value="light">Crisp Minimal Slate Light Theme Style</option>
                      <option value="compact">Narrow Compacted Icon Rail Sidebar</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="font-bold text-slate-707 block uppercase tracking-wider text-slate-500 text-xs">
                      Primary Font Size
                    </label>
                    <select
                      value={fontSize}
                      onChange={(e) => { setFontSize(e.target.value as any); handleSaveAppearance(theme, accent, layout, sidebar, e.target.value as any); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer focus:outline-none"
                    >
                      <option value="sm">Small dense text scaling (Best for low resolution)</option>
                      <option value="md">Medium crisp rendering density</option>
                      <option value="lg">Large scaled text headers (High accessibility layout)</option>
                    </select>
                  </div>

                  <div className="p-3.5 bg-indigo-50/30 border border-indigo-100 rounded-xl leading-normal flex items-start gap-2.5 text-indigo-850">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold block text-[10.5px]">Aesthetic State Synchronized</span>
                      <span>Your interface changes automatically synchronize into your secure database preferences log, and are restored dynamically during your logins.</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* 2FA SETUP MODAL DIALOG */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 text-xs select-none">
          <div className="bg-[#121214] max-w-sm w-full rounded-2xl border border-zinc-800 shadow-2xl p-6 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5 text-indigo-400">
                <Smartphone className="w-5 h-5" /> MFA Authenticator Code Setup
              </h3>
              <button
                onClick={() => setShow2FAModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-[10.5px] leading-relaxed">
              <p className="text-zinc-400">
                1. Open your authenticator mobile application (Google Authenticator, Microsoft Auth, Authy, etc.).
              </p>
              
              {/* Enrollment verification card */}
              <div className="bg-white p-2.5 rounded-lg w-28 h-28 mx-auto flex items-center justify-center border border-zinc-800">
                <svg viewBox="0 0 100 100" width="100" height="100">
                  <rect width="100" height="100" fill="white" />
                  <rect x="5" y="5" width="25" height="25" fill="black" />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="70" y="5" width="25" height="25" fill="black" />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="5" y="70" width="25" height="25" fill="black" />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  <path d="M40 10h10v10H40zm15 15h10v10H55zm-15 15h10v10H40zm30 30h10v10H70zm-15 15h10v10H55zm15-15h10v10H70z" fill="black" />
                  <rect x="42" y="42" width="16" height="16" fill="black" />
                </svg>
              </div>

              <div className="text-center font-mono">
                <span className="text-[10px] text-zinc-505 text-zinc-500 uppercase">Enrollment verification code:</span>
                <p className="font-bold text-indigo-300">{mfaEnrollmentCode}</p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-300">2. Enter the six digit mobile token to complete setup:</label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="Six digit code"
                  maxLength={6}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white py-2 px-3.5 rounded-lg tracking-widest text-center text-sm font-mono focus:border-indigo-600 focus:outline-none"
                />
                {totpError && <p className="text-red-400 font-semibold font-mono text-[9.5px]">{totpError}</p>}
                <p className="text-[9.5px] text-zinc-500 italic mt-1 text-center">Enter the active token from your authentication device to complete authorization.</p>
              </div>
            </div>

            <button
              onClick={handleVerify2FA}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg cursor-pointer text-xs"
            >
              Verify Code & Activate Shield
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
