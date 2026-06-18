/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  Edit2,
  FileText,
  Filter,
  History,
  Layers3,
  LayoutGrid,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Users,
  X
} from "lucide-react";
import {
  addAuditRecord,
  completeReminder,
  formatCurrency,
  formatDate,
  getDatabaseState,
  runReminderEngine,
  saveDatabaseState,
  snoozeReminder,
  subscribeToDatabaseState
} from "../db";
import { Client, Department, Reminder, ReminderCategory, ReminderPriority, ReminderRecurrence, ReminderTemplate, UserRole } from "../types";

interface ReminderManagementProps {
  userRole: UserRole;
  currentUserId: string;
}

type ReminderView = "Upcoming" | "Overdue" | "Recurring" | "History" | "Templates";
type ReminderFormState = {
  title: string;
  description: string;
  category: ReminderCategory;
  dueDate: string;
  recurrence: ReminderRecurrence;
  assignedTo: string;
  departmentId: string;
  clientId: string;
  responsibleRole: UserRole | "";
  responsibleUserId: string;
  priority: ReminderPriority;
  notificationSchedule: string;
  amount: string;
  notes: string;
  templateId: string;
};

type TemplateFormState = {
  name: string;
  description: string;
  category: ReminderCategory;
  defaultPriority: ReminderPriority;
  defaultRecurrence: ReminderRecurrence;
  defaultNotificationSchedule: string;
  defaultDepartmentId: string;
  defaultClientId: string;
  defaultResponsibleRole: UserRole | "";
  defaultResponsibleUserId: string;
  titleTemplate: string;
  descriptionTemplate: string;
  notesTemplate: string;
  tags: string;
};

const REMINDER_CATEGORIES: ReminderCategory[] = [
  "Office Rent",
  "Internet",
  "Electricity",
  "Water",
  "Domain",
  "Hosting",
  "Software Subscription",
  "Maintenance",
  "Verification",
  "Insurance",
  "Supplier Payment",
  "Department Expense",
  "Compliance Deadline",
  "Custom Reminder"
];

const REMINDER_PRIORITIES: ReminderPriority[] = ["Low", "Medium", "High", "Critical"];
const REMINDER_RECURRENCES: ReminderRecurrence[] = ["None", "Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual"];
const DEFAULT_SCHEDULE = [30, 14, 7, 3, 1, 0];

function getMalawiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Blantyre" }).format(new Date());
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseSchedule(value: string): number[] {
  return value
    .split(",")
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item) && item >= 0)
    .filter((item, index, array) => array.indexOf(item) === index)
    .sort((a, b) => b - a);
}

function scheduleToString(schedule?: number[]): string {
  return (schedule && schedule.length > 0 ? schedule : DEFAULT_SCHEDULE).join(", ");
}

function getReminderDueDelta(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.ceil((startDue.getTime() - startNow.getTime()) / (1000 * 60 * 60 * 24));
}

function getReminderRecipients(reminder: Reminder, users: { id: string; role: UserRole }[]): string[] {
  if (reminder.responsibleUserId) {
    if (users.some(user => user.id === reminder.responsibleUserId)) return [reminder.responsibleUserId];
  }
  if (reminder.assignedTo && reminder.assignedTo !== "all") {
    if (users.some(user => user.id === reminder.assignedTo)) return [reminder.assignedTo];
  }
  if (reminder.responsibleRole) {
    const byRole = users.filter(user => user.role === reminder.responsibleRole).map(user => user.id);
    if (byRole.length > 0) return byRole;
  }
  return ["all"];
}

function reminderMatchesScope(
  reminder: Reminder,
  userRole: UserRole,
  currentUserId: string,
  currentDepartmentId?: string
): boolean {
  if (userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER) return true;
  if (userRole === UserRole.AUDITOR) return true;
  if (userRole === UserRole.DEPT_MANAGER) {
    return reminder.departmentId === currentDepartmentId || reminder.responsibleUserId === currentUserId || reminder.assignedTo === currentUserId;
  }
  return reminder.responsibleUserId === currentUserId || reminder.assignedTo === currentUserId;
}

function reminderMatchesQuery(reminder: Reminder, query: string, departmentName?: string, clientName?: string): boolean {
  if (!query.trim()) return true;
  const haystack = [
    reminder.title,
    reminder.description,
    reminder.notes,
    reminder.category,
    reminder.priority,
    reminder.status,
    departmentName,
    clientName,
    reminder.recurrence
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function formatReminderSummary(reminder: Reminder): string {
  const parts = [
    reminder.priority,
    reminder.departmentId ? `Dept ${reminder.departmentId}` : "",
    reminder.responsibleRole ? `Role ${reminder.responsibleRole}` : "",
    reminder.responsibleUserId ? `User ${reminder.responsibleUserId}` : "",
    reminder.notificationSchedule ? `Schedule ${scheduleToString(reminder.notificationSchedule)}` : ""
  ].filter(Boolean);
  return parts.join(" | ");
}

function buildReminderForm(currentUserId: string, currentRole: UserRole, currentDepartmentId = ""): ReminderFormState {
  return {
    title: "",
    description: "",
    category: "Compliance Deadline",
    dueDate: getMalawiToday(),
    recurrence: "None",
    assignedTo: currentUserId,
    departmentId: currentDepartmentId,
    clientId: "",
    responsibleRole: currentRole,
    responsibleUserId: currentUserId,
    priority: "Medium",
    notificationSchedule: DEFAULT_SCHEDULE.join(", "),
    amount: "",
    notes: "",
    templateId: ""
  };
}

function buildTemplateForm(currentUserId: string): TemplateFormState {
  return {
    name: "",
    description: "",
    category: "Compliance Deadline",
    defaultPriority: "Medium",
    defaultRecurrence: "Monthly",
    defaultNotificationSchedule: DEFAULT_SCHEDULE.join(", "),
    defaultDepartmentId: "",
    defaultClientId: "",
    defaultResponsibleRole: "",
    defaultResponsibleUserId: currentUserId,
    titleTemplate: "{{title}}",
    descriptionTemplate: "{{description}}",
    notesTemplate: "",
    tags: ""
  };
}

export default function ReminderManagement({ userRole, currentUserId }: ReminderManagementProps) {
  const [db, setDb] = useState(() => getDatabaseState());
  const [activeView, setActiveView] = useState<ReminderView>("Upcoming");
  const [query, setQuery] = useState("");
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState<ReminderFormState>(() => buildReminderForm(currentUserId, userRole));
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(() => buildTemplateForm(currentUserId));
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeToDatabaseState(() => setDb(getDatabaseState())), []);

  const currentUser = useMemo(() => db.users.find(user => user.id === currentUserId), [db.users, currentUserId]);
  const currentDepartmentId = currentUser?.departmentId || "";
  const canCreateReminders = userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER || userRole === UserRole.DEPT_MANAGER;
  const canManageTemplates = userRole === UserRole.ADMIN;
  const canPrint = true;

  const visibleReminders = useMemo(() => {
    return db.reminders
      .filter(reminder => reminderMatchesScope(reminder, userRole, currentUserId, currentDepartmentId))
      .filter(reminder => {
        const departmentName = db.departments.find(dept => dept.id === reminder.departmentId)?.name;
        const clientName = db.clients.find(client => client.id === reminder.clientId)?.name;
        return reminderMatchesQuery(reminder, query, departmentName, clientName);
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
  }, [currentDepartmentId, currentUserId, db.clients, db.departments, db.reminders, query, userRole]);

  const upcomingReminders = useMemo(() => {
    return visibleReminders.filter(reminder => {
      const delta = getReminderDueDelta(reminder.dueDate);
      return reminder.status !== "Completed" && reminder.status !== "Cancelled" && delta >= 0;
    });
  }, [visibleReminders]);

  const overdueReminders = useMemo(() => {
    return visibleReminders.filter(reminder => {
      const delta = getReminderDueDelta(reminder.dueDate);
      return reminder.status !== "Completed" && reminder.status !== "Cancelled" && delta < 0;
    });
  }, [visibleReminders]);

  const recurringReminders = useMemo(() => visibleReminders.filter(reminder => reminder.recurrence !== "None"), [visibleReminders]);

  const notificationHistory = useMemo(() => {
    const visibleIds = new Set(visibleReminders.map(reminder => reminder.id));
    return db.notifications
      .filter(notification => !notification.reminderId || visibleIds.has(notification.reminderId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [db.notifications, visibleReminders]);

  const templates = useMemo(() => {
    return [...db.reminderTemplates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db.reminderTemplates]);

  const reminderStats = useMemo(() => ({
    upcoming: upcomingReminders.length,
    overdue: overdueReminders.length,
    recurring: recurringReminders.length,
    templates: templates.length
  }), [overdueReminders.length, upcomingReminders.length, recurringReminders.length, templates.length]);

  const reminderTargets = useMemo(() => db.users.map(user => ({ id: user.id, name: user.name, role: user.role })), [db.users]);

  const departmentOptions = useMemo(() => db.departments, [db.departments]);
  const clientOptions = useMemo(() => db.clients, [db.clients]);

  useEffect(() => {
    if (!currentUser) return;
    setReminderForm(prev => ({
      ...prev,
      assignedTo: prev.assignedTo || currentUserId,
      responsibleRole: prev.responsibleRole || currentUser.role,
      responsibleUserId: prev.responsibleUserId || currentUserId,
      departmentId: prev.departmentId || currentUser.departmentId || ""
    }));
  }, [currentUser, currentUserId]);

  const refresh = () => setDb(getDatabaseState());

  const resetReminderForm = () => {
    setReminderForm(buildReminderForm(currentUserId, currentUser?.role || userRole, currentDepartmentId));
    setEditingReminderId(null);
  };

  const resetTemplateForm = () => {
    setTemplateForm(buildTemplateForm(currentUserId));
    setEditingTemplateId(null);
  };

  const loadReminderForEdit = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setReminderForm({
      title: reminder.title || "",
      description: reminder.description || "",
      category: reminder.category,
      dueDate: reminder.dueDate,
      recurrence: reminder.recurrence,
      assignedTo: reminder.assignedTo || "all",
      departmentId: reminder.departmentId || "",
      clientId: reminder.clientId || "",
      responsibleRole: reminder.responsibleRole || "",
      responsibleUserId: reminder.responsibleUserId || "",
      priority: reminder.priority,
      notificationSchedule: scheduleToString(reminder.notificationSchedule),
      amount: reminder.amount !== undefined ? String(reminder.amount) : "",
      notes: reminder.notes || "",
      templateId: reminder.templateId || ""
    });
  };

  const loadTemplateForEdit = (template: ReminderTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      category: template.category,
      defaultPriority: template.defaultPriority,
      defaultRecurrence: template.defaultRecurrence,
      defaultNotificationSchedule: scheduleToString(template.defaultNotificationSchedule),
      defaultDepartmentId: template.defaultDepartmentId || "",
      defaultClientId: template.defaultClientId || "",
      defaultResponsibleRole: template.defaultResponsibleRole || "",
      defaultResponsibleUserId: template.defaultResponsibleUserId || currentUserId,
      titleTemplate: template.titleTemplate,
      descriptionTemplate: template.descriptionTemplate,
      notesTemplate: template.notesTemplate || "",
      tags: template.tags.join(", ")
    });
  };

  const applyTemplateToReminder = (templateId: string) => {
    const template = db.reminderTemplates.find(item => item.id === templateId);
    if (!template) return;
    setReminderForm(prev => ({
      ...prev,
      templateId: template.id,
      category: template.category,
      priority: template.defaultPriority,
      recurrence: template.defaultRecurrence,
      notificationSchedule: scheduleToString(template.defaultNotificationSchedule),
      departmentId: template.defaultDepartmentId || prev.departmentId,
      clientId: template.defaultClientId || prev.clientId,
      responsibleRole: template.defaultResponsibleRole || prev.responsibleRole,
      responsibleUserId: template.defaultResponsibleUserId || prev.responsibleUserId,
      title: template.titleTemplate.includes("{{title}}") ? prev.title : template.titleTemplate,
      description: template.descriptionTemplate.includes("{{description}}") ? prev.description : template.descriptionTemplate,
      notes: template.notesTemplate ? template.notesTemplate : prev.notes
    }));
  };

  const saveReminder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreateReminders) return;
    if (!reminderForm.title.trim() || !reminderForm.dueDate) return;

    setBusy(true);
    const state = getDatabaseState();
    const now = new Date().toISOString();
    const reminderSchedule = parseSchedule(reminderForm.notificationSchedule);
    const payload: Reminder = {
      id: editingReminderId || `rem-${Date.now()}`,
      title: reminderForm.title.trim(),
      description: reminderForm.description.trim() || undefined,
      category: reminderForm.category,
      dueDate: reminderForm.dueDate,
      recurrence: reminderForm.recurrence,
      assignedTo: reminderForm.assignedTo && reminderForm.assignedTo !== "all" ? reminderForm.assignedTo : "all",
      status: "Active",
      priority: reminderForm.priority,
      clientId: reminderForm.clientId || undefined,
      departmentId: reminderForm.departmentId || undefined,
      responsibleRole: reminderForm.responsibleRole || undefined,
      responsibleUserId: reminderForm.responsibleUserId && reminderForm.responsibleUserId !== "all" ? reminderForm.responsibleUserId : undefined,
      notificationSchedule: reminderSchedule.length > 0 ? reminderSchedule : DEFAULT_SCHEDULE,
      amount: reminderForm.amount ? Number(reminderForm.amount) : undefined,
      notes: reminderForm.notes.trim() || undefined,
      templateId: reminderForm.templateId || undefined,
      createdBy: currentUserId,
      createdByName: currentUser?.name || userRole,
      createdAt: now,
      updatedAt: now,
      nextOccurrenceGenerated: false
    };

    if (editingReminderId) {
      const existingIndex = state.reminders.findIndex(item => item.id === editingReminderId);
      if (existingIndex !== -1) {
        state.reminders[existingIndex] = {
          ...state.reminders[existingIndex],
          ...payload,
          createdAt: state.reminders[existingIndex].createdAt,
          updatedAt: now
        };
      }
    } else {
      state.reminders.unshift(payload);
    }

    saveDatabaseState(state);
    addAuditRecord(currentUserId, currentUser?.name || userRole, editingReminderId ? "Reminder Updated" : "Reminder Created", `${payload.title} saved in Reminder Center.`);
    runReminderEngine();
    resetReminderForm();
    refresh();
    setBusy(false);
  };

  const saveTemplate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageTemplates) return;
    if (!templateForm.name.trim()) return;

    setBusy(true);
    const state = getDatabaseState();
    const now = new Date().toISOString();
    const tags = templateForm.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);
    const template: ReminderTemplate = {
      id: editingTemplateId || `tmpl-rem-${Date.now()}`,
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || undefined,
      category: templateForm.category,
      defaultPriority: templateForm.defaultPriority,
      defaultRecurrence: templateForm.defaultRecurrence,
      defaultNotificationSchedule: parseSchedule(templateForm.defaultNotificationSchedule).length > 0 ? parseSchedule(templateForm.defaultNotificationSchedule) : DEFAULT_SCHEDULE,
      defaultDepartmentId: templateForm.defaultDepartmentId || undefined,
      defaultClientId: templateForm.defaultClientId || undefined,
      defaultResponsibleRole: templateForm.defaultResponsibleRole || undefined,
      defaultResponsibleUserId: templateForm.defaultResponsibleUserId && templateForm.defaultResponsibleUserId !== "all" ? templateForm.defaultResponsibleUserId : undefined,
      titleTemplate: templateForm.titleTemplate.trim() || "{{title}}",
      descriptionTemplate: templateForm.descriptionTemplate.trim() || "{{description}}",
      notesTemplate: templateForm.notesTemplate.trim() || undefined,
      archived: false,
      createdBy: currentUserId,
      createdByName: currentUser?.name || userRole,
      modifiedBy: currentUserId,
      modifiedByName: currentUser?.name || userRole,
      createdAt: now,
      updatedAt: now,
      tags
    };

    if (editingTemplateId) {
      const existingIndex = state.reminderTemplates.findIndex(item => item.id === editingTemplateId);
      if (existingIndex !== -1) {
        state.reminderTemplates[existingIndex] = {
          ...state.reminderTemplates[existingIndex],
          ...template,
          createdAt: state.reminderTemplates[existingIndex].createdAt,
          createdBy: state.reminderTemplates[existingIndex].createdBy,
          createdByName: state.reminderTemplates[existingIndex].createdByName
        };
      }
    } else {
      state.reminderTemplates.unshift(template);
    }

    saveDatabaseState(state);
    addAuditRecord(currentUserId, currentUser?.name || userRole, editingTemplateId ? "Reminder Template Updated" : "Reminder Template Created", `${template.name} saved in Reminder Templates.`);
    resetTemplateForm();
    refresh();
    setBusy(false);
  };

  const updateReminderStatus = (reminderId: string, status: Reminder["status"], action: string) => {
    const state = getDatabaseState();
    const reminder = state.reminders.find(item => item.id === reminderId);
    if (!reminder) return;
    reminder.status = status;
    reminder.updatedAt = new Date().toISOString();
    if (status === "Completed") {
      reminder.completedAt = reminder.updatedAt;
      reminder.completionNotes = "Completed from Reminder Center.";
    }
    if (status === "Cancelled") {
      reminder.completionNotes = "Archived from Reminder Center.";
    }
    saveDatabaseState(state);
    addAuditRecord(currentUserId, currentUser?.name || userRole, action, `${reminder.title} updated to ${status}.`);
    refresh();
  };

  const handleSnooze = (reminderId: string) => {
    snoozeReminder(reminderId, 1, currentUserId, currentUser?.name || userRole);
    refresh();
  };

  const handleExport = (format: "csv" | "pdf") => {
    const exportRows =
      activeView === "Overdue"
        ? overdueReminders
        : activeView === "Recurring"
          ? recurringReminders
          : activeView === "Templates"
            ? templates
            : activeView === "History"
              ? notificationHistory
              : upcomingReminders;

    if (format === "csv") {
      const csv = [
        ["Type", "Title", "Status", "Due", "Category", "Priority", "Owner", "Department", "Schedule"].map(csvEscape).join(","),
        ...exportRows.map(item => {
          const record = item as any;
          if ("reminderId" in record || "channel" in record) {
            const reminderItem = db.reminders.find(reminder => reminder.id === record.reminderId);
            return [
              "Notification",
              record.title,
              record.status || "sent",
              formatDate(record.createdAt),
              reminderItem?.category || "-",
              reminderItem?.priority || "-",
              reminderItem?.responsibleUserId || reminderItem?.assignedTo || "-",
              reminderItem?.departmentId || "-",
              reminderItem ? scheduleToString(reminderItem.notificationSchedule) : "-"
            ].map(value => csvEscape(String(value ?? ""))).join(",");
          }
          if ("defaultNotificationSchedule" in record) {
            return [
              "Template",
              record.name,
              record.archived ? "Archived" : "Active",
              formatDate(record.updatedAt),
              record.category,
              record.defaultPriority,
              record.defaultResponsibleUserId || "-",
              record.defaultDepartmentId || "-",
              scheduleToString(record.defaultNotificationSchedule)
            ].map(value => csvEscape(String(value ?? ""))).join(",");
          }
          return [
            "Reminder",
            record.title,
            record.status,
            record.dueDate,
            record.category,
            record.priority,
            record.responsibleUserId || record.assignedTo || "-",
            record.departmentId || "-",
            scheduleToString(record.notificationSchedule)
          ].map(value => csvEscape(String(value ?? ""))).join(",");
        })
      ].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `reminder-center-${activeView.toLowerCase()}.csv`);
      addAuditRecord(currentUserId, currentUser?.name || userRole, "Reminder Exported", `Exported ${activeView} view as CSV.`);
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${db.settings.orgName} - Reminder Center`, 14, 18);
    doc.setFontSize(11);
    doc.text(`View: ${activeView}`, 14, 28);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 35);
    let cursorY = 46;
    exportRows.slice(0, 20).forEach((item, index) => {
      const record = item as any;
      if (cursorY > 275) {
        doc.addPage();
        cursorY = 18;
      }
      if ("reminderId" in record || "channel" in record) {
        const reminderItem = db.reminders.find(reminder => reminder.id === record.reminderId);
        doc.text(`${index + 1}. ${record.title}`, 14, cursorY);
        doc.text(`Notification: ${record.status || "sent"} | ${formatDate(record.createdAt)} | ${reminderItem?.category || "-"}`, 18, cursorY + 6);
        cursorY += 14;
        return;
      }
      if ("defaultNotificationSchedule" in record) {
        doc.text(`${index + 1}. ${record.name}`, 14, cursorY);
        doc.text(`Template: ${record.category} | ${record.defaultPriority} | ${record.archived ? "Archived" : "Active"}`, 18, cursorY + 6);
        cursorY += 14;
        return;
      }
      doc.text(`${index + 1}. ${record.title}`, 14, cursorY);
      doc.text(`Due ${formatDate(record.dueDate)} | ${record.priority} | ${record.category} | ${record.status}`, 18, cursorY + 6);
      cursorY += 14;
    });
    doc.save(`reminder-center-${activeView.toLowerCase()}.pdf`);
    addAuditRecord(currentUserId, currentUser?.name || userRole, "Reminder Exported", `Exported ${activeView} view as PDF.`);
  };

  const handlePrint = () => {
    if (!canPrint) return;
    addAuditRecord(currentUserId, currentUser?.name || userRole, "Reminder Printed", `Printed Reminder Center view: ${activeView}.`);
    window.print();
  };

  const handleArchiveTemplate = (templateId: string) => {
    if (!canManageTemplates) return;
    const state = getDatabaseState();
    const template = state.reminderTemplates.find(item => item.id === templateId);
    if (!template) return;
    template.archived = !template.archived;
    template.updatedAt = new Date().toISOString();
    template.modifiedBy = currentUserId;
    template.modifiedByName = currentUser?.name || userRole;
    saveDatabaseState(state);
    addAuditRecord(currentUserId, currentUser?.name || userRole, template.archived ? "Reminder Template Archived" : "Reminder Template Restored", `${template.name} archive state changed.`);
    refresh();
  };

  const reminderViewConfig: Array<{ id: ReminderView; label: string; icon: React.ReactNode; count: number }> = [
    { id: "Upcoming", label: "Upcoming Reminders", icon: <Bell className="w-4 h-4" />, count: reminderStats.upcoming },
    { id: "Overdue", label: "Overdue Tasks", icon: <ShieldAlert className="w-4 h-4" />, count: reminderStats.overdue },
    { id: "Recurring", label: "Recurring Schedules", icon: <Layers3 className="w-4 h-4" />, count: reminderStats.recurring },
    { id: "History", label: "Notification History", icon: <History className="w-4 h-4" />, count: notificationHistory.length },
    { id: "Templates", label: "Reminder Templates", icon: <LayoutGrid className="w-4 h-4" />, count: reminderStats.templates }
  ];

  if (!currentUser) {
    return (
      <div className="erp-panel">
        <div className="erp-panel-header">
          <div>
            <h2>Reminder Center</h2>
            <p>Loading your reminder workspace.</p>
          </div>
          <Bell className="w-5 h-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="erp-panel">
        <div className="erp-panel-header flex-wrap gap-4">
          <div>
            <h2>Reminder Center</h2>
            <p>Automated operations reminders with live scheduling, role-based visibility, template reuse, and audit-ready history.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleExport("csv")} className="erp-link-button flex items-center gap-1">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button type="button" onClick={() => handleExport("pdf")} className="erp-link-button flex items-center gap-1">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button type="button" onClick={handlePrint} className="erp-link-button flex items-center gap-1">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-slate-500">Upcoming</div>
            <div className="text-lg font-bold text-slate-900">{reminderStats.upcoming}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-slate-500">Overdue</div>
            <div className="text-lg font-bold text-rose-600">{reminderStats.overdue}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-slate-500">Recurring</div>
            <div className="text-lg font-bold text-blue-700">{reminderStats.recurring}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-slate-500">Templates</div>
            <div className="text-lg font-bold text-emerald-700">{reminderStats.templates}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search reminders, departments, clients, templates, or notifications"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-4 h-4" />
            Malawi: MWK | Africa/Blantyre | DD/MM/YYYY
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {reminderViewConfig.map(view => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold border transition ${
                activeView === view.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {view.icon}
              {view.label}
              <span className={`rounded-full px-2 py-0.5 ${activeView === view.id ? "bg-white/15" : "bg-slate-100"}`}>{view.count}</span>
            </button>
          ))}
        </div>
      </section>

      {canCreateReminders && (
        <section className="erp-panel">
          <div className="erp-panel-header">
            <div>
              <h3>{editingReminderId ? "Edit Reminder" : "Create Reminder"}</h3>
              <p>Use live database data, role assignments, and schedule-driven notifications.</p>
            </div>
            <button type="button" onClick={resetReminderForm} className="erp-link-button flex items-center gap-1">
              <X className="w-4 h-4" /> Reset
            </button>
          </div>

          <form onSubmit={saveReminder} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
            <input
              required
              value={reminderForm.title}
              onChange={event => setReminderForm(prev => ({ ...prev, title: event.target.value }))}
              placeholder="Reminder title"
              className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
            <select
              value={reminderForm.category}
              onChange={event => setReminderForm(prev => ({ ...prev, category: event.target.value as ReminderCategory }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              {REMINDER_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <select
              value={reminderForm.priority}
              onChange={event => setReminderForm(prev => ({ ...prev, priority: event.target.value as ReminderPriority }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              {REMINDER_PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
            </select>
            <input
              type="date"
              required
              value={reminderForm.dueDate}
              onChange={event => setReminderForm(prev => ({ ...prev, dueDate: event.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
            <select
              value={reminderForm.recurrence}
              onChange={event => setReminderForm(prev => ({ ...prev, recurrence: event.target.value as ReminderRecurrence }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              {REMINDER_RECURRENCES.map(recurrence => <option key={recurrence} value={recurrence}>{recurrence}</option>)}
            </select>
            <select
              value={reminderForm.departmentId}
              onChange={event => setReminderForm(prev => ({ ...prev, departmentId: event.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">All departments</option>
              {departmentOptions.map((department: Department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <select
              value={reminderForm.clientId}
              onChange={event => setReminderForm(prev => ({ ...prev, clientId: event.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">No client</option>
              {clientOptions.map((client: Client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <select
              value={reminderForm.responsibleRole}
              onChange={event => setReminderForm(prev => ({ ...prev, responsibleRole: event.target.value as UserRole | "" }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">Any role</option>
              {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
            </select>
            <select
              value={reminderForm.responsibleUserId || "all"}
              onChange={event => setReminderForm(prev => ({ ...prev, responsibleUserId: event.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="all">All users</option>
              {reminderTargets.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
            </select>
            <select
              value={reminderForm.templateId}
              onChange={event => {
                setReminderForm(prev => ({ ...prev, templateId: event.target.value }));
                if (event.target.value) {
                  applyTemplateToReminder(event.target.value);
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">No template</option>
              {templates.filter(template => !template.archived).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <input
              value={reminderForm.notificationSchedule}
              onChange={event => setReminderForm(prev => ({ ...prev, notificationSchedule: event.target.value }))}
              placeholder="Notification schedule days"
              className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
            <input
              type="number"
              min="0"
              value={reminderForm.amount}
              onChange={event => setReminderForm(prev => ({ ...prev, amount: event.target.value }))}
              placeholder="Amount MWK"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
            <input
              value={reminderForm.description}
              onChange={event => setReminderForm(prev => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
            <input
              value={reminderForm.notes}
              onChange={event => setReminderForm(prev => ({ ...prev, notes: event.target.value }))}
              placeholder="Notes"
              className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
            <div className="md:col-span-1 flex items-center justify-end">
              <button
                type="submit"
                disabled={busy}
                className="bg-slate-900 text-white rounded-lg px-3 py-2 font-bold flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" /> {editingReminderId ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeView === "Templates" && (
        <section className="erp-panel">
          <div className="erp-panel-header">
            <div>
              <h3>Reminder Templates</h3>
              <p>Administrators can create, edit, and archive reusable templates for recurring operations.</p>
            </div>
            <button type="button" onClick={resetTemplateForm} className="erp-link-button flex items-center gap-1">
              <X className="w-4 h-4" /> Reset
            </button>
          </div>

          {canManageTemplates && (
            <form onSubmit={saveTemplate} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs mb-4">
              <input
                required
                value={templateForm.name}
                onChange={event => setTemplateForm(prev => ({ ...prev, name: event.target.value }))}
                placeholder="Template name"
                className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <select
                value={templateForm.category}
                onChange={event => setTemplateForm(prev => ({ ...prev, category: event.target.value as ReminderCategory }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                {REMINDER_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
              <select
                value={templateForm.defaultPriority}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultPriority: event.target.value as ReminderPriority }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                {REMINDER_PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              <select
                value={templateForm.defaultRecurrence}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultRecurrence: event.target.value as ReminderRecurrence }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                {REMINDER_RECURRENCES.map(recurrence => <option key={recurrence} value={recurrence}>{recurrence}</option>)}
              </select>
              <input
                value={templateForm.defaultNotificationSchedule}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultNotificationSchedule: event.target.value }))}
                placeholder="Notification schedule"
                className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <select
                value={templateForm.defaultResponsibleRole}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultResponsibleRole: event.target.value as UserRole | "" }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">Any role</option>
                {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <select
                value={templateForm.defaultResponsibleUserId}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultResponsibleUserId: event.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">Any user</option>
                {reminderTargets.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
              </select>
              <input
                value={templateForm.defaultDepartmentId}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultDepartmentId: event.target.value }))}
                placeholder="Department ID"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <input
                value={templateForm.defaultClientId}
                onChange={event => setTemplateForm(prev => ({ ...prev, defaultClientId: event.target.value }))}
                placeholder="Client ID"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <input
                value={templateForm.description}
                onChange={event => setTemplateForm(prev => ({ ...prev, description: event.target.value }))}
                placeholder="Template description"
                className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <input
                value={templateForm.titleTemplate}
                onChange={event => setTemplateForm(prev => ({ ...prev, titleTemplate: event.target.value }))}
                placeholder="Title template"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <input
                value={templateForm.descriptionTemplate}
                onChange={event => setTemplateForm(prev => ({ ...prev, descriptionTemplate: event.target.value }))}
                placeholder="Description template"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <input
                value={templateForm.notesTemplate}
                onChange={event => setTemplateForm(prev => ({ ...prev, notesTemplate: event.target.value }))}
                placeholder="Notes template"
                className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <input
                value={templateForm.tags}
                onChange={event => setTemplateForm(prev => ({ ...prev, tags: event.target.value }))}
                placeholder="Tags comma separated"
                className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
              <div className="md:col-span-1 flex items-center justify-end">
                <button type="submit" disabled={busy} className="bg-slate-900 text-white rounded-lg px-3 py-2 font-bold flex items-center justify-center gap-1 disabled:opacity-60">
                  <Plus className="w-4 h-4" /> {editingTemplateId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Recurrence</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No reminder templates have been created yet.</td>
                  </tr>
                ) : templates.map(template => (
                  <tr key={template.id} className={template.archived ? "opacity-60" : ""}>
                    <td>
                      <strong>{template.name}</strong>
                      <small>{template.description || "Reusable reminder template"}</small>
                    </td>
                    <td>{template.category}</td>
                    <td>{template.defaultPriority}</td>
                    <td>{template.defaultRecurrence}</td>
                    <td>{template.archived ? "Archived" : "Active"}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {canManageTemplates && (
                          <>
                            <button type="button" onClick={() => loadTemplateForEdit(template)} className="erp-link-button"><Edit2 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleArchiveTemplate(template.id)} className="erp-link-button">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeView !== "Templates" && (
        <section className="erp-panel">
          <div className="erp-panel-header">
            <div>
              <h3>{reminderViewConfig.find(view => view.id === activeView)?.label}</h3>
              <p>{activeView === "History" ? "Delivery records and notification dispatch history." : "Live reminders sourced from the database and filtered by role scope."}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal className="w-4 h-4" />
              {activeView === "Overdue" ? "Overdue updates are refreshed by the scheduler." : "Notifications are generated automatically by the engine."}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                {activeView === "History" ? (
                  <tr>
                    <th>Notification</th>
                    <th>Reminder</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                ) : (
                  <tr>
                    <th>Reminder</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Due</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeView === "History" ? (
                  notificationHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No notification history is available for the current scope.</td>
                    </tr>
                  ) : notificationHistory.map(notification => {
                    const reminder = db.reminders.find(item => item.id === notification.reminderId);
                    return (
                      <tr key={notification.id}>
                        <td>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                        </td>
                        <td>{reminder?.title || "-"}</td>
                        <td>{notification.type}</td>
                        <td>{notification.status || "sent"}</td>
                        <td>{formatDate(notification.createdAt)}</td>
                        <td className="text-right">
                          <span className="erp-status">{notification.channel || "in-app"}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  visibleReminders.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No reminders match the current filters.</td>
                    </tr>
                  ) : visibleReminders.map(reminder => {
                    const departmentName = db.departments.find(dept => dept.id === reminder.departmentId)?.name || "-";
                    const clientName = db.clients.find(client => client.id === reminder.clientId)?.name || "-";
                    const canModify = userRole === UserRole.ADMIN ||
                      userRole === UserRole.ASSET_MANAGER ||
                      (userRole === UserRole.DEPT_MANAGER && reminder.departmentId === currentDepartmentId) ||
                      reminder.responsibleUserId === currentUserId ||
                      reminder.assignedTo === currentUserId;
                    const canComplete = canModify && reminder.status !== "Completed" && reminder.status !== "Cancelled";
                    return (
                      <tr key={reminder.id}>
                        <td>
                          <strong>{reminder.title}</strong>
                          <small>{reminder.description || reminder.notes || formatReminderSummary(reminder)}</small>
                          <small>{departmentName} {clientName !== "-" ? `| ${clientName}` : ""}</small>
                        </td>
                        <td>{reminder.priority}</td>
                        <td>{reminder.category}</td>
                        <td>
                          {formatDate(reminder.dueDate)}
                          <small>{getReminderDueDelta(reminder.dueDate) < 0 ? "Overdue" : getReminderDueDelta(reminder.dueDate) === 0 ? "Due today" : `${getReminderDueDelta(reminder.dueDate)} days left`}</small>
                        </td>
                        <td>{scheduleToString(reminder.notificationSchedule)}</td>
                        <td><span className="erp-status">{reminder.status}</span></td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            {canModify && (
                              <button type="button" onClick={() => loadReminderForEdit(reminder)} className="erp-link-button" title="Edit reminder">
                                <SquarePen className="w-4 h-4" />
                              </button>
                            )}
                            {canComplete && (
                              <button type="button" onClick={() => completeReminder(reminder.id, currentUserId, currentUser?.name || userRole)} className="erp-link-button" title="Mark complete">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {canModify && reminder.status !== "Completed" && reminder.status !== "Cancelled" && (
                              <button type="button" onClick={() => handleSnooze(reminder.id)} className="erp-link-button" title="Snooze one day">
                                <Clock3 className="w-4 h-4" />
                              </button>
                            )}
                            {userRole === UserRole.ADMIN && reminder.status !== "Cancelled" && (
                              <button type="button" onClick={() => updateReminderStatus(reminder.id, "Cancelled", "Reminder Archived")} className="erp-link-button" title="Archive reminder">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="erp-panel">
        <div className="erp-panel-header">
          <div>
            <h3>Scope and Access</h3>
            <p>Role rules are enforced before any reminder becomes visible or editable.</p>
          </div>
          <Users className="w-5 h-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">Administrator</div>
            <div className="text-slate-500">Full access across reminders, templates, exports, and archives.</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">Asset Manager</div>
            <div className="text-slate-500">Create and manage operational reminders.</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">Department Manager</div>
            <div className="text-slate-500">Department-scoped reminder management only.</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">Auditor</div>
            <div className="text-slate-500">Read-only access with export and print support.</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">Employee</div>
            <div className="text-slate-500">Personal assigned reminders only.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
