/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Users,
  Shield,
  Key,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  UserCheck,
  Lock,
  LockKeyhole
} from "lucide-react";
import { getDatabaseState, saveDatabaseState, addAuditRecord, triggerNotification } from "../db";
import { User, UserRole } from "../types";

interface UserManagementProps {
  userRole: UserRole;
  currentUserId: string;
}

export default function UserManagement({ userRole, currentUserId }: UserManagementProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(UserRole.EMPLOYEE);
  const [deptId, setDeptId] = useState("");
  const [forcePwd, setForcePwd] = useState(true);

  const isAuthorized = useMemo(() => {
    return userRole === UserRole.ADMIN;
  }, [userRole]);

  const refreshDb = () => {
    setDb(getDatabaseState());
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("User@123");
    setRole(UserRole.EMPLOYEE);
    setDeptId(db.departments[0]?.id || "");
    setForcePwd(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(""); // Keep blank if untouched
    setRole(user.role);
    setDeptId(user.departmentId);
    setForcePwd(user.forcePasswordChange);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      alert("Please satisfy name and email parameters.");
      return;
    }

    const currentDB = getDatabaseState();

    if (editingUser) {
      // Modify
      const index = currentDB.users.findIndex(u => u.id === editingUser.id);
      if (index !== -1) {
        currentDB.users[index] = {
          ...editingUser,
          name,
          email,
          role,
          departmentId: deptId,
          forcePasswordChange: forcePwd
        };
        // Update password if specified
        if (password) {
          currentDB.passwords[editingUser.id] = password;
        }
        
        saveDatabaseState(currentDB);
        addAuditRecord(
          currentUserId,
          userRole,
          "User Mod",
          `Modified user credentials of: ${email} (${name}) as ${role}`
        );
        triggerNotification(editingUser.id, "User Profile Updated", "An Administrator has updated your profile security status.", "info");
      }
    } else {
      // Create new
      const nextId = `u-${Date.now()}`;
      const newUser: User = {
        id: nextId,
        name,
        email,
        role,
        departmentId: deptId,
        forcePasswordChange: forcePwd,
        createdAt: new Date().toISOString()
      };
      
      currentDB.users.push(newUser);
      currentDB.passwords[nextId] = password || "User@123";
      
      saveDatabaseState(currentDB);
      addAuditRecord(
        currentUserId,
        userRole,
        "User Registration",
        `Created new FAIMS subscriber account: ${email} bound to role: ${role}`
      );
      triggerNotification("all", "New User Created", `User ${name} registered successfully.`, "success");
    }

    setIsModalOpen(false);
    refreshDb();
  };

  const handleDeleteUser = (id: string, userEmail: string) => {
    if (id === currentUserId) {
      alert("You cannot lock or delete your own active administrator session!");
      return;
    }
    if (!confirm(`Are you absolutely sure you want to deactivate and remove account: ${userEmail}?`)) return;

    const currentDB = getDatabaseState();
    currentDB.users = currentDB.users.filter(u => u.id !== id);
    delete currentDB.passwords[id];
    
    saveDatabaseState(currentDB);
    addAuditRecord(currentUserId, userRole, "User Deactivation", `Purged credentials database for email: ${userEmail}`);
    
    refreshDb();
  };

  // If unauthorized, render simple readable info view of roles or access error
  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto mt-12">
        <LockKeyhole className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h3 className="text-lg font-bold text-slate-900 font-display">Administrative Shield Triggered</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Access to direct user credentials management, session revoking, and system permissions matrix is restricted exclusively to the <strong>System Administrator</strong> role.
        </p>
        <div className="bg-slate-50 p-3.5 rounded-lg text-left text-[11px] text-slate-600 border border-slate-100 font-medium">
          <span className="font-bold text-slate-800 uppercase block mb-1">Your credentials status:</span>
          Role: <strong className="text-slate-900">{userRole}</strong><br />
          Clearance Level: Normal Read Operations Limit Base
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Executive User & Security Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track user account profiles, modify assigned departments, force password resets, and adjust roles permissions.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User Account
        </button>
      </div>

      {/* User listing */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs">
          <span className="font-medium text-slate-500">Registered FAIMS Core Session Subscribers ({db.users.length})</span>
          <span className="font-mono text-[10px] text-emerald-600">Enterprise Shield Active</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {db.users.map((user) => {
            const department = db.departments.find(d => d.id === user.departmentId);
            return (
              <div key={user.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Styled avatar letter */}
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold tracking-tight text-sm shadow-xs shrink-0">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 font-display">{user.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        user.role === UserRole.ADMIN ? "bg-purple-100 text-purple-800" :
                        user.role === UserRole.ASSET_MANAGER ? "bg-blue-100 text-blue-800" :
                        user.role === UserRole.DEPT_MANAGER ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-800"
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 font-medium text-[11px]">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {user.email}
                      </span>
                      <span className="before:content-['•'] before:mr-2 before:text-slate-300">
                        {department ? department.name : "HQ Admin Group"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Security attributes and modifications */}
                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-left sm:text-right text-[11px] font-medium text-slate-500">
                    {user.forcePasswordChange ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" /> Force Reset Pending
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Password Configured
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={user.id === currentUserId}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer disabled:opacity-30"
                      title="Deactivate Subscriber"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Profile Edit / Create Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="bg-slate-900 text-white p-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-display font-semibold">
                {editingUser ? "Modify Subscriber Parameters" : "Register Account Profile"}
              </h3>
              <p className="text-[10px] text-slate-300">Enforces password change policy by default.</p>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subscriber Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. George Mtumbe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Official Email Axis *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. gmtumbe@giantplus.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  {editingUser ? "Reset Password Value (Leave blank to keep current)" : "Password Value *"}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? "••••••••" : "User@123"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Designated Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                >
                  {Object.values(UserRole).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Department Department *</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 font-medium focus:outline-none focus:border-slate-400"
                >
                  {db.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="forcePwd"
                  checked={forcePwd}
                  onChange={(e) => setForcePwd(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="forcePwd" className="font-bold text-slate-700 cursor-pointer select-none">
                  Force password change on next credentials validation.
                </label>
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
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
