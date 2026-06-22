/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileText,
  Filter,
  ImagePlus,
  Lock,
  PenTool,
  Printer,
  QrCode,
  Save,
  Search,
  ShieldCheck,
  Signature,
  Sparkles,
  Table2,
  Trash2,
  Upload,
  User,
  Users,
  X
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  addAuditRecord,
  formatCurrency,
  formatDate,
  getDatabaseState,
  saveDatabaseState,
  subscribeToDatabaseState
} from "../db";
import {
  DocumentApprovalStatus,
  DocumentExportFormat,
  DocumentRecord,
  DocumentTemplate,
  DocumentSignature,
  DocumentScope,
  UserRole
} from "../types";

type CenterTab = "Generate" | "Library" | "Editor" | "Templates" | "History";
type DocumentType =
  | "Asset Handover Form"
  | "Asset Return Form"
  | "Asset Transfer Form"
  | "Maintenance Report"
  | "Verification Report"
  | "Disposal Certificate"
  | "Asset Register"
  | "Client Asset Statement"
  | "Inventory Report"
  | "Audit Report"
  | "User Activity Report"
  | "Custom Report"
  | "Receipt";

type ReceiptCategory =
  | "Asset Purchase"
  | "Maintenance Payment"
  | "Repair Cost"
  | "Supplier Payment"
  | "Internet Bundle"
  | "Utility Payment"
  | "Office Expense";

interface DocumentsPrintCenterProps {
  userRole: UserRole;
  currentUserId: string;
}

const DOCUMENT_TYPES: Array<{ id: DocumentType; label: string; hint: string }> = [
  { id: "Asset Handover Form", label: "Asset Handover", hint: "Assignment, custody and sign-off" },
  { id: "Asset Return Form", label: "Asset Return", hint: "Returns and recovery" },
  { id: "Asset Transfer Form", label: "Asset Transfer", hint: "Relocation and approval trail" },
  { id: "Maintenance Report", label: "Maintenance Report", hint: "Repair and service records" },
  { id: "Verification Report", label: "Verification Report", hint: "Physical verification evidence" },
  { id: "Disposal Certificate", label: "Disposal Certificate", hint: "Retirement and disposal approvals" },
  { id: "Asset Register", label: "Asset Register", hint: "Live asset register" },
  { id: "Client Asset Statement", label: "Client Statement", hint: "Assets by client" },
  { id: "Inventory Report", label: "Inventory Report", hint: "Category and location inventory" },
  { id: "Audit Report", label: "Audit Report", hint: "Audit trail summaries" },
  { id: "User Activity Report", label: "User Activity", hint: "User logins and actions" },
  { id: "Receipt", label: "Receipt", hint: "Automated and manual receipts" },
  { id: "Custom Report", label: "Custom Report", hint: "Free-form branded output" }
];

const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  "Asset Purchase",
  "Maintenance Payment",
  "Repair Cost",
  "Supplier Payment",
  "Internet Bundle",
  "Utility Payment",
  "Office Expense"
];

const APPROVAL_LABELS: DocumentApprovalStatus[] = ["Draft", "Pending Approval", "Approved", "Archived"];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripHtml(value: string): string {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function crc32(data: Uint8Array): number {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)) >>> 0;
      }
      t[i] = c >>> 0;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  files.forEach(file => {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + nameBytes.length + file.data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.data.length, true);
    localView.setUint32(22, file.data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(file.data, 30 + nameBytes.length);
    chunks.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.data.length, true);
    centralView.setUint32(24, file.data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralChunks.push(central);

    offset += local.length;
  });

  const centralStart = offset;
  const centralData = concatUint8Arrays(centralChunks);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralData.length, true);
  endView.setUint32(16, centralStart, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([...chunks, centralData, end]);
}

function buildDocxBlob(title: string, html: string): Blob {
  const encoder = new TextEncoder();
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const blocks: string[] = [];
  doc.body.querySelectorAll("h1,h2,h3,h4,p,li,div,table,tr").forEach(node => {
    const text = stripHtml(node.outerHTML);
    if (text) blocks.push(text);
  });
  if (blocks.length === 0) {
    const fallback = stripHtml(html);
    if (fallback) blocks.push(fallback);
  }

  const paragraphs = blocks.map(line => `
    <w:p>
      <w:r><w:t xml:space="preserve">${escapeHtml(line)}</w:t></w:r>
    </w:p>
  `).join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
    xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:w10="urn:schemas-microsoft-com:office:word"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
    xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
    xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
    xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
    xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    mc:Ignorable="w14 wp14">
    <w:body>
      <w:p><w:r><w:t xml:space="preserve">${escapeHtml(title)}</w:t></w:r></w:p>
      ${paragraphs}
      <w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      </w:sectPr>
    </w:body>
  </w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  </Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  </Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  const files = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(wordRels) }
  ];

  return new Blob([makeZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

function htmlToPdf(doc: jsPDF, title: string, html: string, organization: string): void {
  const text = stripHtml(html).split(/\s+/).join(" ");
  const lines = doc.splitTextToSize(text || title, 180);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 15, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(organization, 15, 25);
  doc.setLineWidth(0.4);
  doc.line(15, 28, 195, 28);
  let y = 36;
  lines.forEach((line: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 15, y);
    y += 6;
  });
}

function buildDocHtml(title: string, subtitle: string, blocks: string[], organization: string, logo: string, watermark?: string): string {
  const isImageLogo = logo.startsWith("data:image/") || logo.startsWith("http://") || logo.startsWith("https://") || logo.startsWith("blob:");
  const logoHtml = isImageLogo
    ? `<img src="${logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: inherit; display: block;" />`
    : escapeHtml(logo);

  return `
    <div class="center-doc">
      ${watermark ? `<div class="doc-watermark">${escapeHtml(watermark)}</div>` : ""}
      <header class="center-doc__header">
        <div class="center-doc__logo" style="${isImageLogo ? "background: transparent; border: none; overflow: hidden;" : ""}">${logoHtml}</div>
        <div class="center-doc__org">
          <h1>${escapeHtml(organization)}</h1>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <div class="center-doc__title">
          <span>${escapeHtml(title)}</span>
        </div>
      </header>
      <main class="center-doc__body">
        ${blocks.join("")}
      </main>
    </div>`;
}

function fieldCard(label: string, value: string): string {
  return `<div class="doc-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
}

function fieldGrid(fields: Array<{ label: string; value: string }>): string {
  return `<section class="doc-grid">${fields.map(item => fieldCard(item.label, item.value)).join("")}</section>`;
}

function tableBlock(headers: string[], rows: string[][]): string {
  return `
    <section class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr>${headers.map(head => `<th>${escapeHtml(head)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </section>`;
}

function emptyDocHtml(message: string): string {
  return `<div class="doc-empty">${escapeHtml(message)}</div>`;
}

function buildLiveDocument(
  db: ReturnType<typeof getDatabaseState>,
  currentUserId: string,
  userRole: UserRole,
  selectedType: DocumentType,
  selectedAssetId: string,
  selectedClientId: string,
  selectedUserId: string,
  selectedReceiptCategory: ReceiptCategory,
  receiptAmount: string,
  receiptDescription: string,
  customTitle: string,
  customHtml: string,
  selectedTemplateId: string
): Partial<DocumentRecord> {
  const orgName = db.settings.orgName || "FAIMS Malawi Asset Management System";
  const logo = db.settings.logo || "FA";
  const currentUser = db.users.find(user => user.id === currentUserId);
  const asset = db.assets.find(item => item.id === selectedAssetId) || db.assets[0];
  const client = db.clients.find(item => item.id === selectedClientId) || db.clients[0];
  const targetUser = db.users.find(item => item.id === selectedUserId) || currentUser;
  const template = db.documentTemplates.find(item => item.id === selectedTemplateId);
  const now = new Date().toISOString();
  const currentUserName = currentUser?.name || orgName;
  const currentDepartment = currentUser?.departmentId || asset?.departmentId || client?.departmentId;
  const receiptNumber = `RCPT-${Date.now().toString().slice(-6)}`;

  const documentBase = {
    createdBy: currentUserId,
    createdByName: currentUserName,
    modifiedBy: currentUserId,
    modifiedByName: currentUserName,
    createdAt: now,
    updatedAt: now,
    approvalStatus: "Draft" as DocumentApprovalStatus,
    archived: false,
    isAutoGenerated: false,
    signatures: [] as DocumentSignature[],
    attachments: [] as string[],
    printCount: 0
  };

  if (selectedType === "Asset Register") {
    const rows = db.assets.map(item => [
      item.assetTag,
      item.name,
      db.categories.find(cat => cat.id === item.categoryId)?.name || "-",
      db.departments.find(dep => dep.id === item.departmentId)?.name || "-",
      db.locations.find(loc => loc.id === item.locationId)?.name || "-",
      item.condition,
      item.status,
      formatCurrency(item.purchaseCost)
    ]);
    return {
      ...documentBase,
      docType: selectedType,
      title: `${orgName} Asset Register`,
      description: "Live asset register generated from the operational database.",
      htmlContent: buildDocHtml(
        "Asset Register",
        `Live inventory snapshot - ${db.assets.length} assets`,
        [
          fieldGrid([
            { label: "Organization", value: orgName },
            { label: "Currency", value: db.settings.currency || "MWK" },
            { label: "Timezone", value: db.settings.timezone || "Africa/Blantyre" },
            { label: "Date Format", value: db.settings.dateFormat || "DD/MM/YYYY" }
          ]),
          tableBlock(["Tag", "Name", "Category", "Department", "Location", "Condition", "Status", "Cost"], rows)
        ],
        orgName,
        logo,
        "LIVE DATA"
      ),
      plainText: `Asset register for ${orgName}`,
      scope: "global",
      sourceType: "asset-register",
      sourceId: `asset-register-${Date.now()}`,
      sourceFingerprint: JSON.stringify({ assets: db.assets.length, assetsChecksum: db.assets.map(item => item.id).join("|"), selectedType }),
      version: 1,
      receiptNumber,
      amount: 0,
      currency: db.settings.currency || "MWK",
      paymentMethod: "N/A",
      departmentId: currentDepartment,
      tags: ["register", "assets", "live"],
      clientId: client?.id,
      assetId: asset?.id
    };
  }

  if (selectedType === "Client Asset Statement") {
    const clientAssets = db.assets.filter(item => item.clientId === client?.id);
    const rows = clientAssets.map(item => [
      item.assetTag,
      item.name,
      db.categories.find(cat => cat.id === item.categoryId)?.name || "-",
      item.status,
      formatCurrency(item.purchaseCost)
    ]);
    return {
      ...documentBase,
      docType: selectedType,
      title: `${client?.name || "Client"} Asset Statement`,
      description: "Asset statement by client account.",
      htmlContent: buildDocHtml(
        "Client Asset Statement",
        client?.name || "Client",
        [
          fieldGrid([
            { label: "Client", value: client?.name || "-" },
            { label: "Contact", value: client?.contactPerson || "-" },
            { label: "Region", value: client?.region || "-" },
            { label: "District", value: client?.district || "-" }
          ]),
          tableBlock(["Tag", "Asset", "Category", "Status", "Value"], rows)
        ],
        orgName,
        logo,
        "LIVE DATA"
      ),
      plainText: `Client asset statement for ${client?.name || ""}`,
      scope: client ? "client" : "global",
      sourceType: "client-statement",
      sourceId: client?.id || `client-statement-${Date.now()}`,
      sourceFingerprint: JSON.stringify({ clientId: client?.id, assets: clientAssets.map(item => item.id), selectedType }),
      version: 1,
      receiptNumber,
      amount: 0,
      currency: db.settings.currency || "MWK",
      paymentMethod: "N/A",
      departmentId: currentDepartment,
      tags: ["client", "statement"],
      clientId: client?.id,
      assetId: asset?.id
    };
  }

  if (selectedType === "Inventory Report") {
    const summary = db.categories.map(category => {
      const assets = db.assets.filter(item => item.categoryId === category.id);
      return [category.name, String(assets.length), formatCurrency(assets.reduce((sum, item) => sum + item.purchaseCost, 0))];
    });
    return {
      ...documentBase,
      docType: selectedType,
      title: `${orgName} Inventory Report`,
      description: "Live inventory summary grouped by category.",
      htmlContent: buildDocHtml(
        "Inventory Report",
        "Category-level asset balance",
        [
          fieldGrid([
            { label: "Organization", value: orgName },
            { label: "Total Assets", value: String(db.assets.length) },
            { label: "Valuation", value: formatCurrency(db.assets.reduce((sum, item) => sum + item.purchaseCost, 0)) }
          ]),
          tableBlock(["Category", "Count", "Value"], summary)
        ],
        orgName,
        logo,
        "LIVE DATA"
      ),
      plainText: "Inventory report",
      scope: "global",
      sourceType: "inventory-report",
      sourceId: `inventory-report-${Date.now()}`,
      sourceFingerprint: JSON.stringify({ assetCount: db.assets.length, selectedType }),
      version: 1,
      receiptNumber,
      amount: 0,
      currency: db.settings.currency || "MWK",
      paymentMethod: "N/A",
      departmentId: currentDepartment,
      tags: ["inventory", "summary"]
    };
  }

  if (selectedType === "Audit Report") {
    const rows = db.auditLogs.slice(0, 25).map(log => [
      log.timestamp,
      log.userName,
      log.action,
      log.details,
      log.ipAddress
    ]);
    return {
      ...documentBase,
      docType: selectedType,
      title: `${orgName} Audit Report`,
      description: "Operational audit logs compiled from the database.",
      htmlContent: buildDocHtml(
        "Audit Report",
        "Recent operational activity",
        [
          fieldGrid([
            { label: "Audit Entries", value: String(db.auditLogs.length) },
            { label: "Prepared By", value: currentUserName }
          ]),
          tableBlock(["Timestamp", "User", "Action", "Details", "IP"], rows)
        ],
        orgName,
        logo,
        "LIVE DATA"
      ),
      plainText: "Audit report",
      scope: "global",
      sourceType: "audit-report",
      sourceId: `audit-report-${Date.now()}`,
      sourceFingerprint: JSON.stringify({ auditLogCount: db.auditLogs.length, selectedType }),
      version: 1,
      receiptNumber,
      amount: 0,
      currency: db.settings.currency || "MWK",
      paymentMethod: "N/A",
      departmentId: currentDepartment,
      tags: ["audit", "report"]
    };
  }

  if (selectedType === "User Activity Report") {
    const user = targetUser;
    const rows = db.auditLogs.filter(log => log.userId === user?.id).slice(0, 25).map(log => [
      log.timestamp,
      log.action,
      log.details,
      log.ipAddress
    ]);
    return {
      ...documentBase,
      docType: selectedType,
      title: `${user?.name || "User"} Activity Report`,
      description: "User-specific activity ledger.",
      htmlContent: buildDocHtml(
        "User Activity Report",
        user?.name || "User",
        [
          fieldGrid([
            { label: "User", value: user?.name || "-" },
            { label: "Role", value: user?.role || "-" },
            { label: "Department", value: db.departments.find(dep => dep.id === user?.departmentId)?.name || "-" }
          ]),
          tableBlock(["Timestamp", "Action", "Details", "IP"], rows)
        ],
        orgName,
        logo,
        "PERSONAL DATA"
      ),
      plainText: "User activity report",
      scope: "personal",
      sourceType: "user-activity-report",
      sourceId: user?.id || `user-activity-${Date.now()}`,
      sourceFingerprint: JSON.stringify({ userId: user?.id, auditCount: rows.length, selectedType }),
      version: 1,
      receiptNumber,
      amount: 0,
      currency: db.settings.currency || "MWK",
      paymentMethod: "N/A",
      departmentId: user?.departmentId,
      tags: ["user", "activity"],
      clientId: user?.clientId
    };
  }

  if (selectedType === "Receipt") {
    const amount = Number(receiptAmount || 0);
    const reason = receiptDescription || `${selectedReceiptCategory} transaction`;
    return {
      ...documentBase,
      docType: "Receipt",
      title: `${selectedReceiptCategory} Receipt`,
      description: reason,
      htmlContent: buildDocHtml(
        `${selectedReceiptCategory} Receipt`,
        orgName,
        [
          fieldGrid([
            { label: "Receipt Number", value: receiptNumber },
            { label: "Category", value: selectedReceiptCategory },
            { label: "Amount", value: formatCurrency(amount) },
            { label: "Currency", value: db.settings.currency || "MWK" },
            { label: "Date", value: formatDate(new Date().toISOString()) },
            { label: "Printed Timestamp", value: new Date().toLocaleString() },
            { label: "Client", value: client?.name || "Organization" },
            { label: "Payment Method", value: "Cash / Bank / Mobile Money" }
          ]),
          `<div class="doc-note">${escapeHtml(reason)}</div>`,
          `<div class="doc-note">Authorized signature: ______________________</div>`,
          `<div class="doc-note">QR payload: ${escapeHtml(receiptNumber)} | ${escapeHtml(selectedReceiptCategory)}</div>`
        ],
        orgName,
        logo,
        "RECEIPT"
      ),
      plainText: reason,
      scope: client ? "client" : "global",
      sourceType: "receipt",
      sourceId: receiptNumber,
      sourceFingerprint: JSON.stringify({ category: selectedReceiptCategory, amount, reason, clientId: client?.id }),
      version: 1,
      receiptNumber,
      amount,
      currency: db.settings.currency || "MWK",
      paymentMethod: "Cash / Bank / Mobile Money",
      departmentId: currentDepartment,
      clientId: client?.id,
      assetId: asset?.id,
      tags: ["receipt", slugify(selectedReceiptCategory)],
      qrPayload: receiptNumber
    };
  }

  const templateHtml = template?.htmlTemplate || customHtml || `
    <h2>${escapeHtml(customTitle || selectedType)}</h2>
    <p>${escapeHtml(stripHtml(customHtml || "Generate a live document from current database state."))}</p>
  `;

  return {
    ...documentBase,
    docType: selectedType,
    title: customTitle || template?.name || selectedType,
    description: template?.description || stripHtml(customHtml).slice(0, 200),
    htmlContent: buildDocHtml(
      customTitle || template?.name || selectedType,
      orgName,
      [
        fieldGrid([
          { label: "Template", value: template?.name || "Custom" },
          { label: "Author", value: currentUserName },
          { label: "Scope", value: "Custom" }
        ]),
        `<section class="doc-rich">${templateHtml}</section>`
      ],
      orgName,
      logo,
      "CUSTOM"
    ),
    plainText: stripHtml(templateHtml),
    scope: "global",
    sourceType: template ? "template" : "custom",
    sourceId: template?.id || `custom-${Date.now()}`,
    sourceFingerprint: JSON.stringify({ html: templateHtml, customTitle, selectedType, templateId: template?.id }),
    version: 1,
    receiptNumber,
    amount: 0,
    currency: db.settings.currency || "MWK",
    paymentMethod: "N/A",
    departmentId: currentDepartment,
    clientId: client?.id,
    assetId: asset?.id,
    tags: ["custom", slugify(selectedType)]
  };
}

export default function DocumentsPrintCenter({ userRole, currentUserId }: DocumentsPrintCenterProps) {
  const [db, setDb] = useState(() => getDatabaseState());
  const [activeTab, setActiveTab] = useState<CenterTab>("Generate");
  const [selectedType, setSelectedType] = useState<DocumentType>("Asset Register");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedReceiptCategory, setSelectedReceiptCategory] = useState<ReceiptCategory>("Asset Purchase");
  const [receiptAmount, setReceiptAmount] = useState("0");
  const [receiptDescription, setReceiptDescription] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customHtml, setCustomHtml] = useState("<p>Use the editor to write a branded live report.</p>");
  const [customTemplateHtml, setCustomTemplateHtml] = useState("<p>Template content driven by live data.</p>");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateDocType, setTemplateDocType] = useState<DocumentType>("Custom Report");
  const [templateTags, setTemplateTags] = useState("document, live-data");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [search, setSearch] = useState("");
  const [filterDocType, setFilterDocType] = useState<string>("all");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [filterArchived, setFilterArchived] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<DocumentApprovalStatus | "all">("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [editorHtml, setEditorHtml] = useState("<p>Write your document here.</p>");
  const [editorTitle, setEditorTitle] = useState("New Document");
  const [editorDescription, setEditorDescription] = useState("");
  const [editorStatus, setEditorStatus] = useState<DocumentApprovalStatus>("Draft");
  const [editorTags, setEditorTags] = useState("live, branded");
  const [editorAttachments, setEditorAttachments] = useState<string[]>([]);
  const [editorSignatureName, setEditorSignatureName] = useState("");
  const [editorSignaturePurpose, setEditorSignaturePurpose] = useState("Approval");
  const [editorSignatureData, setEditorSignatureData] = useState("");
  const [editorMode, setEditorMode] = useState<"draw" | "upload">("draw");
  const [autosaveState, setAutosaveState] = useState("Ready");
  const [historyFormat, setHistoryFormat] = useState<DocumentExportFormat>("Print");
  const [isGenerating, setIsGenerating] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => subscribeToDatabaseState(() => setDb(getDatabaseState())), []);

  useEffect(() => {
    const currentDocument = db.documents.find(item => item.id === selectedDocumentId);
    if (currentDocument) {
      setEditorHtml(currentDocument.htmlContent);
      setEditorTitle(currentDocument.title);
      setEditorDescription(currentDocument.description);
      setEditorStatus(currentDocument.approvalStatus);
      setEditorTags(currentDocument.tags.join(", "));
      setEditorAttachments(currentDocument.attachments || []);
      if (currentDocument.sourceType === "template") {
        setSelectedTemplateId(currentDocument.sourceId);
      }
    }
  }, [db.documents, selectedDocumentId]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== editorHtml) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [editorHtml]);

  const currentUser = db.users.find(user => user.id === currentUserId);
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  const canCreateTemplates = userRole === UserRole.ADMIN;
  const canViewAll = userRole === UserRole.ADMIN || userRole === UserRole.AUDITOR;
  const canCreateAssetDocs = userRole === UserRole.ADMIN || userRole === UserRole.ASSET_MANAGER;
  const canCreateDepartmentDocs = userRole === UserRole.ADMIN || userRole === UserRole.DEPT_MANAGER;
  const canPersonalView = userRole === UserRole.EMPLOYEE;

  const accessibleDocuments = useMemo(() => {
    return db.documents.filter(doc => {
      if (filterDocType !== "all" && doc.docType !== filterDocType) return false;
      if (filterScope !== "all" && doc.scope !== filterScope) return false;
      if (approvalFilter !== "all" && doc.approvalStatus !== approvalFilter) return false;
      if (filterArchived && !doc.archived) return false;
      if (search.trim()) {
        const blob = `${doc.title} ${doc.description} ${doc.plainText} ${doc.tags.join(" ")}`.toLowerCase();
        if (!blob.includes(search.toLowerCase())) return false;
      }
      if (canViewAll) return true;
      if (userRole === UserRole.DEPT_MANAGER) {
        return doc.departmentId === currentUser?.departmentId || doc.scope === "department";
      }
      if (userRole === UserRole.ASSET_MANAGER) {
        return doc.scope !== "global" || doc.departmentId === currentUser?.departmentId || doc.scope === "asset";
      }
      if (userRole === UserRole.EMPLOYEE) {
        return doc.scope === "personal" || doc.createdBy === currentUserId || doc.modifiedBy === currentUserId;
      }
      return true;
    });
  }, [approvalFilter, canViewAll, currentUser?.departmentId, currentUserId, db.documents, filterArchived, filterDocType, filterScope, search, userRole]);

  const previewDocument = accessibleDocuments.find(doc => doc.id === previewId) || db.documents.find(doc => doc.id === previewId) || null;
  const activeTemplates = db.documentTemplates.filter(template => !template.archived);
  const receiptDocs = db.documents.filter(doc => doc.docType === "Receipt" || doc.docType.includes("Receipt"));
  const stats = useMemo(() => ({
    total: db.documents.length,
    receipts: receiptDocs.length,
    templates: activeTemplates.length,
    pending: db.documents.filter(doc => doc.approvalStatus === "Pending Approval").length
  }), [activeTemplates.length, db.documents.length, receiptDocs.length]);

  const persist = (next: ReturnType<typeof getDatabaseState>) => {
    saveDatabaseState(next);
    setDb(getDatabaseState());
  };

  const createDocument = () => {
    setIsGenerating(true);
    const next = getDatabaseState();
    const live = buildLiveDocument(
      next,
      currentUserId,
      userRole,
      selectedType,
      selectedAssetId || next.assets[0]?.id || "",
      selectedClientId || next.clients[0]?.id || "",
      selectedUserId || next.users[0]?.id || "",
      selectedReceiptCategory,
      receiptAmount,
      receiptDescription,
      customTitle,
      customHtml,
      selectedTemplateId
    );
    const document: DocumentRecord = {
      id: `doc-${slugify(selectedType)}-${Date.now()}`,
      docType: selectedType,
      title: String(live.title || selectedType),
      description: String(live.description || ""),
      htmlContent: String(live.htmlContent || ""),
      plainText: String(live.plainText || stripHtml(String(live.htmlContent || ""))),
      scope: (live.scope || "global") as DocumentScope,
      sourceType: String(live.sourceType || "custom"),
      sourceId: String(live.sourceId || Date.now()),
      sourceFingerprint: String(live.sourceFingerprint || ""),
      version: 1,
      approvalStatus: (live.approvalStatus || "Draft") as DocumentApprovalStatus,
      createdBy: String(live.createdBy || currentUserId),
      createdByName: String(live.createdByName || currentUser?.name || "FAIMS"),
      modifiedBy: String(live.modifiedBy || currentUserId),
      modifiedByName: String(live.modifiedByName || currentUser?.name || "FAIMS"),
      createdAt: String(live.createdAt || new Date().toISOString()),
      updatedAt: String(live.updatedAt || new Date().toISOString()),
      archived: Boolean(live.archived),
      isAutoGenerated: false,
      receiptNumber: live.receiptNumber as string | undefined,
      amount: typeof live.amount === "number" ? live.amount : Number(receiptAmount || 0),
      currency: String(live.currency || next.settings.currency || "MWK"),
      paymentMethod: String(live.paymentMethod || "N/A"),
      clientId: String(live.clientId || selectedClientId || ""),
      assetId: String(live.assetId || selectedAssetId || ""),
      departmentId: String(live.departmentId || currentUser?.departmentId || ""),
      tags: String(live.tags ? live.tags.join(",") : editorTags).split(",").map(tag => tag.trim()).filter(Boolean),
      attachments: [],
      signatures: [],
      printCount: 0,
      qrPayload: live.qrPayload as string | undefined
    };
    next.documents.unshift(document);
    persist(next);
    setPreviewId(document.id);
    setSelectedDocumentId(document.id);
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Document Created", `${document.docType}: ${document.title}`);
    setIsGenerating(false);
  };

  const saveCurrentDraft = () => {
    const next = getDatabaseState();
    const now = new Date().toISOString();
    const existing = selectedDocumentId ? next.documents.find(doc => doc.id === selectedDocumentId) : undefined;
    const nextDoc: DocumentRecord = {
      id: existing?.id || `doc-custom-${Date.now()}`,
      docType: templateDocType,
      title: editorTitle || templateName || "Custom Document",
      description: editorDescription,
      htmlContent: editorHtml,
      plainText: stripHtml(editorHtml),
      scope: existing?.scope || "global",
      sourceType: existing?.sourceType || "custom",
      sourceId: existing?.sourceId || `custom-${Date.now()}`,
      sourceFingerprint: JSON.stringify({ html: editorHtml, title: editorTitle, description: editorDescription, tags: editorTags, attachments: editorAttachments }),
      version: existing?.version ? existing.version + 1 : 1,
      approvalStatus: editorStatus,
      createdBy: existing?.createdBy || currentUserId,
      createdByName: existing?.createdByName || currentUser?.name || "FAIMS",
      modifiedBy: currentUserId,
      modifiedByName: currentUser?.name || "FAIMS",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      archived: existing?.archived || false,
      isAutoGenerated: false,
      receiptNumber: existing?.receiptNumber,
      amount: existing?.amount,
      currency: existing?.currency || next.settings.currency || "MWK",
      paymentMethod: existing?.paymentMethod,
      clientId: existing?.clientId,
      assetId: existing?.assetId,
      departmentId: existing?.departmentId || currentUser?.departmentId || "",
      tags: editorTags.split(",").map(item => item.trim()).filter(Boolean),
      attachments: editorAttachments,
      signatures: existing?.signatures || [],
      printCount: existing?.printCount || 0,
      lastPrintedAt: existing?.lastPrintedAt,
      qrPayload: existing?.qrPayload
    };
    const idx = next.documents.findIndex(doc => doc.id === nextDoc.id);
    if (idx !== -1) {
      next.documents[idx] = nextDoc;
    } else {
      next.documents.unshift(nextDoc);
    }
    persist(next);
    setSelectedDocumentId(nextDoc.id);
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Document Edited", `${nextDoc.docType}: ${nextDoc.title}`);
    setAutosaveState("Saved");
  };

  const saveTemplate = () => {
    if (!canCreateTemplates) return;
    const next = getDatabaseState();
    const now = new Date().toISOString();
    const current = selectedTemplateId ? next.documentTemplates.find(template => template.id === selectedTemplateId) : undefined;
    const template: DocumentTemplate = {
      id: current?.id || `tmpl-${slugify(templateName || templateDocType)}-${Date.now()}`,
      name: templateName || `${templateDocType} Template`,
      docType: templateDocType,
      description: templateDescription || "Reusable live-data template",
      htmlTemplate: customTemplateHtml,
      version: current?.version ? current.version + 1 : 1,
      archived: current?.archived || false,
      createdBy: current?.createdBy || currentUserId,
      createdByName: current?.createdByName || currentUser?.name || "FAIMS",
      modifiedBy: currentUserId,
      modifiedByName: currentUser?.name || "FAIMS",
      createdAt: current?.createdAt || now,
      updatedAt: now,
      tags: templateTags.split(",").map(item => item.trim()).filter(Boolean)
    };
    const idx = next.documentTemplates.findIndex(item => item.id === template.id);
    if (idx !== -1) {
      next.documentTemplates[idx] = template;
    } else {
      next.documentTemplates.unshift(template);
    }
    persist(next);
    setSelectedTemplateId(template.id);
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Template Saved", `${template.name}`);
  };

  const archiveTemplate = (id: string) => {
    const next = getDatabaseState();
    const template = next.documentTemplates.find(item => item.id === id);
    if (!template) return;
    template.archived = true;
    template.updatedAt = new Date().toISOString();
    persist(next);
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Template Archived", template.name);
  };

  const archiveDocument = (id: string) => {
    const next = getDatabaseState();
    const doc = next.documents.find(item => item.id === id);
    if (!doc) return;
    doc.archived = true;
    doc.approvalStatus = "Archived";
    doc.archivedAt = new Date().toISOString();
    doc.updatedAt = doc.archivedAt;
    persist(next);
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Document Archived", doc.title);
  };

  const addSignature = () => {
    if (!selectedDocumentId || !editorSignatureName.trim()) return;
    const next = getDatabaseState();
    const doc = next.documents.find(item => item.id === selectedDocumentId);
    if (!doc) return;
    const signature: DocumentSignature = {
      id: `sig-${Date.now()}`,
      signerId: currentUserId,
      signerName: editorSignatureName.trim(),
      signerRole: currentUser?.role,
      signedAt: new Date().toISOString(),
      signatureData: editorSignatureData || undefined,
      purpose: editorSignaturePurpose
    };
    doc.signatures = [...doc.signatures, signature];
    doc.approvalStatus = "Approved";
    doc.updatedAt = signature.signedAt;
    persist(next);
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Signature Approved", `${doc.title} signed by ${signature.signerName}`);
  };

  const exportDocument = (format: DocumentExportFormat, doc: DocumentRecord) => {
    const currentOrg = db.settings.orgName || "FAIMS Malawi Asset Management System";
    if (format === "PDF") {
      const pdf = new jsPDF("p", "mm", "a4");
      htmlToPdf(pdf, doc.title, doc.htmlContent, currentOrg);
      pdf.save(`${slugify(doc.title || doc.docType)}.pdf`);
    } else if (format === "Excel") {
      const workbook = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
          <head><meta charset="UTF-8"></head>
          <body>${doc.htmlContent}</body>
        </html>`;
      downloadBlob(new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" }), `${slugify(doc.title || doc.docType)}.xls`);
    } else if (format === "Word") {
      downloadBlob(buildDocxBlob(doc.title, doc.htmlContent), `${slugify(doc.title || doc.docType)}.docx`);
    } else if (format === "CSV") {
      downloadBlob(new Blob([stripHtml(doc.htmlContent)], { type: "text/csv;charset=utf-8" }), `${slugify(doc.title || doc.docType)}.csv`);
    } else {
      const printWindow = window.open("", "_blank", "width=1200,height=900");
      if (!printWindow) return;
      printWindow.document.write(`
        <html><head><title>${escapeHtml(doc.title)}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;color:#111}
          .center-doc{max-width:900px;margin:0 auto}
          .center-doc__header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:1px solid #ccc;padding-bottom:16px;margin-bottom:16px}
          .center-doc__logo{width:54px;height:54px;border-radius:12px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}.center-doc__logo img{width:100%;height:100%;object-fit:contain;border-radius:inherit;display:block}
          .doc-table{width:100%;border-collapse:collapse}
          .doc-table th,.doc-table td{border:1px solid #ccc;padding:8px;text-align:left}
          .doc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:16px 0}
          .doc-field{border:1px solid #ddd;border-radius:12px;padding:10px}
          .doc-field span{display:block;font-size:11px;color:#666;text-transform:uppercase}
          .doc-field strong{display:block;font-size:13px;margin-top:4px}
        </style></head><body>${doc.htmlContent}</body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Print Action", `${doc.title} sent to preview print queue`);
    }
    const next = getDatabaseState();
    const stored = next.documents.find(item => item.id === doc.id);
    if (stored) {
      stored.printCount += 1;
      stored.lastPrintedAt = new Date().toISOString();
      next.printHistory.unshift({
        id: `ph-${Date.now()}`,
        documentId: doc.id,
        documentTitle: doc.title,
        documentType: doc.docType,
        exportedFormat: format,
        printedBy: currentUserId,
        printedByName: currentUser?.name || "FAIMS",
        printedAt: new Date().toISOString(),
        organization: currentOrg
      });
      persist(next);
    }
    addAuditRecord(currentUserId, currentUser?.name || "FAIMS", "Document Exported", `${doc.title} exported as ${format}`);
  };

  const selectedPreviewHtml = previewDocument?.htmlContent || editorHtml;
  const canCreateDepartmentDocsNow = canCreateAssetDocs || canCreateDepartmentDocs || canViewAll || canPersonalView;

  return (
    <div className="space-y-6">
      <style>{`
        .center-doc__header,.doc-grid,.doc-table-wrap,.doc-rich,.doc-note,.doc-empty,.doc-watermark{margin-bottom:16px}
        .center-doc{position:relative;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);border:1px solid #e2e8f0;border-radius:20px;padding:20px;overflow:hidden}
        .doc-watermark{position:absolute;inset:auto 16px 16px auto;font-size:48px;font-weight:900;color:rgba(15,23,42,0.04);transform:rotate(-18deg);pointer-events:none}
        .center-doc__header{display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:start}
        .center-doc__logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900}
        .center-doc__logo img{width:100%;height:100%;object-fit:contain;border-radius:inherit;display:block}
        .center-doc__org h1{margin:0;font-size:18px;color:#0f172a}
        .center-doc__org p{margin:4px 0 0;color:#64748b;font-size:12px}
        .center-doc__title span{display:inline-flex;padding:6px 10px;border-radius:999px;background:#ecfeff;color:#0f766e;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
        .doc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
        .doc-field{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px}
        .doc-field span{display:block;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
        .doc-field strong{display:block;margin-top:4px;color:#0f172a;font-size:13px}
        .doc-table{width:100%;border-collapse:collapse;font-size:12px}
        .doc-table th,.doc-table td{border:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}
        .doc-table th{background:#0f172a;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
        .doc-note,.doc-empty{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;padding:14px;color:#475569;font-size:12px}
        .tool-card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:16px}
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
        <div className="tool-card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                <Building2 className="w-3.5 h-3.5" /> Documents & Print Center
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">Enterprise Document Management</h2>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                Generate live documents, store them with versions, sign them digitally, and export them for print or office distribution.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Documents</span>
                <strong className="text-xl">{stats.total}</strong>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Receipts</span>
                <strong className="text-xl">{stats.receipts}</strong>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Templates</span>
                <strong className="text-xl">{stats.templates}</strong>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Pending</span>
                <strong className="text-xl">{stats.pending}</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["Generate", "Library", "Editor", "Templates", "History"] as CenterTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-full text-xs font-bold border transition-colors ${
                  activeTab === tab
                    ? "bg-emerald-500 text-slate-950 border-emerald-400"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Role Access</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div>Administrator: full access</div>
            <div>Asset Manager: create and print asset documents</div>
            <div>Department Manager: department reports only</div>
            <div>Auditor: read and print only</div>
            <div>Employee: personal documents only</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="space-y-6">
          {activeTab === "Generate" && (
            <div className="tool-card space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Generate From Live Data</h3>
                  <p className="text-xs text-slate-500">Each document is built from the current database snapshot.</p>
                </div>
                <button
                  type="button"
                  onClick={createDocument}
                  disabled={isGenerating || (!canCreateAssetDocs && selectedType !== "Custom Report" && selectedType !== "Receipt" && !canViewAll && !canCreateDepartmentDocsNow)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> {isGenerating ? "Generating..." : "Create Document"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Document Type</label>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as DocumentType)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    {DOCUMENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Source Template</label>
                  <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">No template</option>
                    {db.documentTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Asset</label>
                  <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Live default</option>
                    {db.assets.map(asset => <option key={asset.id} value={asset.id}>{asset.assetTag} - {asset.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Client</label>
                  <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Organization</option>
                    {db.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">User</label>
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Current user</option>
                    {db.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Receipt Category</label>
                  <select value={selectedReceiptCategory} onChange={(e) => setSelectedReceiptCategory(e.target.value as ReceiptCategory)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    {RECEIPT_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Receipt Amount</label>
                  <input value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Receipt / Report Description</label>
                <input value={receiptDescription} onChange={(e) => setReceiptDescription(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Reference description from live transaction data" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Custom Title</label>
                <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Branded document title" />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Generated Preview</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Live data only</span>
                </div>
                <div className="center-doc" dangerouslySetInnerHTML={{ __html: selectedPreviewHtml || emptyDocHtml("Generate a document to preview it here.") }} />
              </div>
            </div>
          )}

          {activeTab === "Library" && (
            <div className="tool-card space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-sm" placeholder="Search documents" />
                </div>
                <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All types</option>
                  {DOCUMENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
                <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All scopes</option>
                  <option value="global">Global</option>
                  <option value="department">Department</option>
                  <option value="personal">Personal</option>
                  <option value="asset">Asset</option>
                  <option value="client">Client</option>
                </select>
                <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value as any)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="all">All approval states</option>
                  {APPROVAL_LABELS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={filterArchived} onChange={(e) => setFilterArchived(e.target.checked)} />
                Show archived documents
              </label>

              <div className="grid gap-3">
                {accessibleDocuments.map(doc => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
                          <span>{doc.docType}</span>
                          <span>Version {doc.version}</span>
                          <span>{doc.approvalStatus}</span>
                          {doc.archived && <span>Archived</span>}
                        </div>
                        <h4 className="mt-1 font-bold text-slate-900">{doc.title}</h4>
                        <p className="text-xs text-slate-500">{doc.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setPreviewId(doc.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Preview</button>
                        <button type="button" onClick={() => exportDocument(historyFormat, doc)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">Print</button>
                        <button type="button" onClick={() => setSelectedDocumentId(doc.id)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Edit</button>
                        <button type="button" onClick={() => archiveDocument(doc.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Archive</button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span>By {doc.createdByName}</span>
                      <span>Updated {formatDate(doc.updatedAt)}</span>
                      <span>Prints {doc.printCount}</span>
                      {doc.receiptNumber && <span>Receipt {doc.receiptNumber}</span>}
                    </div>
                  </div>
                ))}
                {accessibleDocuments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No documents match the current filters.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Editor" && (
            <div className="tool-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Document Editor</h3>
                  <p className="text-xs text-slate-500">Autosave is enabled for the active draft.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditorMode("draw")} className={`rounded-xl px-3 py-2 text-xs font-bold ${editorMode === "draw" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Draw</button>
                  <button type="button" onClick={() => setEditorMode("upload")} className={`rounded-xl px-3 py-2 text-xs font-bold ${editorMode === "upload" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Upload</button>
                  <button type="button" onClick={saveCurrentDraft} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white inline-flex items-center gap-1.5"><Save className="w-4 h-4" /> Save Draft</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Document title" />
                <input value={editorDescription} onChange={(e) => setEditorDescription(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Description" />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => document.execCommand("bold")} className="rounded-lg border px-3 py-2 text-xs font-bold">Bold</button>
                <button type="button" onClick={() => document.execCommand("italic")} className="rounded-lg border px-3 py-2 text-xs font-bold">Italic</button>
                <button type="button" onClick={() => document.execCommand("insertOrderedList")} className="rounded-lg border px-3 py-2 text-xs font-bold">Numbered</button>
                <button type="button" onClick={() => document.execCommand("insertUnorderedList")} className="rounded-lg border px-3 py-2 text-xs font-bold">Bullets</button>
                <button type="button" onClick={() => document.execCommand("formatBlock", false, "H2")} className="rounded-lg border px-3 py-2 text-xs font-bold">Heading</button>
                <button type="button" onClick={() => document.execCommand("insertHorizontalRule")} className="rounded-lg border px-3 py-2 text-xs font-bold">Rule</button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Rich text body
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    setEditorHtml((e.currentTarget as HTMLDivElement).innerHTML);
                    setAutosaveState("Editing...");
                  }}
                  className="min-h-[320px] p-4 outline-none prose max-w-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={editorTags} onChange={(e) => setEditorTags(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tags, comma separated" />
                <select value={editorStatus} onChange={(e) => setEditorStatus(e.target.value as DocumentApprovalStatus)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {APPROVAL_LABELS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <select value={templateDocType} onChange={(e) => setTemplateDocType(e.target.value as DocumentType)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {DOCUMENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Signature className="w-4 h-4" /> Digital Signature
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setEditorMode("draw")} className={`rounded-lg px-3 py-2 text-xs font-bold ${editorMode === "draw" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Draw</button>
                    <button type="button" onClick={() => setEditorMode("upload")} className={`rounded-lg px-3 py-2 text-xs font-bold ${editorMode === "upload" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>Upload</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={160}
                    className="w-full h-40 rounded-2xl border border-dashed border-slate-300 bg-white"
                    onMouseDown={(e) => {
                      if (editorMode !== "draw") return;
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      drawing.current = true;
                      lastPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                    }}
                    onMouseMove={(e) => {
                      if (!drawing.current || editorMode !== "draw") return;
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext("2d");
                      if (!ctx || !lastPoint.current) return;
                      const nextPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                      ctx.lineWidth = 2.5;
                      ctx.lineCap = "round";
                      ctx.strokeStyle = "#0f172a";
                      ctx.beginPath();
                      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
                      ctx.lineTo(nextPoint.x, nextPoint.y);
                      ctx.stroke();
                      lastPoint.current = nextPoint;
                      setEditorSignatureData(canvas.toDataURL("image/png"));
                    }}
                    onMouseUp={() => {
                      drawing.current = false;
                      lastPoint.current = null;
                    }}
                    onMouseLeave={() => {
                      drawing.current = false;
                      lastPoint.current = null;
                    }}
                  />
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input value={editorSignatureName} onChange={(e) => setEditorSignatureName(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Signer name" />
                    <input value={editorSignaturePurpose} onChange={(e) => setEditorSignaturePurpose(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Purpose" />
                    <button type="button" onClick={addSignature} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">Attach Signature</button>
                  </div>
                  {editorSignatureData && <img src={editorSignatureData} alt="signature" className="mt-3 max-h-20 rounded-xl border border-slate-200 bg-white" />}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Upload className="w-4 h-4" /> Attachments
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const readers = files.map(file => new Promise<string>(resolve => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.readAsDataURL(file);
                      }));
                      Promise.all(readers).then(items => setEditorAttachments(prev => [...prev, ...items]));
                    }}
                    className="w-full text-sm"
                  />
                  <div className="mt-3 space-y-2 max-h-40 overflow-auto">
                    {editorAttachments.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs">
                        <span className="truncate">Attachment {index + 1}</span>
                        <button type="button" onClick={() => setEditorAttachments(prev => prev.filter((_, idx) => idx !== index))} className="text-rose-600">
                          Remove
                        </button>
                      </div>
                    ))}
                    {editorAttachments.length === 0 && <div className="text-xs text-slate-400">No attachments yet.</div>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>{autosaveState}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditorHtml("<p>Start your live document here.</p>")} className="rounded-xl border border-slate-200 px-3 py-2 font-bold">Reset</button>
                  <button type="button" onClick={saveCurrentDraft} className="rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white">Save Draft</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Templates" && (
            <div className="tool-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Template Library</h3>
                  <p className="text-xs text-slate-500">Administrators can create, edit, and archive templates.</p>
                </div>
                <button type="button" disabled={!canCreateTemplates} onClick={saveTemplate} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                  Save Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Template name" />
                <input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Description" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={templateDocType} onChange={(e) => setTemplateDocType(e.target.value as DocumentType)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {DOCUMENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
                <input value={templateTags} onChange={(e) => setTemplateTags(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Template tags" />
              </div>
              <textarea value={customTemplateHtml} onChange={(e) => setCustomTemplateHtml(e.target.value)} className="min-h-[220px] w-full rounded-2xl border border-slate-200 p-4 text-sm font-mono" />

              <div className="space-y-3">
                {activeTemplates.map(template => (
                  <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900">{template.name}</h4>
                        <p className="text-xs text-slate-500">{template.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSelectedTemplateId(template.id)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Load</button>
                        <button type="button" onClick={() => archiveTemplate(template.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Archive</button>
                      </div>
                    </div>
                  </div>
                ))}
                {activeTemplates.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No templates yet.</div>}
              </div>
            </div>
          )}

          {activeTab === "History" && (
            <div className="tool-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Print History</h3>
                  <p className="text-xs text-slate-500">Track exports and print actions with time stamps.</p>
                </div>
                <select value={historyFormat} onChange={(e) => setHistoryFormat(e.target.value as DocumentExportFormat)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Print">Print</option>
                  <option value="PDF">PDF</option>
                  <option value="Word">Word</option>
                  <option value="Excel">Excel</option>
                  <option value="CSV">CSV</option>
                </select>
              </div>
              <div className="space-y-3">
                {db.printHistory.slice(0, 40).map(entry => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900">{entry.documentTitle}</h4>
                        <p className="text-xs text-slate-500">{entry.documentType} - {entry.exportedFormat}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">{entry.printedAt}</span>
                    </div>
                  </div>
                ))}
                {db.printHistory.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No print actions yet.</div>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="tool-card">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Filters</span>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div>Scope: {filterScope}</div>
              <div>Approval: {approvalFilter}</div>
              <div>Role: {userRole}</div>
              <div>Organization: {db.settings.orgName}</div>
            </div>
          </div>

          <div className="tool-card">
            <div className="flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Preview & Export</span>
            </div>
            {previewDocument ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">{previewDocument.docType}</div>
                  <h4 className="mt-1 font-bold text-slate-900">{previewDocument.title}</h4>
                  <p className="text-xs text-slate-500">{previewDocument.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["PDF", "Excel", "Word", "CSV", "Print"] as DocumentExportFormat[]).map(format => (
                    <button key={format} type="button" onClick={() => exportDocument(format, previewDocument)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">
                      {format}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div dangerouslySetInnerHTML={{ __html: previewDocument.htmlContent }} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Select a document to preview.
              </div>
            )}
          </div>

          <div className="tool-card space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Data Snapshot</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3">Assets: {db.assets.length}</div>
              <div className="rounded-xl bg-slate-50 p-3">Clients: {db.clients.length}</div>
              <div className="rounded-xl bg-slate-50 p-3">Users: {db.users.length}</div>
              <div className="rounded-xl bg-slate-50 p-3">Audit Logs: {db.auditLogs.length}</div>
            </div>
            <button type="button" onClick={() => setDb(getDatabaseState())} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Refresh Live Data</button>
          </div>
        </div>
      </div>
    </div>
  );
}
