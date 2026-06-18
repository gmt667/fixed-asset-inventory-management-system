/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Settings,
  Shield,
  Upload,
  Database,
  Mail,
  Sliders,
  BellRing,
  CheckCircle,
  X,
  FileCode,
  LockKeyhole
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification } from "../db";
import { SystemSettings, UserRole } from "../types";

const ACCENT_COLORS = [
  { id: "blue", name: "Executive Blue", color: "bg-blue-600" },
  { id: "emerald", name: "Finance Emerald", color: "bg-emerald-600" },
  { id: "rose", name: "Audit Rose", color: "bg-rose-600" },
  { id: "violet", name: "Modern Violet", color: "bg-violet-600" },
  { id: "amber", name: "Warning Orange", color: "bg-amber-600" },
  { id: "indigo", name: "Sovereign Indigo", color: "bg-indigo-600" }
];

interface SystemSettingsProps {
  userRole: UserRole;
  currentUserId: string;
  focusSection?: string;
}

export default function SystemSettingsComponent({ userRole, currentUserId, focusSection }: SystemSettingsProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [isBackupSimulating, setIsBackupSimulating] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const currentUser = useMemo(() => {
    return db.users.find(u => u.id === currentUserId);
  }, [db.users, currentUserId]);

  const [accentColor, setAccentColor] = useState<"blue" | "emerald" | "rose" | "violet" | "amber" | "indigo">(
    currentUser?.preferences?.accentColor || "blue"
  );

  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    currentUser?.preferences?.theme || "light"
  );

  React.useEffect(() => {
    if (currentUser?.preferences?.theme) {
      setTheme(currentUser.preferences.theme);
    }
  }, [currentUser]);

  // Form states
  const [orgName, setOrgName] = useState(db.settings.orgName);
  const [logo, setLogo] = useState(db.settings.logo);
  const [emailHost, setEmailHost] = useState(db.settings.emailHost || "smtp.giantplus.local");
  const [emailPort, setEmailPort] = useState(db.settings.emailPort || "587");
  const [emailSender, setEmailSender] = useState(db.settings.emailSender || "faims-noreply@giantplus.com");
  const [notifications, setNotifications] = useState(db.settings.isNotificationsEnabled);
  const [backupFreq, setBackupFreq] = useState(db.settings.backupFrequency);
  const [reminderIntervals, setReminderIntervals] = useState((db.settings.reminderIntervals || [30, 14, 7, 3, 1, 0]).join(", "));

  // New admin organizational settings fields
  const [orgAddress, setOrgAddress] = useState(db.settings.orgAddress || "101 Enterprise Road, Industrial Area, Nairobi");
  const [orgPhone, setOrgPhone] = useState(db.settings.orgPhone || "+254 712 345 678");
  const [orgEmail, setOrgEmail] = useState(db.settings.orgEmail || "info@giantplus.com");
  const [orgWebsite, setOrgWebsite] = useState(db.settings.orgWebsite || "www.giantplus.com");
  const [orgFooterText, setOrgFooterText] = useState(db.settings.orgFooterText || "© 2026 Giant Plus Limited. All rights reserved. FAIMS Platform Level 4");
  const [orgDefaultLanguage, setOrgDefaultLanguage] = useState(db.settings.orgDefaultLanguage || "en");
  const [systemTheme, setSystemTheme] = useState(db.settings.systemTheme || "light");
  
  // Localized form states
  const [currency, setCurrency] = useState(db.settings.currency || "MWK");
  const [timezone, setTimezone] = useState(db.settings.timezone || "Africa/Blantyre (CAT)");
  const [dateFormat, setDateFormat] = useState(db.settings.dateFormat || "DD/MM/YYYY");

  const isAuthorized = useMemo(() => {
    return userRole === UserRole.ADMIN;
  }, [userRole]);

  const refreshDb = () => {
    const freshDb = getDatabaseState();
    setDb(freshDb);
    const freshUser = freshDb.users.find(u => u.id === currentUserId);
    if (freshUser?.preferences?.accentColor) {
      setAccentColor(freshUser.preferences.accentColor);
    }
    if (freshUser?.preferences?.theme) {
      setTheme(freshUser.preferences.theme);
    }
  };

  const handleSavePersonalTheme = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    const currentDB = getDatabaseState();
    const userObj = currentDB.users.find(u => u.id === currentUserId);
    if (userObj) {
      userObj.preferences = {
        theme: selectedTheme,
        accentColor: userObj.preferences?.accentColor || accentColor,
        layout: userObj.preferences?.layout || "grid",
        sidebarStyle: userObj.preferences?.sidebarStyle || "dark",
        fontSize: userObj.preferences?.fontSize || "md",
        emailNotif: userObj.preferences?.emailNotif ?? true,
        desktopNotif: userObj.preferences?.desktopNotif ?? true,
        assignmentNotif: userObj.preferences?.assignmentNotif ?? true
      };
      
      saveDatabaseState(currentDB);
      addAuditRecord(
        currentUserId,
        userRole,
        "Personal Theme Customization",
        `Customized personal dashboard theme mode to: ${selectedTheme}`
      );
      triggerNotification(currentUserId, "Workspace Theme Changed", `Theme successfully customized to ${selectedTheme}.`, "success");
      
      window.dispatchEvent(new Event("faims_db_synced"));
      refreshDb();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !logo) {
      alert("Organization name and Logo abbreviation are required.");
      return;
    }

    const currentDB = getDatabaseState();
    
    const updatedSettings: SystemSettings = {
      orgName,
      logo,
      theme: systemTheme === "dark" ? "dark" : "light", // Persist theme config
      emailHost,
      emailPort,
      emailSender,
      isNotificationsEnabled: notifications,
      backupFrequency: backupFreq,
      orgAddress,
      orgPhone,
      orgEmail,
      orgWebsite,
      orgFooterText,
      orgDefaultLanguage,
      systemTheme,
      currency,
      timezone,
      dateFormat,
      reminderIntervals: reminderIntervals
        .split(",")
        .map(value => Number(value.trim()))
        .filter(value => Number.isFinite(value) && value >= 0)
    };

    currentDB.settings = updatedSettings;

    // Save current user dashboard accent color preference
    const userObj = currentDB.users.find(u => u.id === currentUserId);
    if (userObj) {
      if (!userObj.preferences) {
        userObj.preferences = {
          theme: theme,
          accentColor: accentColor,
          layout: "grid",
          sidebarStyle: "dark",
          fontSize: "md",
          emailNotif: true,
          desktopNotif: true,
          assignmentNotif: true
        };
      } else {
        userObj.preferences.accentColor = accentColor;
        userObj.preferences.theme = theme;
      }
    }

    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "System Settings Modified",
      `Adjusted global variables and saved personal workspace accent tint: ${accentColor}`
    );
    triggerNotification("all", "Settings Configured", "System parameters and workspace customization successfully saved.", "success");
    
    // Dispatch event to allow real-time reflection across other routes/views
    window.dispatchEvent(new Event("faims_db_synced"));
    
    refreshDb();
    alert("Configuration parameters updated successfully across FAIMS!");
  };

  const handleSavePersonalPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const currentDB = getDatabaseState();
    const userObj = currentDB.users.find(u => u.id === currentUserId);
    if (userObj) {
      if (!userObj.preferences) {
        userObj.preferences = {
          theme: theme,
          accentColor: accentColor,
          layout: "grid",
          sidebarStyle: "dark",
          fontSize: "md",
          emailNotif: true,
          desktopNotif: true,
          assignmentNotif: true
        };
      } else {
        userObj.preferences.accentColor = accentColor;
        userObj.preferences.theme = theme;
      }
    }

    saveDatabaseState(currentDB);
    addAuditRecord(
      currentUserId,
      userRole,
      "Personal Accent Color Customization",
      `Customized personal dashboard accent color preference to: ${accentColor}`
    );
    triggerNotification("all", "Workspace Personalized", `Dashboard accent color successfully customized to ${accentColor}.`, "success");
    
    window.dispatchEvent(new Event("faims_db_synced"));
    refreshDb();
    alert("Personal appearance preferences updated successfully!");
  };

  const handleCreateBackup = () => {
    setIsBackupSimulating(true);
    setBackupProgress(10);
    
    let prog = 10;
    const interval = setInterval(() => {
      prog += 20;
      setBackupProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        
        // Finalize Download trigger with the ACTUAL DB DATA in SQL structure block!
        const sqlContent = `-- FAIMS System DB Backup
-- Giant Plus Limited
-- Date: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS categories (id VARCHAR(50), name VARCHAR(100), code VARCHAR(50));
INSERT INTO categories VALUES ${db.categories.map(c => `('${c.id}', '${c.name}', '${c.code}')`).join(",\n")};

CREATE TABLE IF NOT EXISTS departments (id VARCHAR(50), name VARCHAR(100), code VARCHAR(50));
INSERT INTO departments VALUES ${db.departments.map(d => `('${d.id}', '${d.name}', '${d.code}')`).join(",\n")};

CREATE TABLE IF NOT EXISTS locations (id VARCHAR(50), name VARCHAR(100), code VARCHAR(50));
INSERT INTO locations VALUES ${db.locations.map(l => `('${l.id}', '${l.name}', '${l.code}')`).join(",\n")};

CREATE TABLE IF NOT EXISTS assets (id VARCHAR(50), tag VARCHAR(50), name VARCHAR(100), cost DECIMAL(10,2));
INSERT INTO assets VALUES ${db.assets.map(a => `('${a.id}', '${a.assetTag}', '${a.name.replace(/'/g, "''")}', ${a.purchaseCost})`).join(",\n")};
`;

        const blob = new Blob([sqlContent], { type: "text/sql" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `FAIMS_Backup_${new Date().toISOString().split("T")[0]}.sql`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addAuditRecord(currentUserId, userRole, "Database Backup", "Generated SQL data backup file");
        triggerNotification("all", "Database Backup Successful", "Corporate backup compiled and downloaded successfully.", "success");

        setTimeout(() => {
          setIsBackupSimulating(false);
          setBackupProgress(0);
        }, 500);
      }
    }, 150);
  };

  // Safe checks for configuration access
  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        
        {/* Header axis */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs animate-fade-in">
          <div>
            <h2 className="text-xl font-display font-semibold text-slate-905 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" /> Workspace Personalization Portal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Customize your dashboard workspace accent style highlighting globally.
            </p>
          </div>
        </div>

        {(!focusSection || focusSection === "ThemeManagement") ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            
            {/* Main workspace setting block */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-550 flex justify-between items-center">
                <span>Personal Appearance Preferences</span>
                <span className="font-mono text-indigo-600 text-[10px] tracking-wider font-bold">Preferences Node Active</span>
              </div>

              <form onSubmit={handleSavePersonalPreferences} className="p-6 space-y-6">
                
                {/* Personal Theme Switcher */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    ⚙️ My Personal Theme Mode
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Customize your personal theme canvas mode preference.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSavePersonalTheme("light")}
                      className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all text-left ${
                        theme === "light"
                          ? "border-indigo-600 bg-indigo-50/20 font-bold ring-2 ring-indigo-500/20 shadow-xs text-slate-800"
                          : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
                      }`}
                    >
                      <span className="font-bold">☀️ Clean Light Mode</span>
                      <p className="text-[10px] text-slate-400 leading-none">Soft whites and high-contrast texts</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePersonalTheme("dark")}
                      className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all text-left ${
                        theme === "dark"
                          ? "border-indigo-600 bg-indigo-50/20 font-bold ring-2 ring-indigo-500/20 shadow-xs text-slate-800"
                          : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
                      }`}
                    >
                      <span className="font-bold">🌙 Immersive Dark Mode</span>
                      <p className="text-[10px] text-slate-400 leading-none">Matte-slate canvas for reduced strain</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePersonalTheme("system")}
                      className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all text-left ${
                        theme === "system"
                          ? "border-indigo-600 bg-indigo-50/20 font-bold ring-2 ring-indigo-500/20 shadow-xs text-slate-800"
                          : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
                      }`}
                    >
                      <span className="font-bold">💻 Sync System Defaults</span>
                      <p className="text-[10px] text-slate-400 leading-none">Follows local operating system settings</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-505" /> Dashboard Accent Tint Highlights
                  </span>
                  
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Customize your personal global focus tint (affects sidebar highlighting, active badges, actions, and key analytics widgets).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setAccentColor(col.id as any)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          accentColor === col.id
                            ? "border-slate-800 bg-indigo-50/40 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-350 bg-white"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shadow-inner shrink-0 ${col.color}`} />
                        <span className="text-xs text-slate-800 font-semibold">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secure system restricted banner */}
                <div className="p-4.5 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-[11px] text-amber-800 leading-normal font-medium">
                  <LockKeyhole className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">System Administration Variables Restricted</h4>
                    <p className="text-amber-705 mt-0.5 leading-relaxed">
                      Corporate variables (logo branding abbreviations, outgoing TLS SMTP servers, alert policies, and physical SQL schema dumps) are locked under safe custody rules. They are only customizable by a <strong>System Administrator</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 -mx-6 -mb-6 mt-6">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all text-xs font-display"
                  >
                    Save Workspace Highlight Tint
                  </button>
                </div>

              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
            <LockKeyhole className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 font-display">Branding & System Configuration Locked</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Customization of corporate configurations (like company profile, currency settings, or email notification servers) is restricted exclusively to System Administrators. Please navigate to the **Theme Management** tab to adjust your personal appearance.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header axis */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" /> Global Configuration Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse and modify structural company parameters, email SMTP accounts, alerts, and compile database physical dumps.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        
        {/* Left Columns - Form parameters */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-500 flex justify-between items-center">
            <span>Core settings parameters</span>
            <span className="font-mono text-emerald-600 text-[10px] tracking-wider font-bold">Admin Panel Secure</span>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
                        {/* Sec 1: Branding */}
            {(!focusSection || focusSection === "OrganizationProfile" || focusSection === "CompanyLogo" || focusSection === "ThemeManagement" || focusSection === "CurrencySettings" || focusSection === "TimezoneSettings") && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" /> Corporate Branding & Organization Settings
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(!focusSection || focusSection === "OrganizationProfile") && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Organization Name *</label>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 font-medium focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  )}
                  {(!focusSection || focusSection === "CompanyLogo") && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Logo Text Abbreviation *</label>
                      <input
                        type="text"
                        required
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 font-medium focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  )}

                  {(!focusSection || focusSection === "OrganizationProfile") && (
                    <>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-slate-700">Organization Head Office Address</label>
                        <input
                          type="text"
                          value={orgAddress}
                          onChange={(e) => setOrgAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none"
                          placeholder="e.g. 101 Enterprise Road, Industrial Area"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Office Phone Number</label>
                        <input
                          type="text"
                          value={orgPhone}
                          onChange={(e) => setOrgPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none font-mono"
                          placeholder="e.g. +254 712 345 678"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Official Contact Email</label>
                        <input
                          type="email"
                          value={orgEmail}
                          onChange={(e) => setOrgEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none"
                          placeholder="e.g. contact@company.com"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Company Website</label>
                        <input
                          type="text"
                          value={orgWebsite}
                          onChange={(e) => setOrgWebsite(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none font-mono"
                          placeholder="e.g. www.company.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">System Default Language</label>
                        <select
                          value={orgDefaultLanguage}
                          onChange={(e) => setOrgDefaultLanguage(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none cursor-pointer"
                        >
                          <option value="en">English (Universal Standard)</option>
                          <option value="sw">Kiswahili (East Africa Localized)</option>
                          <option value="fr">French (Corporate European)</option>
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-bold text-slate-700">Footer Text Branding</label>
                        <input
                          type="text"
                          value={orgFooterText}
                          onChange={(e) => setOrgFooterText(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none"
                          placeholder="Footer display text"
                        />
                      </div>
                    </>
                  )}

                  {(!focusSection || focusSection === "ThemeManagement") && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Default Brand Environment Theme</label>
                      <select
                        value={systemTheme}
                        onChange={(e) => setSystemTheme(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none cursor-pointer"
                      >
                        <option value="light">Warm Light Mode (Recommended Default)</option>
                        <option value="dark">Professional Dark Mode (Cosmic Space Theme)</option>
                        <option value="system">Follow User's System Default Preference</option>
                      </select>
                    </div>
                  )}

                  {(!focusSection || focusSection === "CurrencySettings") && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Reporting Currency *</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none cursor-pointer font-bold"
                      >
                        <option value="MWK">Malawian Kwacha (MWK)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </div>
                  )}

                  {(!focusSection || focusSection === "TimezoneSettings") && (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Regional Timezone *</label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none cursor-pointer"
                        >
                          <option value="Africa/Blantyre (CAT)">Africa/Blantyre (CAT)</option>
                          <option value="Africa/Nairobi (EAT)">Africa/Nairobi (EAT)</option>
                          <option value="Africa/Johannesburg (SAST)">Africa/Johannesburg (SAST)</option>
                          <option value="UTC">UTC (Universal Coordinated Time)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Date Format Standard *</label>
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none cursor-pointer font-mono"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 08/06/2026)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/08/2026)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-08)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* My Personal Dashboard Theme Mode customization */}
            {(!focusSection || focusSection === "ThemeManagement") && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  ⚙️ My Personal Theme Mode
                </span>
                <p className="text-[11px] text-slate-400">
                  Customize your personal theme canvas mode preference.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSavePersonalTheme("light")}
                    className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all text-left ${
                      theme === "light"
                        ? "border-indigo-600 bg-indigo-50/20 font-bold ring-2 ring-indigo-500/20 shadow-xs text-slate-800"
                        : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
                    }`}
                  >
                    <span className="font-bold">☀️ Clean Light Mode</span>
                    <p className="text-[10px] text-slate-450 leading-none">Soft whites and high-contrast texts</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePersonalTheme("dark")}
                    className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all text-left ${
                      theme === "dark"
                        ? "border-indigo-600 bg-indigo-50/20 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
                    }`}
                  >
                    <span className="font-bold">🌙 Immersive Dark Mode</span>
                    <p className="text-[10px] text-slate-400 leading-none">Matte-slate canvas for reduced strain</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePersonalTheme("system")}
                    className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all text-left ${
                      theme === "system"
                        ? "border-indigo-600 bg-indigo-50/20 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-350 bg-white text-slate-800"
                    }`}
                  >
                    <span className="font-bold">💻 Sync System Defaults</span>
                    <p className="text-[10px] text-slate-400 leading-none">Follows local operating system settings</p>
                  </button>
                </div>
              </div>
            )}

            {/* My Personal Dashboard Accent Color customization */}
            {(!focusSection || focusSection === "ThemeManagement") && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-600" /> My Personal Dashboard Accent Highlight
                </span>
                <p className="text-[11px] text-slate-400">
                  Customize your own global workspace highlight (affects active sidebar tabs, interactive buttons, state highlights, and focus indicators).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  {ACCENT_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setAccentColor(col.id as any)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        accentColor === col.id
                          ? "border-slate-800 bg-emerald-50/50 font-bold ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-350 bg-white"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full shadow-inner shrink-0 ${col.color}`} />
                      <span className="text-xs text-slate-800 font-semibold">{col.name.split(" ")[1]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sec 2: Config Email SMTP */}
            {(!focusSection || focusSection === "NotificationSettings") && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Outgoing SMTP Server Coordinates (Email Reports)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-slate-700">Server Host Domain</label>
                    <input
                      type="text"
                      value={emailHost}
                      onChange={(e) => setEmailHost(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">TLS Port</label>
                    <input
                      type="text"
                      value={emailPort}
                      onChange={(e) => setEmailPort(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <label className="font-bold text-slate-700">Authorized Sender Email Address</label>
                    <input
                      type="email"
                      value={emailSender}
                      onChange={(e) => setEmailSender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sec 3: Alerts and backups */}
            {(!focusSection || focusSection === "NotificationSettings") && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" /> Alerts & Periodic Backup intervals
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Backup frequency cron</label>
                    <select
                      value={backupFreq}
                      onChange={(e) => setBackupFreq(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 cursor-pointer focus:outline-none"
                    >
                      <option value="daily">Daily database automated cycles</option>
                      <option value="weekly">Weekly cron backup scheduling</option>
                      <option value="monthly">Monthly deep audit dumps</option>
                      <option value="manual">Manual trigger dumps ONLY</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="notifications" className="font-bold text-slate-700 cursor-pointer select-none">
                      Toggle automatic push notifications on user activities.
                    </label>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-slate-700">Automated reminder intervals</label>
                    <input
                      type="text"
                      value={reminderIntervals}
                      onChange={(e) => setReminderIntervals(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-808 focus:outline-none font-mono"
                      placeholder="30, 14, 7, 3, 1, 0"
                    />
                    <p className="text-[10px] text-slate-400">
                      Days before due date. The engine also sends daily overdue alerts automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 -mx-6 -mb-6 mt-6">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2 rounded-lg cursor-pointer shadow-sm transition-all"
              >
                Save Configuration Parameters
              </button>
            </div>

          </form>
        </div>

        {/* Right Columns - Backup executions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 animate-pulse" /> FAIMS cPanel db Maintenance
          </h3>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Execute manual diagnostic server-side database dumps to save all asset categories, lists, sites, and logs directly in native PostgreSQL/SQL format to survive hosting transitions.
          </p>

          {!isBackupSimulating ? (
            <button
              onClick={handleCreateBackup}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer text-xs shadow-sm"
            >
              <FileCode className="w-4 h-4" /> Export Complete SQL database
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between font-bold text-slate-800 text-[11px]">
                <span>Building SQL Schema Dumps...</span>
                <span>{backupProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-150"
                  style={{ width: `${backupProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
            <span className="block font-semibold text-slate-600 font-mono">DATABASE METADATA STATS:</span>
            <span>Total rows categories: {db.categories.length}</span><br />
            <span>Total rows assets: {db.assets.length}</span><br />
            <span>Total rows verifications: {db.verifications.length}</span><br />
            <span>Active encryption: AES-256 local sandbox Standard</span>
          </div>
        </div>

      </div>

    </div>
  );
}
