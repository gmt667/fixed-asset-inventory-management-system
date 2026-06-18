/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock, Plus, RefreshCw } from "lucide-react";
import {
  addAuditRecord,
  completeReminder,
  formatCurrency,
  formatDate,
  getDatabaseState,
  runReminderEngine,
  saveDatabaseState,
  snoozeReminder
} from "../db";
import { Reminder, ReminderCategory, ReminderRecurrence, UserRole } from "../types";

interface ReminderManagementProps {
  userRole: UserRole;
  currentUserId: string;
}

const CATEGORIES: ReminderCategory[] = [
  "Internet Bundle Renewals",
  "Office Rent Payments",
  "Electricity Bills",
  "Water Bills",
  "Domain Renewals",
  "Hosting Renewals",
  "Software License Renewals",
  "Vehicle Insurance",
  "Equipment Maintenance",
  "Asset Verification",
  "Contract Renewals",
  "Supplier Payments",
  "Tax Deadlines",
  "Staff Meetings",
  "Custom Tasks"
];

const RECURRENCES: ReminderRecurrence[] = ["None", "Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual"];

export default function ReminderManagement({ userRole, currentUserId }: ReminderManagementProps) {
  const [db, setDb] = useState(getDatabaseState());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReminderCategory>("Custom Tasks");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("None");
  const [assignedTo, setAssignedTo] = useState("all");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const currentUser = useMemo(() => db.users.find(user => user.id === currentUserId), [currentUserId, db.users]);
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  const visibleReminders = useMemo(() => {
    return [...db.reminders]
      .filter(reminder => canManage || reminder.assignedTo === "all" || reminder.assignedTo === currentUserId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [canManage, currentUserId, db.reminders]);

  const refresh = () => setDb(getDatabaseState());

  const handleCreateReminder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueDate) return;
    const state = getDatabaseState();
    const now = new Date().toISOString();
    const reminder: Reminder = {
      id: `rem-${Date.now()}`,
      title: title.trim(),
      category,
      dueDate,
      recurrence,
      assignedTo,
      status: "Active",
      amount: amount ? Number(amount) : undefined,
      notes: notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      nextOccurrenceGenerated: false
    };
    state.reminders.unshift(reminder);
    saveDatabaseState(state);
    addAuditRecord(currentUserId, currentUser?.name || userRole, "Reminder Created", `${reminder.title} due ${reminder.dueDate}.`);
    runReminderEngine();
    setTitle("");
    setAmount("");
    setNotes("");
    refresh();
  };

  const handleRunEngine = () => {
    const result = runReminderEngine();
    refresh();
    alert(`Reminder engine completed. Created ${result.notificationsCreated} notifications and ${result.recurrencesCreated} recurring reminders.`);
  };

  if (!canManage) {
    return (
      <div className="erp-panel">
        <div className="erp-panel-header">
          <div>
            <h2>Reminder Engine</h2>
            <p>Your assigned reminders and automated alerts.</p>
          </div>
          <Bell className="w-5 h-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="erp-panel">
        <div className="erp-panel-header">
          <div>
            <h2>Automated Reminder Engine</h2>
            <p>Records here are scanned on load and every hour, with duplicate delivery keys enforced.</p>
          </div>
          <button type="button" onClick={handleRunEngine} className="erp-link-button flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Run Scan
          </button>
        </div>

        <form onSubmit={handleCreateReminder} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
          <input required value={title} onChange={event => setTitle(event.target.value)} placeholder="Reminder title" className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
          <select value={category} onChange={event => setCategory(event.target.value as ReminderCategory)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="date" required value={dueDate} onChange={event => setDueDate(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
          <select value={recurrence} onChange={event => setRecurrence(event.target.value as ReminderRecurrence)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {RECURRENCES.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={assignedTo} onChange={event => setAssignedTo(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <option value="all">All users</option>
            {db.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <input type="number" min="0" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Amount MWK" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
          <input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Notes" className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
          <button type="submit" className="bg-slate-900 text-white rounded-lg px-3 py-2 font-bold flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </section>

      <section className="erp-panel">
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr><th>Reminder</th><th>Category</th><th>Due</th><th>Recurrence</th><th>Status</th><th>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {visibleReminders.length === 0 ? (
                <tr><td colSpan={7}>No reminder records have been created.</td></tr>
              ) : visibleReminders.map(reminder => (
                <tr key={reminder.id}>
                  <td><strong>{reminder.title}</strong><small>{reminder.notes || "Automated schedule active"}</small></td>
                  <td>{reminder.category}</td>
                  <td>{formatDate(reminder.dueDate)}</td>
                  <td>{reminder.recurrence}</td>
                  <td><span className="erp-status">{reminder.status}</span></td>
                  <td>{reminder.amount ? formatCurrency(reminder.amount) : "-"}</td>
                  <td className="text-right">
                    {reminder.status !== "Completed" && (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { snoozeReminder(reminder.id, 1, currentUserId, currentUser?.name || userRole); refresh(); }} className="erp-link-button"><Clock className="w-4 h-4" /></button>
                        <button type="button" onClick={() => { completeReminder(reminder.id, currentUserId, currentUser?.name || userRole); refresh(); }} className="erp-link-button"><CheckCircle2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
