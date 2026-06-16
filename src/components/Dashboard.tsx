/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCheck2,
  Users,
  Wrench
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getDatabaseState, formatCurrency, formatDate } from "../db";
import { AssetStatus, User, UserRole } from "../types";

interface DashboardProps {
  onNavigate: (tab: string) => void;
  userRole: UserRole;
  onSelectAsset: (assetId: string) => void;
  currentUser: User;
  onUpdateCurrentUser: (updated: User) => void;
  subTab?: string;
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0f766e"];

type Kpi = {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  tone: string;
};

type QuickAction = {
  label: string;
  detail: string;
  tab: string;
  icon: React.ElementType;
  roles: UserRole[];
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Add Asset",
    detail: "Register a new fixed asset",
    tab: "Assets",
    icon: Package,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER]
  },
  {
    label: "Add Client",
    detail: "Create a client profile",
    tab: "Clients",
    icon: Building2,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER]
  },
  {
    label: "Open Asset Portfolio",
    detail: "Review the current asset register",
    tab: "Assets",
    icon: Package,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE]
  },
  {
    label: "Start Verification",
    detail: "Inspect physical assets and reconcile status",
    tab: "Verification",
    icon: ClipboardCheck,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR]
  },
  {
    label: "Manage Transfers",
    detail: "Review movement and relocation requests",
    tab: "Transfers",
    icon: ArrowRightLeft,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR]
  },
  {
    label: "Repairs Queue",
    detail: "Open maintenance and service activity",
    tab: "Maintenance",
    icon: Wrench,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE]
  },
  {
    label: "Report Center",
    detail: "Compile analytics and audit reports",
    tab: "Reporting",
    icon: FileText,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR]
  },
  {
    label: "My Account",
    detail: "Manage profile, sessions, and preferences",
    tab: "Profile",
    icon: UserCheck2,
    roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE]
  }
];

export default function Dashboard({ onNavigate, userRole, onSelectAsset, currentUser, subTab }: DashboardProps) {
  const [db, setDb] = useState(getDatabaseState());

  useEffect(() => {
    const refresh = () => setDb(getDatabaseState());
    window.addEventListener("faims_db_synced", refresh);
    window.addEventListener("faims_offline_buffer_updated", refresh);
    return () => {
      window.removeEventListener("faims_db_synced", refresh);
      window.removeEventListener("faims_offline_buffer_updated", refresh);
    };
  }, []);

  const roleAssets = useMemo(() => {
    if (userRole === UserRole.EMPLOYEE) {
      return db.assets.filter(asset => asset.assignedUserId === currentUser.id);
    }
    if (userRole === UserRole.DEPT_MANAGER) {
      return db.assets.filter(asset => asset.departmentId === currentUser.departmentId);
    }
    return db.assets;
  }, [currentUser.departmentId, currentUser.id, db.assets, userRole]);

  const roleAssignments = useMemo(() => {
    if (userRole === UserRole.EMPLOYEE) {
      return db.assignments.filter(assignment => assignment.userId === currentUser.id);
    }
    if (userRole === UserRole.DEPT_MANAGER) {
      return db.assignments.filter(assignment => assignment.departmentId === currentUser.departmentId);
    }
    return db.assignments;
  }, [currentUser.departmentId, currentUser.id, db.assignments, userRole]);

  const roleTransfers = useMemo(() => {
    if (userRole === UserRole.DEPT_MANAGER) {
      return db.transfers.filter(
        transfer =>
          transfer.sourceDepartmentId === currentUser.departmentId ||
          transfer.destDepartmentId === currentUser.departmentId
      );
    }
    return db.transfers;
  }, [currentUser.departmentId, db.transfers, userRole]);

  const assetValue = roleAssets.reduce((sum, asset) => sum + asset.purchaseCost, 0);
  const activeAssets = roleAssets.filter(asset => asset.status === AssetStatus.ACTIVE).length;
  const maintenanceAssets = roleAssets.filter(asset => asset.status === AssetStatus.UNDER_MAINTENANCE).length;
  const damagedAssets = roleAssets.filter(asset => asset.status === AssetStatus.DAMAGED).length;
  const disposedAssets = roleAssets.filter(asset => asset.status === AssetStatus.DISPOSED).length;
  const verifiedAssetIds = new Set(db.verifications.map(record => record.assetId));
  const pendingVerification = roleAssets.filter(asset => !verifiedAssetIds.has(asset.id)).length;
  const pendingTransfers = roleTransfers.filter(transfer => transfer.status === "Pending Approval").length;
  const openMaintenance = db.maintenance.filter(record => record.status === "Pending" || record.status === "In Progress").length;
  const assignedToMe = db.assets.filter(asset => asset.assignedUserId === currentUser.id).length;
  const activeSessions = db.users.reduce((sum, user) => sum + (user.activeSessions?.length || 0), 0);
  const unreadSecurityEvents = db.auditLogs.filter(log => /security|password|credential|login/i.test(`${log.action} ${log.details}`)).length;
  const visibleNotifications = db.notifications.filter(notification => notification.userId === "all" || notification.userId === currentUser.id);
  const unreadNotifications = visibleNotifications.filter(notification => !notification.isRead).length;
  const completedMaintenance = db.maintenance.filter(record => record.status === "Completed").length;
  const openMaintenanceForRole = db.maintenance.filter(record =>
    (record.status === "Pending" || record.status === "In Progress") &&
    roleAssets.some(asset => asset.id === record.assetId)
  ).length;
  const completedVerifications = db.verifications.length;
  const verificationRate = roleAssets.length ? Math.round(((roleAssets.length - pendingVerification) / roleAssets.length) * 100) : 0;
  const clientSummaries = useMemo(() => {
    return db.clients.map(client => {
      const assets = db.assets.filter(asset => asset.clientId === client.id);
      return {
        client,
        count: assets.length,
        value: assets.reduce((sum, asset) => sum + asset.purchaseCost, 0)
      };
    });
  }, [db.assets, db.clients]);
  const clientAssetValue = clientSummaries.reduce((sum, item) => sum + item.value, 0);
  const newClientsThisMonth = useMemo(() => {
    const now = new Date();
    return db.clients.filter(client => {
      const registered = new Date(client.registrationDate);
      return registered.getMonth() === now.getMonth() && registered.getFullYear() === now.getFullYear();
    }).length;
  }, [db.clients]);
  const roleDistribution = Object.values(UserRole).map(role => ({
    role,
    count: db.users.filter(user => user.role === role).length
  }));
  const transferStats = {
    total: roleTransfers.length,
    pending: pendingTransfers,
    approved: roleTransfers.filter(transfer => transfer.status === "Approved").length,
    rejected: roleTransfers.filter(transfer => transfer.status === "Rejected").length
  };

  const enterpriseModules = [
    { label: "Asset Portfolio", detail: `${roleAssets.length} visible assets`, tab: "Assets", icon: Package, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE] },
    { label: "Client Asset Oversight", detail: `${db.clients.length} clients, ${formatCurrency(clientAssetValue)} value`, tab: "Clients", icon: Building2, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.AUDITOR] },
    { label: "Infrastructure Lists", detail: `${db.departments.length} departments, ${db.locations.length} locations`, tab: "BaseModules", icon: Building2, roles: [UserRole.ADMIN] },
    { label: "Asset Assignments", detail: `${roleAssignments.length} handover records`, tab: "Assignments", icon: UserCheck2, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE] },
    { label: "Transfers", detail: `${transferStats.pending} pending of ${transferStats.total}`, tab: "Transfers", icon: ArrowRightLeft, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR] },
    { label: "Repairs & Maintenance", detail: `${openMaintenanceForRole} open service records`, tab: "Maintenance", icon: Wrench, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE] },
    { label: "Physical Verification", detail: `${verificationRate}% role-scope verified`, tab: "Verification", icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR] },
    { label: "Reports & Analytics", detail: `${db.auditLogs.length} audit events available`, tab: "Reporting", icon: FileText, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_MANAGER, UserRole.AUDITOR] },
    { label: "Users & Security", detail: `${db.users.length} users, ${activeSessions} sessions`, tab: "Users", icon: ShieldCheck, roles: [UserRole.ADMIN] },
    { label: "System Settings", detail: `${db.settings.currency || "Currency"} · ${db.settings.timezone || "Timezone"}`, tab: "Settings", icon: Settings, roles: [UserRole.ADMIN] }
  ].filter(module => module.roles.includes(userRole));

  const kpis: Kpi[] = useMemo(() => {
    if (userRole === UserRole.ADMIN) {
      return [
        { label: "System Assets", value: db.assets.length, detail: `${activeAssets} active, ${maintenanceAssets} in repair`, icon: Package, tone: "blue" },
        { label: "Total Clients", value: db.clients.length, detail: `${newClientsThisMonth} new this month`, icon: Building2, tone: "emerald" },
        { label: "Active Clients", value: db.clients.filter(client => client.status === "Active").length, detail: `${db.clients.filter(client => client.status === "Inactive").length} inactive clients`, icon: UserCheck2, tone: "blue" },
        { label: "Client Asset Value", value: formatCurrency(clientAssetValue), detail: "Assets assigned to clients", icon: BarChart3, tone: "violet" },
        { label: "User Accounts", value: db.users.length, detail: `${activeSessions} active sessions`, icon: Users, tone: "amber" },
        { label: "Security Events", value: unreadSecurityEvents, detail: "Credential and access activity", icon: ShieldCheck, tone: "rose" }
      ];
    }
    if (userRole === UserRole.ASSET_MANAGER) {
      return [
        { label: "Lifecycle Assets", value: roleAssets.length, detail: `${disposedAssets} retired records`, icon: Package, tone: "blue" },
        { label: "Open Repairs", value: openMaintenance, detail: `${maintenanceAssets} assets marked in repair`, icon: Wrench, tone: "amber" },
        { label: "Pending Verification", value: pendingVerification, detail: "Assets without latest inspection", icon: ClipboardCheck, tone: "rose" },
        { label: "Assignments", value: roleAssignments.length, detail: "Handover records in register", icon: UserCheck2, tone: "emerald" }
      ];
    }
    if (userRole === UserRole.DEPT_MANAGER) {
      return [
        { label: "Department Assets", value: roleAssets.length, detail: formatCurrency(assetValue), icon: Building2, tone: "blue" },
        { label: "Transfer Requests", value: pendingTransfers, detail: `${roleTransfers.length} department transfer records`, icon: ArrowRightLeft, tone: "amber" },
        { label: "Verification Queue", value: pendingVerification, detail: "Assets needing department attention", icon: ClipboardCheck, tone: "rose" },
        { label: "In Service", value: activeAssets, detail: `${damagedAssets} damaged records`, icon: CheckCircle2, tone: "emerald" }
      ];
    }
    if (userRole === UserRole.AUDITOR) {
      return [
        { label: "Audit Scope", value: roleAssets.length, detail: "Assets visible for read-only review", icon: ClipboardCheck, tone: "blue" },
        { label: "Verified Assets", value: verifiedAssetIds.size, detail: `${pendingVerification} outstanding`, icon: CheckCircle2, tone: "emerald" },
        { label: "Audit Logs", value: db.auditLogs.length, detail: "System activity records", icon: Activity, tone: "violet" },
        { label: "Exceptions", value: damagedAssets + pendingVerification, detail: "Damaged or unverified records", icon: AlertTriangle, tone: "rose" }
      ];
    }
    return [
      { label: "Assigned Assets", value: assignedToMe, detail: "Assets currently allocated to you", icon: UserCheck2, tone: "blue" },
      { label: "Handover History", value: roleAssignments.length, detail: "Checkout and return records", icon: ClipboardCheck, tone: "emerald" },
      { label: "Service Requests", value: db.maintenance.filter(record => roleAssets.some(asset => asset.id === record.assetId)).length, detail: "Maintenance records for your assets", icon: Wrench, tone: "amber" },
      { label: "Profile Sessions", value: currentUser.activeSessions?.length || 0, detail: "Active account sessions", icon: ShieldCheck, tone: "violet" }
    ];
  }, [
    activeAssets,
    activeSessions,
    assetValue,
    assignedToMe,
    currentUser.activeSessions?.length,
    damagedAssets,
    db.assets.length,
    db.auditLogs.length,
    db.clients,
    db.maintenance,
    db.users.length,
    disposedAssets,
    maintenanceAssets,
    openMaintenance,
    pendingTransfers,
    pendingVerification,
    roleAssignments.length,
    roleAssets,
    roleTransfers.length,
    clientAssetValue,
    newClientsThisMonth,
    unreadSecurityEvents,
    userRole,
    verifiedAssetIds.size
  ]);

  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    roleAssets.forEach(asset => {
      const category = db.categories.find(item => item.id === asset.categoryId);
      const key = asset.categoryId || "uncategorized";
      map[key] ||= { name: category?.name || "Uncategorized", value: 0 };
      map[key].value += 1;
    });
    return Object.values(map);
  }, [db.categories, roleAssets]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    roleAssets.forEach(asset => {
      map[asset.status] = (map[asset.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [roleAssets]);

  const departmentValueData = useMemo(() => {
    const map: Record<string, { department: string; value: number; count: number }> = {};
    roleAssets.forEach(asset => {
      const department = db.departments.find(item => item.id === asset.departmentId);
      const key = asset.departmentId || "unassigned";
      map[key] ||= { department: department?.name || "Unassigned", value: 0, count: 0 };
      map[key].value += asset.purchaseCost;
      map[key].count += 1;
    });
    return Object.values(map);
  }, [db.departments, roleAssets]);

  const clientGrowthData = useMemo(() => {
    const buckets: Record<string, number> = {};
    db.clients.forEach(client => {
      const date = new Date(client.registrationDate);
      const label = Number.isNaN(date.getTime()) ? "Unknown" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  }, [db.clients]);

  const recentAssets = useMemo(() => [...roleAssets].reverse().slice(0, 6), [roleAssets]);
  const recentActivity = useMemo(() => db.auditLogs.slice(0, 6), [db.auditLogs]);
  const permittedActions = QUICK_ACTIONS.filter(action => action.roles.includes(userRole));
  const dashboardTitle =
    userRole === UserRole.ADMIN ? "Administrator Dashboard" :
    userRole === UserRole.ASSET_MANAGER ? "Asset Manager Dashboard" :
    userRole === UserRole.DEPT_MANAGER ? "Department Manager Dashboard" :
    userRole === UserRole.AUDITOR ? "Auditor Dashboard" :
    "Employee Dashboard";
  return (
    <div className="erp-dashboard space-y-6">
      <section className="erp-hero">
        <div>
          <div className="erp-eyebrow">
            <LayoutDashboard className="w-4 h-4" />
            {db.settings.orgName || "FAIMS Enterprise Asset Management"}
          </div>
          <h1>{dashboardTitle}</h1>
          <p>
            Live EAM workspace for {currentUser.name}. Metrics are calculated from the current FAIMS database state and filtered to your role access.
          </p>
        </div>
        <div className="erp-hero-meta">
          <span>{userRole}</span>
          <strong>{roleAssets.length}</strong>
          <small>visible assets</small>
        </div>
      </section>

      {/* Subtab conditional rendering */}
      {(!subTab || subTab === "EnterpriseOverview") && (
        <>
          <section className="erp-panel">
            <div className="erp-panel-header">
              <div>
                <h2>Enterprise Module Map</h2>
                <p>Role-permitted FAIMS work areas with live operating counts from the current data store.</p>
              </div>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="erp-quick-actions">
              {enterpriseModules.map(module => {
                const Icon = module.icon;
                return (
                  <button key={module.label} type="button" onClick={() => onNavigate(module.tab)} className="erp-action-tile">
                    <span><Icon className="w-4 h-4" /></span>
                    <div>
                      <strong>{module.label}</strong>
                      <small>{module.detail}</small>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-4 gap-5">
            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Transfer Statistics</h2>
                  <p>Movement requests in your access scope.</p>
                </div>
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                <div><span>Total transfers</span><strong>{transferStats.total}</strong></div>
                <div><span>Pending approval</span><strong>{transferStats.pending}</strong></div>
                <div><span>Approved</span><strong>{transferStats.approved}</strong></div>
                <div><span>Rejected</span><strong>{transferStats.rejected}</strong></div>
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Maintenance Statistics</h2>
                  <p>Repair and preventive service workload.</p>
                </div>
                <Wrench className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                <div><span>Open service records</span><strong>{openMaintenanceForRole}</strong></div>
                <div><span>Completed service records</span><strong>{completedMaintenance}</strong></div>
                <div><span>Assets in repair</span><strong>{maintenanceAssets}</strong></div>
                <div><span>Damaged assets</span><strong>{damagedAssets}</strong></div>
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Verification Status</h2>
                  <p>Physical audit completion from verification records.</p>
                </div>
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                <div><span>Verification rate</span><strong>{verificationRate}%</strong></div>
                <div><span>Completed records</span><strong>{completedVerifications}</strong></div>
                <div><span>Pending in scope</span><strong>{pendingVerification}</strong></div>
                <div><span>Visible assets</span><strong>{roleAssets.length}</strong></div>
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>System Health</h2>
                  <p>Security, notification, and session indicators.</p>
                </div>
                <Bell className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                <div><span>Security alerts</span><strong>{unreadSecurityEvents}</strong></div>
                <div><span>Unread notifications</span><strong>{unreadNotifications}</strong></div>
                <div><span>Active sessions</span><strong>{activeSessions}</strong></div>
                <div><span>Audit trail events</span><strong>{db.auditLogs.length}</strong></div>
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <article className="erp-panel xl:col-span-2">
              <div className="erp-panel-header">
                <div>
                  <h2>Portfolio Distribution</h2>
                  <p>Asset value by department or visible operating unit.</p>
                </div>
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="h-72">
                {departmentValueData.length === 0 ? (
                  <div className="erp-empty">No asset valuation data is available for your role.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentValueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="department" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Value"]} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Asset Categories</h2>
                  <p>Visible asset mix by registered category.</p>
                </div>
                <Package className="w-5 h-5" />
              </div>
              <div className="h-72">
                {categoryData.length === 0 ? (
                  <div className="erp-empty">No category data is available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={88} innerRadius={48} paddingAngle={3}>
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} assets`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>
          </section>

          {userRole === UserRole.ADMIN && (
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <article className="erp-panel xl:col-span-2">
                <div className="erp-panel-header">
                  <div>
                    <h2>Assets per Client</h2>
                    <p>Client asset count and value distribution.</p>
                  </div>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientSummaries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="client.code" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                      <Tooltip formatter={(value, name) => [name === "value" ? formatCurrency(Number(value)) : value, name === "value" ? "Asset Value" : "Assets"]} />
                      <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="erp-panel">
                <div className="erp-panel-header">
                  <div>
                    <h2>Top Client Rankings</h2>
                    <p>By asset count and asset value.</p>
                  </div>
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="erp-workspace-list">
                  {[...clientSummaries].sort((a, b) => b.count - a.count).slice(0, 3).map(item => (
                    <div key={`count-${item.client.id}`}><span>{item.client.name}</span><strong>{item.count} assets</strong></div>
                  ))}
                  {[...clientSummaries].sort((a, b) => b.value - a.value).slice(0, 3).map(item => (
                    <div key={`value-${item.client.id}`}><span>{item.client.name}</span><strong>{formatCurrency(item.value)}</strong></div>
                  ))}
                </div>
              </article>

              <article className="erp-panel xl:col-span-3">
                <div className="erp-panel-header">
                  <div>
                    <h2>Client Growth Trend</h2>
                    <p>Registered clients by month from the client registry.</p>
                  </div>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>
          )}

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Status Summary</h2>
                  <p>Operational asset state by count.</p>
                </div>
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-3">
                {statusData.length === 0 ? (
                  <div className="erp-empty">No status records are available.</div>
                ) : (
                  statusData.map(item => {
                    const pct = roleAssets.length ? Math.round((item.count / roleAssets.length) * 100) : 0;
                    return (
                      <div key={item.status} className="erp-progress-row">
                        <div>
                          <span>{item.status}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="erp-progress-track"><span style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            <article className="erp-panel xl:col-span-2">
              <div className="erp-panel-header">
                <div>
                  <h2>Recent Asset Activity</h2>
                  <p>Latest visible assets from the asset portfolio.</p>
                </div>
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Tag</th>
                      <th>Status</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssets.length === 0 ? (
                      <tr><td colSpan={5}>No assets are available for this dashboard.</td></tr>
                    ) : (
                      recentAssets.map(asset => (
                        <tr key={asset.id}>
                          <td>
                            <strong>{asset.name}</strong>
                            <small>{db.departments.find(item => item.id === asset.departmentId)?.name || "Unassigned"}</small>
                          </td>
                          <td>{asset.assetTag}</td>
                          <td><span className="erp-status">{asset.status}</span></td>
                          <td>{formatCurrency(asset.purchaseCost)}</td>
                          <td>
                            <button type="button" onClick={() => onSelectAsset(asset.id)} className="erp-link-button">
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}

      {subTab === "PersonalOverview" && (
        <>
          <section className="erp-quick-actions" aria-label="Dashboard quick actions">
            {permittedActions.map(action => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" onClick={() => onNavigate(action.tab)} className="erp-action-tile">
                  <span><Icon className="w-4 h-4" /></span>
                  <div>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              );
            })}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <article className="erp-panel lg:col-span-2">
              <div className="erp-panel-header">
                <div>
                  <h2>Recent Assigned Assets</h2>
                  <p>Latest assets allocated to you or in your scope.</p>
                </div>
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Tag</th>
                      <th>Status</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssets.length === 0 ? (
                      <tr><td colSpan={5}>No assets are available.</td></tr>
                    ) : (
                      recentAssets.slice(0, 4).map(asset => (
                        <tr key={asset.id}>
                          <td>
                            <strong>{asset.name}</strong>
                            <small>{db.departments.find(item => item.id === asset.departmentId)?.name || "Unassigned"}</small>
                          </td>
                          <td>{asset.assetTag}</td>
                          <td><span className="erp-status">{asset.status}</span></td>
                          <td>{formatCurrency(asset.purchaseCost)}</td>
                          <td>
                            <button type="button" onClick={() => onSelectAsset(asset.id)} className="erp-link-button">
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Role Workspace Information</h2>
                  <p>Access scope details.</p>
                </div>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                <div><span>Email Portal Axis</span><strong>{currentUser.email}</strong></div>
                <div><span>Role Level</span><strong>{userRole}</strong></div>
                <div><span>Last Login Time</span><strong>{currentUser.lastLogin ? formatDate(currentUser.lastLogin) : "Current session"}</strong></div>
                <div><span>Sessions Count</span><strong>{currentUser.activeSessions?.length || 0} sessions</strong></div>
              </div>
            </article>
          </section>
        </>
      )}

      {subTab === "ActivitySummary" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <article className="erp-panel">
            <div className="erp-panel-header">
              <div>
                <h2>Audit & Event Ledger</h2>
                <p>System-wide operational events.</p>
              </div>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="erp-feed">
              {recentActivity.length === 0 ? (
                <div className="erp-empty">No audit activity has been recorded.</div>
              ) : (
                recentActivity.map(log => (
                  <div key={log.id} className="erp-feed-item">
                    <span>{log.userName.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong>{log.action}</strong>
                      <p>{log.details}</p>
                      <small>{formatDate(log.timestamp)} · {log.ipAddress}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="erp-panel">
            <div className="erp-panel-header">
              <div>
                <h2>System Notifications</h2>
                <p>Latest alerts for your account.</p>
              </div>
              <Bell className="w-5 h-5" />
            </div>
            <div className="erp-feed">
              {visibleNotifications.length === 0 ? (
                <div className="erp-empty">No notifications are available.</div>
              ) : (
                visibleNotifications.slice(0, 10).map(notification => (
                  <div key={notification.id} className="erp-feed-item">
                    <span>{notification.type.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{notification.isRead ? "Read" : "Unread"} · {formatDate(notification.createdAt)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      )}

      {subTab === "KPIWidgets" && (
        <>
          <section className="erp-kpi-grid" aria-label="Role specific KPI widgets">
            {kpis.map(kpi => {
              const Icon = kpi.icon;
              return (
                <article key={kpi.label} className={`erp-kpi erp-kpi-${kpi.tone}`}>
                  <div>
                    <span>{kpi.label}</span>
                    <strong>{kpi.value}</strong>
                    <small>{kpi.detail}</small>
                  </div>
                  <Icon className="w-6 h-6" />
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>FAIMS Security Model</h2>
                  <p>User account configuration counts.</p>
                </div>
                <Users className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                {roleDistribution.map(item => (
                  <div key={item.role}><span>{item.role}</span><strong>{item.count}</strong></div>
                ))}
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div>
                  <h2>Core Security Indicators</h2>
                  <p>Security logging variables.</p>
                </div>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="erp-workspace-list">
                <div><span>Security alerts flag</span><strong>{unreadSecurityEvents} unread</strong></div>
                <div><span>Total logs events</span><strong>{db.auditLogs.length} entries</strong></div>
                <div><span>Current session IP</span><strong>192.168.10.12 (secure)</strong></div>
                <div><span>Active sessions</span><strong>{activeSessions} logged in</strong></div>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
