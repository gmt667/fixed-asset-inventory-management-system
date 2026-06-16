/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  FolderTree,
  Building,
  MapPin,
  Truck,
  Plus,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  Locate
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification } from "../db";
import { Category, Department, Location, Supplier, UserRole } from "../types";

interface ModulesAdministrationProps {
  userRole: UserRole;
  currentUserId: string;
  initialTab?: ManagementTab;
}

type ManagementTab = "Categories" | "Departments" | "Locations" | "Suppliers";

export default function ModulesAdministration({ userRole, currentUserId, initialTab }: ModulesAdministrationProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [activeTab, setActiveTab] = useState<ManagementTab>(initialTab || "Categories");

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Modals & Panels
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState(""); // Used for Cat, Dept, Loc
  // Supplier extra fields
  const [formContact, setFormContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const isEditable = useMemo(() => {
    return userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  }, [userRole]);

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  const computeAssetCount = (type: ManagementTab, id: string) => {
    if (type === "Categories") return db.assets.filter(a => a.categoryId === id).length;
    if (type === "Departments") return db.assets.filter(a => a.departmentId === id).length;
    if (type === "Locations") return db.assets.filter(a => a.locationId === id).length;
    return db.assets.filter(a => a.supplierId === id).length; // Suppliers
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormCode("");
    setFormContact("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormName(item.name);
    if (activeTab !== "Suppliers") {
      setFormCode(item.code || "");
    } else {
      setFormContact(item.contactPerson || "");
      setFormEmail(item.email || "");
      setFormPhone(item.phone || "");
      setFormAddress(item.address || "");
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      alert("Name field is required.");
      return;
    }

    const currentDB = getDatabaseState();

    if (activeTab === "Categories") {
      if (editingId) {
        const idx = currentDB.categories.findIndex(c => c.id === editingId);
        if (idx !== -1) {
          currentDB.categories[idx] = { id: editingId, name: formName, code: formCode || "CAT" };
          addAuditRecord(currentUserId, userRole, "Cat Edit", `Edited asset category: ${formName} (${formCode})`);
        }
      } else {
        currentDB.categories.push({ id: `cat-${Date.now()}`, name: formName, code: formCode || "CAT" });
        addAuditRecord(currentUserId, userRole, "Cat Creation", `Added asset category: ${formName}`);
      }
    } else if (activeTab === "Departments") {
      if (editingId) {
        const idx = currentDB.departments.findIndex(d => d.id === editingId);
        if (idx !== -1) {
          currentDB.departments[idx] = { id: editingId, name: formName, code: formCode || "DEPT" };
          addAuditRecord(currentUserId, userRole, "Dept Edit", `Edited department: ${formName} (${formCode})`);
        }
      } else {
        currentDB.departments.push({ id: `dept-${Date.now()}`, name: formName, code: formCode || "DEPT" });
        addAuditRecord(currentUserId, userRole, "Dept Creation", `Added department context: ${formName}`);
      }
    } else if (activeTab === "Locations") {
      if (editingId) {
        const idx = currentDB.locations.findIndex(l => l.id === editingId);
        if (idx !== -1) {
          currentDB.locations[idx] = { id: editingId, name: formName, code: formCode || "LOC" };
          addAuditRecord(currentUserId, userRole, "Site Edit", `Edited physical location site: ${formName} (${formCode})`);
        }
      } else {
        currentDB.locations.push({ id: `loc-${Date.now()}`, name: formName, code: formCode || "LOC" });
        addAuditRecord(currentUserId, userRole, "Site Creation", `Added physical location site: ${formName}`);
      }
    } else { // Suppliers
      const supplierData: Supplier = {
        id: editingId || `sup-${Date.now()}`,
        name: formName,
        contactPerson: formContact,
        email: formEmail,
        phone: formPhone,
        address: formAddress
      };
      if (editingId) {
        const idx = currentDB.suppliers.findIndex(s => s.id === editingId);
        if (idx !== -1) {
          currentDB.suppliers[idx] = supplierData;
          addAuditRecord(currentUserId, userRole, "Vendor Edit", `Edited supplier profile: ${formName}`);
        }
      } else {
        currentDB.suppliers.push(supplierData);
        addAuditRecord(currentUserId, userRole, "Vendor Creation", `Added supplier profile: ${formName}`);
      }
    }

    saveDatabaseState(currentDB);
    setIsModalOpen(false);
    refreshDb();
  };

  const handleDelete = (id: string, name: string) => {
    const assetsCount = computeAssetCount(activeTab, id);
    if (assetsCount > 0) {
      alert(`Cannot delete '${name}' because there are ${assetsCount} physical assets currently mapped to it.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete '${name}'?`)) return;

    const currentDB = getDatabaseState();
    
    if (activeTab === "Categories") {
      currentDB.categories = currentDB.categories.filter(c => c.id !== id);
    } else if (activeTab === "Departments") {
      currentDB.departments = currentDB.departments.filter(d => d.id !== id);
    } else if (activeTab === "Locations") {
      currentDB.locations = currentDB.locations.filter(l => l.id !== id);
    } else {
      currentDB.suppliers = currentDB.suppliers.filter(s => s.id !== id);
    }

    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "Administration Module Purge", `Purged ${activeTab} entry: ${name}`);
    
    refreshDb();
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-Tabs Selector Cards */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-2.5">
        <button
          onClick={() => { setActiveTab("Categories"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-semibold text-xs leading-tight transition-colors cursor-pointer ${
            activeTab === "Categories" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
          }`}
        >
          <FolderTree className="w-4 h-4" /> Categories
        </button>
        <button
          onClick={() => { setActiveTab("Departments"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-semibold text-xs leading-tight transition-colors cursor-pointer ${
            activeTab === "Departments" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
          }`}
        >
          <Building className="w-4 h-4" /> Departments
        </button>
        <button
          onClick={() => { setActiveTab("Locations"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-semibold text-xs leading-tight transition-colors cursor-pointer ${
            activeTab === "Locations" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
          }`}
        >
          <MapPin className="w-4 h-4" /> Locations
        </button>
        <button
          onClick={() => { setActiveTab("Suppliers"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-semibold text-xs leading-tight transition-colors cursor-pointer ${
            activeTab === "Suppliers" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
          }`}
        >
          <Truck className="w-4 h-4" /> Suppliers & Logistics
        </button>
      </div>

      {/* Module Hub panel display */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-display font-semibold text-slate-900 flex items-center gap-2">
              {activeTab === "Categories" && <FolderTree className="w-5 h-5 text-emerald-600" />}
              {activeTab === "Departments" && <Building className="w-5 h-5 text-emerald-600" />}
              {activeTab === "Locations" && <MapPin className="w-5 h-5 text-emerald-600" />}
              {activeTab === "Suppliers" && <Truck className="w-5 h-5 text-emerald-600" />}
              FAIMS Infrastructure - {activeTab} Records
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure backend parameters used for classification across your asset entries.</p>
          </div>
          {isEditable && (
            <button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1. cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New {activeTab.slice(0, -1)}
            </button>
          )}
        </div>

        {/* Data list grid layout */}
        <div className="divide-y divide-slate-100 text-xs">
          
          {/* CATEGORIES SECTION */}
          {activeTab === "Categories" && (db.categories.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="mb-4 text-sm font-medium">No categories available.</p>
              {isEditable && (
                <button
                  onClick={handleOpenCreate}
                  className="mx-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              )}
            </div>
          ) : db.categories.map(cat => (
            <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm font-display">{cat.name}</span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-semibold">CODE: {cat.code}</span>
                </div>
                <p className="text-slate-400 text-[10px] font-mono">ID Reference: {cat.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-slate-500">Assets count: <strong className="text-slate-800">{computeAssetCount("Categories", cat.id)}</strong></span>
                {isEditable && (
                  <div className="flex gap-1.5 border-l border-slate-100 pl-4">
                    <button onClick={() => handleOpenEdit(cat)} className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          )))}

          {/* DEPARTMENTS SECTION */}
          {activeTab === "Departments" && (db.departments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="mb-4 text-sm font-medium">No departments available.</p>
              {isEditable && (
                <button
                  onClick={handleOpenCreate}
                  className="mx-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Create Department
                </button>
              )}
            </div>
          ) : db.departments.map(dept => (
            <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm font-display">{dept.name}</span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-semibold">CODE: {dept.code}</span>
                </div>
                <p className="text-slate-400 text-[10px] font-mono">ID Reference: {dept.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-slate-500">Mapped assets: <strong className="text-slate-800">{computeAssetCount("Departments", dept.id)}</strong></span>
                {isEditable && (
                  <div className="flex gap-1.5 border-l border-slate-100 pl-4">
                    <button onClick={() => handleOpenEdit(dept)} className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(dept.id, dept.name)} className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          )))}

          {/* LOCATIONS SECTION */}
          {activeTab === "Locations" && (db.locations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="mb-4 text-sm font-medium">No locations available.</p>
              {isEditable && (
                <button
                  onClick={handleOpenCreate}
                  className="mx-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Create Location
                </button>
              )}
            </div>
          ) : db.locations.map(loc => (
            <div key={loc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm font-display">{loc.name}</span>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-semibold">ROOM CODE: {loc.code}</span>
                </div>
                <p className="text-slate-400 text-[10px] font-mono">ID Reference: {loc.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-slate-500">Site assets count: <strong className="text-slate-800">{computeAssetCount("Locations", loc.id)}</strong></span>
                {isEditable && (
                  <div className="flex gap-1.5 border-l border-slate-100 pl-4">
                    <button onClick={() => handleOpenEdit(loc)} className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(loc.id, loc.name)} className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          )))}

          {/* SUPPLIERS SECTION */}
          {activeTab === "Suppliers" && (db.suppliers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="mb-4 text-sm font-medium">No suppliers available.</p>
              {isEditable && (
                <button
                  onClick={handleOpenCreate}
                  className="mx-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Supplier
                </button>
              )}
            </div>
          ) : db.suppliers.map(sup => (
            <div key={sup.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors bg-white">
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">{sup.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Contact Agent: <strong className="text-slate-700">{sup.contactPerson}</strong></p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {sup.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {sup.email}</span>
                  <span className="before:content-['•'] before:mr-2 before:text-slate-200">{sup.address}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-slate-500">Procured items: <strong className="text-slate-800">{computeAssetCount("Suppliers", sup.id)}</strong></span>
                {isEditable && (
                  <div className="flex gap-1.5 border-l border-slate-100 pl-4">
                    <button onClick={() => handleOpenEdit(sup)} className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer" title="Edit Supplier"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(sup.id, sup.name)} className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer" title="Delete Supplier"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          )))}

        </div>
      </div>

      {/* Entry modification / creations modal sheet */}
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
              <h3 className="text-base font-display font-semibold">
                {editingId ? `Modify ${activeTab.slice(0, -1)} Option` : `Seed New ${activeTab.slice(0, -1)}`}
              </h3>
              <p className="text-[10px] text-slate-300">Creates real options instantly bindable to assets.</p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700">{activeTab.slice(0,-1)} Option Name *</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${activeTab === "Categories" ? "Industrial Servers" : activeTab === "Departments" ? "Corporate Marketing" : activeTab === "Locations" ? "Warehouse Bay C" : "Oracle Technologies"}`}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              {activeTab !== "Suppliers" ? (
                /* Non-supplier simple CODE bindings */
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Abbreviation Alphanumeric Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MKTG, LAB-C"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().trim())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-mono font-bold uppercase focus:outline-none focus:border-slate-400"
                  />
                </div>
              ) : (
                /* Supplier extra detail values */
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Foster"
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Business email address</label>
                    <input
                      type="email"
                      placeholder="e.g. orders@oracle.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Telephone Contact number</label>
                    <input
                      type="text"
                      placeholder="e.g. +254 700 000 000"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Physical address block</label>
                    <input
                      type="text"
                      placeholder="e.g. Westland Towers Room 49"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              )}

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
                  Confirm Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
