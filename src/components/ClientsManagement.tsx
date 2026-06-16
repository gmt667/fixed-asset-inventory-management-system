/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  Building2,
  Download,
  Edit2,
  FileText,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck2,
  UserPlus,
  Wrench,
  X
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
import { addAuditRecord, formatCurrency, formatDate, getDatabaseState, saveDatabaseState, triggerNotification } from "../db";
import { Asset, AssetStatus, Client, UserRole, MALAWI_CLIENT_TYPES, MALAWI_DISTRICTS, MALAWI_REGIONS, MalawiRegion } from "../types";
import { can } from "../permissions";

interface ClientsManagementProps {
  userRole: UserRole;
  currentUserId: string;
  initialView?: "Dashboard" | "Profiles" | "Portfolio" | "Reports";
}

type ClientView = "Dashboard" | "Profiles" | "Portfolio" | "Reports";
type ClientForm = Omit<Client, "id">;

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0f766e"];

const emptyClientForm = (): ClientForm => ({
  name: "",
  code: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  organizationType: "Private Company",
  region: "Central Region",
  district: "Lilongwe",
  postalAddress: "",
  registrationNumber: "",
  tinNumber: "",
  registrationDate: new Date().toISOString().split("T")[0],
  status: "Active",
  departmentId: ""
});

export default function ClientsManagement({ userRole, currentUserId, initialView = "Dashboard" }: ClientsManagementProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [activeView, setActiveView] = useState<ClientView>(initialView);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [assetToAssign, setAssetToAssign] = useState("");

  const canAccess = can(userRole, "client:view");
  const canManage = can(userRole, "client:create") || can(userRole, "client:edit");
  const canDeleteClient = can(userRole, "client:delete");

  const refreshDb = () => setDb(getDatabaseState());

  const generateClientCode = (clients: Client[]) => {
    let index = clients.length + 1;
    let candidate = `CLI-MWI-${String(index).padStart(4, "0")}`;
    while (clients.some(client => client.code.toLowerCase() === candidate.toLowerCase())) {
      index += 1;
      candidate = `CLI-MWI-${String(index).padStart(4, "0")}`;
    }
    return candidate;
  };

  const scopedClients = useMemo(() => db.clients, [db.clients]);
  const scopedClientIds = useMemo(() => new Set(scopedClients.map(client => client.id)), [scopedClients]);
  const scopedAssets = useMemo(() => {
    return db.assets.filter(asset => asset.clientId && scopedClientIds.has(asset.clientId));
  }, [db.assets, scopedClientIds]);
  const verifiedAssetIds = useMemo(() => new Set(db.verifications.map(record => record.assetId)), [db.verifications]);

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return scopedClients.filter(client => {
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesQuery =
        !normalized ||
        client.name.toLowerCase().includes(normalized) ||
        client.code.toLowerCase().includes(normalized) ||
        client.contactPerson.toLowerCase().includes(normalized) ||
        client.email.toLowerCase().includes(normalized) ||
        (client.district || "").toLowerCase().includes(normalized) ||
        (client.region || "").toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [query, scopedClients, statusFilter]);

  const selectedClient = useMemo(() => {
    return scopedClients.find(client => client.id === selectedClientId) || filteredClients[0] || scopedClients[0] || null;
  }, [filteredClients, scopedClients, selectedClientId]);

  const clientAssets = (client: Client | null): Asset[] => {
    if (!client) return [];
    return db.assets.filter(asset => asset.clientId === client.id);
  };

  const stats = useMemo(() => {
    return {
      totalClients: scopedClients.length,
      activeClients: scopedClients.filter(client => client.status === "Active").length,
      inactiveClients: scopedClients.filter(client => client.status === "Inactive").length,
      totalAssets: scopedAssets.length,
      totalAssetValue: scopedAssets.reduce((sum, asset) => sum + asset.purchaseCost, 0),
      underMaintenance: scopedAssets.filter(asset => asset.status === AssetStatus.UNDER_MAINTENANCE).length,
      pendingVerification: scopedAssets.filter(asset => !verifiedAssetIds.has(asset.id)).length
    };
  }, [scopedAssets, scopedClients, verifiedAssetIds]);

  const clientSummaries = useMemo(() => {
    return scopedClients.map(client => {
      const assets = clientAssets(client);
      const assetIds = new Set(assets.map(asset => asset.id));
      return {
        client,
        count: assets.length,
        value: assets.reduce((sum, asset) => sum + asset.purchaseCost, 0),
        maintenance: db.maintenance.filter(record => assetIds.has(record.assetId)).length,
        transfers: db.transfers.filter(record => assetIds.has(record.assetId)).length,
        verifications: db.verifications.filter(record => assetIds.has(record.assetId)).length,
        disposals: db.disposals.filter(record => assetIds.has(record.assetId)).length
      };
    });
  }, [db.assets, db.disposals, db.maintenance, db.transfers, db.verifications, scopedClients]);

  const selectedAssets = clientAssets(selectedClient);
  const selectedAssetIds = useMemo(() => new Set(selectedAssets.map(asset => asset.id)), [selectedAssets]);
  const categoryData = db.categories.map(category => ({
    name: category.name,
    value: selectedAssets.filter(asset => asset.categoryId === category.id).length
  })).filter(item => item.value > 0);
  const locationData = db.locations.map(location => ({
    name: location.name,
    value: selectedAssets.filter(asset => asset.locationId === location.id).length
  })).filter(item => item.value > 0);
  const statusData = Object.values(AssetStatus).map(status => ({
    name: status,
    value: selectedAssets.filter(asset => asset.status === status).length
  })).filter(item => item.value > 0);

  const activityRows = useMemo(() => {
    const sourceAssetIds = selectedClient ? selectedAssetIds : new Set(scopedAssets.map(asset => asset.id));
    const assetName = (assetId: string) => db.assets.find(asset => asset.id === assetId)?.name || "Unknown asset";
    const clientName = (assetId: string) => {
      const asset = db.assets.find(item => item.id === assetId);
      return db.clients.find(client => client.id === asset?.clientId)?.name || "Unassigned client";
    };
    return [
      ...db.assignments.filter(item => sourceAssetIds.has(item.assetId)).map(item => ({ date: item.assignedDate, type: "Assignment", title: assetName(item.assetId), client: clientName(item.assetId), detail: item.remarks || item.status })),
      ...db.transfers.filter(item => sourceAssetIds.has(item.assetId)).map(item => ({ date: item.transferDate, type: "Transfer", title: assetName(item.assetId), client: clientName(item.assetId), detail: item.remarks || item.status })),
      ...db.maintenance.filter(item => sourceAssetIds.has(item.assetId)).map(item => ({ date: item.maintenanceDate, type: "Maintenance", title: assetName(item.assetId), client: clientName(item.assetId), detail: item.notes || item.status })),
      ...db.verifications.filter(item => sourceAssetIds.has(item.assetId)).map(item => ({ date: item.verificationDate, type: "Verification", title: assetName(item.assetId), client: clientName(item.assetId), detail: item.notes || item.result })),
      ...db.disposals.filter(item => sourceAssetIds.has(item.assetId)).map(item => ({ date: item.disposalDate, type: "Disposal", title: assetName(item.assetId), client: clientName(item.assetId), detail: item.reason || item.method }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db, scopedAssets, selectedAssetIds, selectedClient]);

  const availableAssetsForAssignment = useMemo(() => {
    return db.assets.filter(asset => !selectedClient || asset.clientId !== selectedClient.id);
  }, [db.assets, selectedClient]);

  const openCreateClient = () => {
    if (!can(userRole, "client:create")) return;
    setEditingClientId(null);
    setClientForm({ ...emptyClientForm(), code: generateClientCode(db.clients) });
    setIsClientModalOpen(true);
  };

  const openEditClient = (client: Client) => {
    if (!can(userRole, "client:edit")) return;
    setEditingClientId(client.id);
    setClientForm({
      name: client.name,
      code: client.code,
      contactPerson: client.contactPerson,
      phone: client.phone,
      email: client.email,
      address: client.address,
      organizationType: client.organizationType,
      region: client.region || "Central Region",
      district: client.district || "Lilongwe",
      postalAddress: client.postalAddress || "",
      registrationNumber: client.registrationNumber || "",
      tinNumber: client.tinNumber || "",
      registrationDate: client.registrationDate,
      status: client.status,
      departmentId: client.departmentId || ""
    });
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (event: React.FormEvent) => {
    event.preventDefault();
    const isEdit = Boolean(editingClientId);
    if (isEdit && !can(userRole, "client:edit")) return;
    if (!isEdit && !can(userRole, "client:create")) return;
    if (!clientForm.name.trim() || !clientForm.code.trim() || !clientForm.contactPerson.trim()) {
      alert("Client name, code, and contact person are required.");
      return;
    }

    const currentDB = getDatabaseState();
    const duplicate = currentDB.clients.find(client =>
      client.id !== editingClientId &&
      (
        client.name.trim().toLowerCase() === clientForm.name.trim().toLowerCase() ||
        (!!clientForm.phone.trim() && client.phone.trim().toLowerCase() === clientForm.phone.trim().toLowerCase()) ||
        (!!clientForm.email.trim() && client.email.trim().toLowerCase() === clientForm.email.trim().toLowerCase())
      )
    );
    if (duplicate) {
      alert(`A matching client already exists: ${duplicate.name}. Check client name, phone number, or email address.`);
      return;
    }
    if (editingClientId) {
      const index = currentDB.clients.findIndex(client => client.id === editingClientId);
      if (index === -1) return;
      currentDB.clients[index] = { ...currentDB.clients[index], ...clientForm, departmentId: clientForm.departmentId || undefined };
      saveDatabaseState(currentDB);
      addAuditRecord(currentUserId, userRole, "Client Updated", `Updated client profile ${clientForm.code} (${clientForm.name})`);
    } else {
      const newClient: Client = {
        id: `cli-${Date.now()}`,
        ...clientForm,
        departmentId: clientForm.departmentId || undefined
      };
      currentDB.clients.unshift(newClient);
      saveDatabaseState(currentDB);
      addAuditRecord(currentUserId, userRole, "Client Created", `Created client profile ${newClient.code} (${newClient.name})`);
      setSelectedClientId(newClient.id);
    }

    triggerNotification("all", "Client Registry Updated", `Client ${clientForm.name} was saved successfully.`, "success");
    setIsClientModalOpen(false);
    refreshDb();
  };

  const handleArchiveClient = (client: Client) => {
    if (!can(userRole, "client:archive")) return;
    const currentDB = getDatabaseState();
    const target = currentDB.clients.find(item => item.id === client.id);
    if (!target) return;
    target.status = "Inactive";
    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "Client Archived", `Archived client ${client.code} (${client.name})`);
    refreshDb();
  };

  const handleDeleteClient = (client: Client) => {
    if (!canDeleteClient) return;
    if (!confirm(`Permanently delete client ${client.name}? Assigned assets will be unlinked from this client.`)) return;
    const currentDB = getDatabaseState();
    currentDB.clients = currentDB.clients.filter(item => item.id !== client.id);
    currentDB.assets = currentDB.assets.map(asset => asset.clientId === client.id ? { ...asset, clientId: undefined } : asset);
    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "Client Deleted", `Permanently deleted client ${client.code} (${client.name})`);
    setSelectedClientId(null);
    refreshDb();
  };

  const handleAssignAsset = () => {
    if (!selectedClient || !assetToAssign || !can(userRole, "client:edit")) return;
    const currentDB = getDatabaseState();
    const asset = currentDB.assets.find(item => item.id === assetToAssign);
    if (!asset) return;
    asset.clientId = selectedClient.id;
    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "Asset Assigned to Client", `Assigned asset ${asset.assetTag} (${asset.name}) to client ${selectedClient.code}`);
    setAssetToAssign("");
    refreshDb();
  };

  const exportCSV = (scope: "clients" | "assets" | "activity") => {
    const rows: string[][] = [];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    if (scope === "clients") {
      rows.push(["Client Code", "Client Name", "Client Type", "Contact Person", "Phone", "Email", "District", "Region", "Physical Address", "Postal Address", "Registration Number", "TIN Number", "Status", "Registration Date", "Assets", "Asset Value (MWK)"]);
      clientSummaries.forEach(item => rows.push([
        item.client.code,
        item.client.name,
        item.client.organizationType,
        item.client.contactPerson,
        item.client.phone,
        item.client.email,
        item.client.district || "",
        item.client.region || "",
        item.client.address,
        item.client.postalAddress || "",
        item.client.registrationNumber || "",
        item.client.tinNumber || "",
        item.client.status,
        item.client.registrationDate,
        String(item.count),
        String(item.value)
      ]));
    } else if (scope === "assets") {
      rows.push(["Client", "District", "Region", "Asset Tag", "Asset Name", "Category", "Location", "Status", "Condition", "Asset Value (MWK)"]);
      selectedAssets.forEach(asset => rows.push([
        selectedClient?.name || "",
        selectedClient?.district || "",
        selectedClient?.region || "",
        asset.assetTag,
        asset.name,
        db.categories.find(category => category.id === asset.categoryId)?.name || "",
        db.locations.find(location => location.id === asset.locationId)?.name || "",
        asset.status,
        asset.condition,
        String(asset.purchaseCost)
      ]));
    } else {
      rows.push(["Client", "Date", "Activity Type", "Asset", "Details"]);
      activityRows.forEach(row => rows.push([row.client, row.date, row.type, row.title, row.detail]));
    }
    const csv = rows.map(row => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `FAIMS_Client_${scope}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (!canAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Client Access Restricted</h2>
        <p className="text-xs text-slate-500">Your role does not have permission to view client records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="erp-hero">
        <div>
          <div className="erp-eyebrow"><Building2 className="w-4 h-4" /> Client Management</div>
          <h1>Clients</h1>
          <p>Customer and organization asset control with live client value, custody, maintenance, verification, transfer, and activity visibility.</p>
        </div>
        <div className="erp-hero-meta">
          <span>{canManage ? "Manage" : "Read only"}</span>
          <strong>{stats.totalClients}</strong>
          <small>visible clients</small>
        </div>
      </section>

      <section className="erp-quick-actions">
        {(["Dashboard", "Profiles", "Portfolio", "Reports"] as const).map(view => (
          <button key={view} type="button" onClick={() => setActiveView(view)} className={`erp-action-tile ${activeView === view ? "ring-2 ring-blue-500/30 bg-blue-600/5" : ""}`}>
            <span>{view === "Dashboard" ? <BarChart3 className="w-4 h-4" /> : view === "Profiles" ? <UserCheck2 className="w-4 h-4" /> : view === "Portfolio" ? <Package className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</span>
            <div><strong>{view === "Profiles" ? "Client Profiles" : view === "Portfolio" ? "Client Asset Portfolio" : view === "Reports" ? "Client Reports" : "Client Dashboard"}</strong><small>Live data from the FAIMS database</small></div>
          </button>
        ))}
        {can(userRole, "client:create") && (
          <button type="button" onClick={openCreateClient} className="erp-action-tile">
            <span><Plus className="w-4 h-4" /></span>
            <div><strong>Add Client</strong><small>Create a database-backed client profile</small></div>
          </button>
        )}
      </section>

      {(activeView === "Dashboard" || activeView === "Reports") && (
        <>
          <section className="erp-kpi-grid">
            {[
              ["Total Clients", stats.totalClients, Building2],
              ["Active Clients", stats.activeClients, UserCheck2],
              ["Inactive Clients", stats.inactiveClients, ShieldCheck],
              ["Total Client Assets", stats.totalAssets, Package],
              ["Total Client Asset Value", formatCurrency(stats.totalAssetValue), BarChart3],
              ["Assets Under Maintenance", stats.underMaintenance, Wrench],
              ["Pending Verifications", stats.pendingVerification, Activity]
            ].map(([label, value, Icon]) => {
              const CardIcon = Icon as React.ElementType;
              return (
                <article key={String(label)} className="erp-kpi erp-kpi-blue">
                  <div><span>{label}</span><strong>{value}</strong><small>Calculated from client-linked database records</small></div>
                  <CardIcon className="w-6 h-6" />
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <article className="erp-panel xl:col-span-2">
              <div className="erp-panel-header">
                <div><h2>Assets Per Client</h2><p>Count and acquisition value by client.</p></div>
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientSummaries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="client.code" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value, name) => [name === "value" ? formatCurrency(Number(value)) : value, name === "value" ? "Asset Value" : "Assets"]} />
                    <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="erp-panel">
              <div className="erp-panel-header">
                <div><h2>Recent Client Activities</h2><p>Latest database events for client-linked assets.</p></div>
                <Activity className="w-5 h-5" />
              </div>
              <div className="erp-feed">
                {activityRows.length === 0 ? <div className="erp-empty">No client activity has been recorded.</div> : activityRows.slice(0, 7).map((row, index) => (
                  <div key={`${row.type}-${row.date}-${index}`} className="erp-feed-item">
                    <span>{row.type.slice(0, 2).toUpperCase()}</span>
                    <div><strong>{row.client}</strong><p>{row.title}</p><small>{row.type} - {formatDate(row.date)}</small></div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}

      {(activeView === "Profiles" || activeView === "Dashboard" || activeView === "Reports") && (
        <section className="erp-panel">
          <div className="erp-panel-header">
            <div><h2>Client Directory</h2><p>Search, filter, select, and inspect client profiles.</p></div>
            <button type="button" onClick={() => exportCSV("clients")} className="erp-link-button inline-flex items-center gap-1"><Download className="w-4 h-4" /> Export</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none" placeholder="Search clients, codes, contact persons, or email..." />
            </div>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select value={viewMode} onChange={event => setViewMode(event.target.value as "grid" | "table")} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
              <option value="grid">Grid View</option>
              <option value="table">Table View</option>
            </select>
          </div>

          {viewMode === "grid" ? (
            <div className="erp-quick-actions">
              {filteredClients.map(client => {
                const summary = clientSummaries.find(item => item.client.id === client.id);
                return (
                  <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className={`erp-action-tile ${selectedClient?.id === client.id ? "ring-2 ring-blue-500/30 bg-blue-600/5" : ""}`}>
                    <span><Building2 className="w-4 h-4" /></span>
                    <div><strong>{client.name}</strong><small>{client.code} - {summary?.count || 0} assets - {formatCurrency(summary?.value || 0)}</small></div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead><tr><th>Client</th><th>Status</th><th>Assets</th><th>Value</th><th>Maintenance</th><th>Transfers</th></tr></thead>
                <tbody>
                  {filteredClients.map(client => {
                    const summary = clientSummaries.find(item => item.client.id === client.id);
                    return (
                      <tr key={client.id} onClick={() => setSelectedClientId(client.id)} className="cursor-pointer">
                        <td><strong>{client.name}</strong><small>{client.code}</small></td>
                        <td><span className="erp-status">{client.status}</span></td>
                        <td>{summary?.count || 0}</td>
                        <td>{formatCurrency(summary?.value || 0)}</td>
                        <td>{summary?.maintenance || 0}</td>
                        <td>{summary?.transfers || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedClient && (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {(activeView === "Profiles" || activeView === "Dashboard") && (
            <article className="erp-panel">
              <div className="erp-panel-header">
                <div><h2>Client Profile</h2><p>{selectedClient.code}</p></div>
                <div className="flex gap-1">
                  {can(userRole, "client:edit") && <button type="button" onClick={() => openEditClient(selectedClient)} className="erp-link-button"><Edit2 className="w-4 h-4" /></button>}
                  {can(userRole, "client:archive") && <button type="button" onClick={() => handleArchiveClient(selectedClient)} className="erp-link-button"><Archive className="w-4 h-4" /></button>}
                  {canDeleteClient && <button type="button" onClick={() => handleDeleteClient(selectedClient)} className="erp-link-button text-rose-700"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="erp-workspace-list">
                <div><span>Client Name / Organization Name</span><strong>{selectedClient.name}</strong></div>
                <div><span>Client Code</span><strong>{selectedClient.code}</strong></div>
                <div><span>Client Type</span><strong>{selectedClient.organizationType}</strong></div>
                <div><span>Contact Person</span><strong>{selectedClient.contactPerson}</strong></div>
                <div><span>Phone Number</span><strong>{selectedClient.phone}</strong></div>
                <div><span>Email Address</span><strong>{selectedClient.email}</strong></div>
                <div><span>District</span><strong>{selectedClient.district || "N/A"}</strong></div>
                <div><span>Region</span><strong>{selectedClient.region || "N/A"}</strong></div>
                <div><span>Physical Address</span><strong>{selectedClient.address}</strong></div>
                <div><span>Postal Address</span><strong>{selectedClient.postalAddress || "N/A"}</strong></div>
                <div><span>Registration Number</span><strong>{selectedClient.registrationNumber || "Optional"}</strong></div>
                <div><span>TIN Number</span><strong>{selectedClient.tinNumber || "Optional"}</strong></div>
                <div><span>Status</span><strong>{selectedClient.status}</strong></div>
                <div><span>Registration Date</span><strong>{formatDate(selectedClient.registrationDate)}</strong></div>
              </div>
            </article>
          )}

          {(activeView === "Portfolio" || activeView === "Dashboard" || activeView === "Reports") && (
            <article className="erp-panel xl:col-span-2">
              <div className="erp-panel-header">
                <div><h2>Client Asset Portfolio</h2><p>Assets assigned through the asset.clientId relationship.</p></div>
                <button type="button" onClick={() => exportCSV("assets")} className="erp-link-button inline-flex items-center gap-1"><Download className="w-4 h-4" /> Export Assets</button>
              </div>
              {can(userRole, "client:edit") && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mb-4">
                  <select value={assetToAssign} onChange={event => setAssetToAssign(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <option value="">Select asset to assign to {selectedClient.name}</option>
                    {availableAssetsForAssignment.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.assetTag} - {asset.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleAssignAsset} className="erp-link-button inline-flex items-center justify-center gap-1"><UserPlus className="w-4 h-4" /> Assign Asset</button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="erp-workspace-list"><div><span>Total Assigned Assets</span><strong>{selectedAssets.length}</strong></div><div><span>Total Asset Value</span><strong>{formatCurrency(selectedAssets.reduce((sum, asset) => sum + asset.purchaseCost, 0))}</strong></div><div><span>Pending Returns</span><strong>{db.assignments.filter(item => selectedAssetIds.has(item.assetId) && item.status === "Active").length}</strong></div></div>
                <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={70}>{categoryData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                <div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" outerRadius={70}>{statusData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead><tr><th>Asset</th><th>Category</th><th>Location</th><th>Status</th><th>Value</th></tr></thead>
                  <tbody>
                    {selectedAssets.map(asset => (
                      <tr key={asset.id}>
                        <td><strong>{asset.name}</strong><small>{asset.assetTag}</small></td>
                        <td>{db.categories.find(category => category.id === asset.categoryId)?.name || "-"}</td>
                        <td>{db.locations.find(location => location.id === asset.locationId)?.name || "-"}</td>
                        <td><span className="erp-status">{asset.status}</span></td>
                        <td>{formatCurrency(asset.purchaseCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {(activeView === "Reports" || activeView === "Dashboard") && (
            <article className="erp-panel xl:col-span-3">
              <div className="erp-panel-header">
                <div><h2>Client Activity History</h2><p>Assignments, transfers, maintenance, verifications, and disposal records.</p></div>
                <button type="button" onClick={() => exportCSV("activity")} className="erp-link-button inline-flex items-center gap-1"><Download className="w-4 h-4" /> Export Activity</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="erp-feed">
                  {activityRows.length === 0 ? <div className="erp-empty">No client activity has been recorded.</div> : activityRows.slice(0, 12).map((row, index) => (
                    <div key={`${row.type}-${row.date}-${index}`} className="erp-feed-item">
                      <span>{row.type.slice(0, 2).toUpperCase()}</span>
                      <div><strong>{row.title}</strong><p>{row.detail}</p><small>{row.type} - {formatDate(row.date)}</small></div>
                    </div>
                  ))}
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </article>
          )}
        </section>
      )}

      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5">
              <button onClick={() => setIsClientModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-display font-semibold">{editingClientId ? "Edit Client Profile" : "Add Client"}</h3>
              <p className="text-xs text-slate-300 font-mono">Client records are stored in the FAIMS client database.</p>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Name / Organization Name *</label>
                  <input required value={clientForm.name} onChange={event => setClientForm(prev => ({ ...prev, name: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Code *</label>
                  <input required readOnly value={clientForm.code} className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-slate-600 font-mono focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contact Person *</label>
                  <input required value={clientForm.contactPerson} onChange={event => setClientForm(prev => ({ ...prev, contactPerson: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone Number</label>
                  <input value={clientForm.phone} onChange={event => setClientForm(prev => ({ ...prev, phone: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <input type="email" value={clientForm.email} onChange={event => setClientForm(prev => ({ ...prev, email: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Client Type</label>
                  <select value={clientForm.organizationType} onChange={event => setClientForm(prev => ({ ...prev, organizationType: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    {MALAWI_CLIENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Region</label>
                  <select value={clientForm.region || "Central Region"} onChange={event => {
                    const region = event.target.value as MalawiRegion;
                    setClientForm(prev => ({ ...prev, region, district: MALAWI_DISTRICTS[region][0] }));
                  }} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    {MALAWI_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">District</label>
                  <select value={clientForm.district || "Lilongwe"} onChange={event => setClientForm(prev => ({ ...prev, district: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    {MALAWI_DISTRICTS[(clientForm.region || "Central Region") as MalawiRegion].map(district => <option key={district} value={district}>{district}</option>)}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Physical Address</label>
                  <input value={clientForm.address} onChange={event => setClientForm(prev => ({ ...prev, address: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Postal Address</label>
                  <input value={clientForm.postalAddress || ""} onChange={event => setClientForm(prev => ({ ...prev, postalAddress: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Registration Number (Optional)</label>
                  <input value={clientForm.registrationNumber || ""} onChange={event => setClientForm(prev => ({ ...prev, registrationNumber: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">TIN Number (Optional)</label>
                  <input value={clientForm.tinNumber || ""} onChange={event => setClientForm(prev => ({ ...prev, tinNumber: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Registration Date</label>
                  <input type="date" value={clientForm.registrationDate} onChange={event => setClientForm(prev => ({ ...prev, registrationDate: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select value={clientForm.status} onChange={event => setClientForm(prev => ({ ...prev, status: event.target.value as Client["status"] }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700">Linked Department</label>
                  <select value={clientForm.departmentId || ""} onChange={event => setClientForm(prev => ({ ...prev, departmentId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400">
                    <option value="">No department link</option>
                    {db.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 -mx-6 -mb-6 mt-4">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-semibold cursor-pointer">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
