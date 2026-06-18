/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  UserRole,
  Category,
  Client,
  Department,
  Location,
  Supplier,
  Asset,
  AssetAssignment,
  AssetTransfer,
  MaintenanceRecord,
  VerificationRecord,
  DisposalRecord,
  AuditLog,
  Notification,
  NotificationPreference,
  DocumentRecord,
  DocumentTemplate,
  DocumentPrintHistory,
  DocumentScope,
  DocumentApprovalStatus,
  DocumentExportFormat,
  DocumentSignature,
  Reminder,
  ReminderTemplate,
  ReminderPriority,
  SystemSettings,
  AssetStatus,
  AssetCondition,
  TransferStatus,
  VerificationResult,
  MALAWI_REGIONS,
  MALAWI_CLIENT_TYPES,
  MalawiRegion
} from "./types";

export interface DBState {
  users: User[];
  passwords: Record<string, string>; // user id -> pseudo hashed password simple tracker
  clients: Client[];
  categories: Category[];
  departments: Department[];
  locations: Location[];
  suppliers: Supplier[];
  assets: Asset[];
  assignments: AssetAssignment[];
  transfers: AssetTransfer[];
  maintenance: MaintenanceRecord[];
  verifications: VerificationRecord[];
  disposals: DisposalRecord[];
  auditLogs: AuditLog[];
  reminders: Reminder[];
  notifications: Notification[];
  notificationPreferences: NotificationPreference[];
  documents: DocumentRecord[];
  documentTemplates: DocumentTemplate[];
  printHistory: DocumentPrintHistory[];
  reminderTemplates: ReminderTemplate[];
  settings: SystemSettings;
}

const STORAGE_KEY = "faims_db_state";
export const DATABASE_SYNC_EVENT = "faims_db_synced";
let memoryDatabaseState: DBState | null = null;

// Deterministic QR pattern generator helper (outputs detailed grid-like SVG path or custom layout)
export function generateAssetQRCodeSVG(text: string): string {
  // A compact QR-style vector used when a printable tag image is required.
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="120" height="120">
    <rect width="100" height="100" fill="white" rx="6"/>
    <rect x="8" y="8" width="24" height="24" fill="black" stroke="white" stroke-width="2"/>
    <rect x="14" y="14" width="12" height="12" fill="white"/>
    <rect x="17" y="17" width="6" height="6" fill="black"/>
    
    <rect x="68" y="8" width="24" height="24" fill="black" stroke="white" stroke-width="2"/>
    <rect x="74" y="14" width="12" height="12" fill="white"/>
    <rect x="77" y="17" width="6" height="6" fill="black"/>
    
    <rect x="8" y="68" width="24" height="24" fill="black" stroke="white" stroke-width="2"/>
    <rect x="14" y="74" width="12" height="12" fill="white"/>
    <rect x="17" y="77" width="6" height="6" fill="black"/>
    
    <rect x="78" y="78" width="14" height="14" fill="black"/>
    <rect x="82" y="82" width="6" height="6" fill="white"/>
    
    <!-- Stylized data pixels -->
    <path d="M40 10h6v6h-6zm12 0h6v6h-6zm0 12h6v6h-6zm-12 12h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zm12 0h6v6h-6zM40 48h6v6h-6zm24 0h6v6h-6zm12 0h6v6h-6zm-24 12h6v6h-6zm12 0h-6v6h6zm12 12h6v6h-6zm-36 12h6v6h-6zm12 0h6v6h-6z" fill="black"/>
    <path d="M44 20h4v4h-4zm16 6h4v4h-4zm-12 16h4v4h-4zm24 8h4v4h-4zm-8 12h4v4h-4zm16 12h4v4h-4z" fill="%231a56db"/>
  </svg>`;
}

const defaultCategories: Category[] = [
  { id: "cat-1", name: "Computers & Notebooks", code: "COMP", serviceIntervalDays: 90 },
  { id: "cat-2", name: "Networking Equipment", code: "NET", serviceIntervalDays: 180 },
  { id: "cat-3", name: "Printers & Scanners", code: "PRNT", serviceIntervalDays: 120 },
  { id: "cat-4", name: "Office Furniture", code: "FURN", serviceIntervalDays: 360 },
  { id: "cat-5", name: "Vehicles & Transport", code: "VEH", serviceIntervalDays: 180 },
  { id: "cat-6", name: "Industrial Machinery", code: "MACH", serviceIntervalDays: 60 },
  { id: "cat-7", name: "Office Equipment", code: "EQIP", serviceIntervalDays: 180 }
];

const defaultDepartments: Department[] = [
  { id: "dept-1", name: "Administration", code: "ADMIN" },
  { id: "dept-2", name: "IT & Engineering", code: "ITENG" },
  { id: "dept-3", name: "Finance & Accounting", code: "FIN" },
  { id: "dept-4", name: "Operations & Logistics", code: "OPS" },
  { id: "dept-5", name: "Production & Manufacturing", code: "PROD" },
  { id: "dept-6", name: "Human Resources", code: "HR" }
];

const defaultLocations: Location[] = [
  { id: "loc-1", name: "HQ Building - Suite 101", code: "HQ101" },
  { id: "loc-2", name: "HQ Building - Engineering Lab 204", code: "HQ204" },
  { id: "loc-3", name: "IT Main Server Room", code: "MSR" },
  { id: "loc-4", name: "Annex Building - Hallway A", code: "ANX-HAL" },
  { id: "loc-5", name: "Warehouse & Logistics Garage A", code: "GAR-A" },
  { id: "loc-6", name: "Factory Floor B - Assembly Unit", code: "FFB-AS" }
];

const defaultSuppliers: Supplier[] = [
  {
    id: "sup-1",
    name: "Global Office Supplies",
    contactPerson: "Sarah Connors",
    email: "supplies@gpoffice.com",
    phone: "+254 712 345 678",
    address: "Enterprise Road, Industrial Area, Nairobi"
  },
  {
    id: "sup-2",
    name: "Zenith Tech Solutions",
    contactPerson: "Albert Sterling",
    email: "b2b@zenithtech.com",
    phone: "+254 722 987 654",
    address: "Westlands Commercial Arcade, Floor 4, Suite B"
  },
  {
    id: "sup-3",
    name: "General Machinery Corp",
    contactPerson: "Mark Vance",
    email: "support@genmachinery.com",
    phone: "+254 733 111 222",
    address: "Momabsa Road Business Park, Block C"
  },
  {
    id: "sup-4",
    name: "Fleet Master Motors",
    contactPerson: "Elena Rostova",
    email: "sales@fleetmasters.co.ke",
    phone: "+254 788 333 444",
    address: "Highway Logistics Avenue, Garage Depot"
  }
];

const defaultUsers: User[] = [
  {
    id: "u-1",
    name: "Administrator",
    email: "admin@faims.local",
    role: UserRole.ADMIN,
    departmentId: "dept-1",
    clientId: "cli-1",
    forcePasswordChange: true,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "u-2",
    name: "Asset Manager",
    email: "assets@faims.local",
    role: UserRole.ASSET_MANAGER,
    departmentId: "dept-2",
    clientId: "cli-2",
    forcePasswordChange: true,
    createdAt: "2026-01-15T09:30:00Z"
  },
  {
    id: "u-3",
    name: "Department Manager",
    email: "manager@faims.local",
    role: UserRole.DEPT_MANAGER,
    departmentId: "dept-2", // IT & Engineering Manager
    forcePasswordChange: true,
    createdAt: "2026-01-18T11:00:00Z"
  },
  {
    id: "u-4",
    name: "Auditor",
    email: "auditor@faims.local",
    role: UserRole.AUDITOR,
    departmentId: "dept-3",
    forcePasswordChange: true,
    createdAt: "2026-01-20T14:15:00Z"
  },
  {
    id: "u-5",
    name: "Employee",
    email: "employee@faims.local",
    role: UserRole.EMPLOYEE,
    departmentId: "dept-2", // IT & Engineering Employee
    forcePasswordChange: true,
    createdAt: "2026-01-22T16:00:00Z"
  }
];

// Seeded real-looking passwords
const defaultPasswords: Record<string, string> = {
  "u-1": "Admin@123",
  "u-2": "Asset@123",
  "u-3": "Manager@123",
  "u-4": "Auditor@123",
  "u-5": "Employee@123"
};

const buildDefaultClients = (): Client[] => defaultDepartments.map((department, index) => {
  const deptUser = defaultUsers.find(user => user.departmentId === department.id);
  const region = MALAWI_REGIONS[index % MALAWI_REGIONS.length];
  const districts: Record<MalawiRegion, string[]> = {
    "Northern Region": ["Mzimba", "Nkhata Bay"],
    "Central Region": ["Lilongwe", "Dedza"],
    "Southern Region": ["Blantyre", "Zomba"]
  };
  const district = districts[region][index % districts[region].length];
  return {
    id: `cli-${index + 1}`,
    name: `${department.name} Malawi Client Account`,
    code: `CLI-MWI-${String(index + 1).padStart(4, "0")}`,
    contactPerson: deptUser?.name || `${department.name} Coordinator`,
    phone: `+265 99${String(index + 1).padStart(2, "0")} ${String(100 + index).padStart(3, "0")} ${String(200 + index).padStart(3, "0")}`,
    email: `${department.code.toLowerCase()}@clients.faims.mw`,
    address: `${department.name} offices, ${district}`,
    organizationType: MALAWI_CLIENT_TYPES[index % MALAWI_CLIENT_TYPES.length],
    region,
    district,
    postalAddress: `P.O. Box ${1000 + index}, ${district}`,
    registrationNumber: "",
    tinNumber: "",
    registrationDate: `2026-0${Math.min(index + 1, 9)}-01`,
    status: index === defaultDepartments.length - 1 ? "Inactive" : "Active",
    departmentId: department.id
  };
});

const defaultClients: Client[] = buildDefaultClients();

const defaultAssets: Asset[] = [
  {
    id: "ast-1",
    assetTag: "AST-MWI-000001",
    name: "Mahogany Executive Desks & Furniture Suite",
    categoryId: "cat-4",
    departmentId: "dept-1",
    locationId: "loc-1",
    supplierId: "sup-1",
    purchaseDate: "2026-01-15",
    purchaseCost: 4200000,
    serialNumber: "SN-FURN-MHDST-11A",
    warrantyExpiry: "2029-01-15",
    condition: AssetCondition.EXCELLENT,
    status: AssetStatus.ACTIVE,
    assignedUserId: "u-1",
    notes: "High-end solid mahogany wood set for admin office.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-1")
  },
  {
    id: "ast-2",
    assetTag: "AST-MWI-000002",
    name: "Dell Latitude 5440 Enterprise Core i7 Intel CPU",
    categoryId: "cat-1",
    departmentId: "dept-2",
    clientId: "cli-2",
    locationId: "loc-2",
    supplierId: "sup-2",
    purchaseDate: "2026-02-10",
    purchaseCost: 2800000,
    serialNumber: "DELL-LAT-5440-QW92",
    warrantyExpiry: "2028-02-10",
    condition: AssetCondition.GOOD,
    status: AssetStatus.ACTIVE,
    assignedUserId: "u-5",
    notes: "Assigned for remote IT and software development.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-2")
  },
  {
    id: "ast-3",
    assetTag: "AST-MWI-000003",
    name: "Cisco Catalyst 9300 48-Port Network Switch",
    categoryId: "cat-2",
    departmentId: "dept-2",
    locationId: "loc-3",
    supplierId: "sup-2",
    purchaseDate: "2026-01-20",
    purchaseCost: 8500000,
    serialNumber: "CSC-C9300-48P-99BB",
    warrantyExpiry: "2027-01-20",
    condition: AssetCondition.EXCELLENT,
    status: AssetStatus.ACTIVE,
    notes: "Installed in Core Rack A for high-speed fiber local switching.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-3")
  },
  {
    id: "ast-4",
    assetTag: "AST-MWI-000004",
    name: "HP LaserJet Pro MFP M428dw Network Duplex Printer",
    categoryId: "cat-3",
    departmentId: "dept-3",
    clientId: "cli-3",
    locationId: "loc-4",
    supplierId: "sup-1",
    purchaseDate: "2026-03-05",
    purchaseCost: 1450000,
    serialNumber: "HP-LJ-M428-3342D",
    warrantyExpiry: "2027-03-05",
    condition: AssetCondition.GOOD,
    status: AssetStatus.UNDER_MAINTENANCE,
    notes: "Fuser unit needs minor roller cleaning and diagnostic check.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-4")
  },
  {
    id: "ast-5",
    assetTag: "AST-MWI-000005",
    name: "Toyota Hilux Double Cabin 4WD Transport Logistics",
    categoryId: "cat-5",
    departmentId: "dept-4",
    clientId: "cli-4",
    locationId: "loc-5",
    supplierId: "sup-4",
    purchaseDate: "2025-05-12",
    purchaseCost: 61000000,
    serialNumber: "ENG-2TR-FE-CHASSIS88390",
    warrantyExpiry: "2028-05-12",
    condition: AssetCondition.GOOD,
    status: AssetStatus.ACTIVE,
    assignedUserId: "u-2",
    notes: "Primary operations vehicle registered for raw materials transit.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-5")
  },
  {
    id: "ast-6",
    assetTag: "AST-MWI-000006",
    name: "Automatic Hydraulic Laser Cut Machine 2200W",
    categoryId: "cat-6",
    departmentId: "dept-5",
    clientId: "cli-5",
    locationId: "loc-6",
    supplierId: "sup-3",
    purchaseDate: "2024-11-30",
    purchaseCost: 102000000,
    serialNumber: "HYD-LASER-CUT-992X",
    warrantyExpiry: "2026-11-30",
    condition: AssetCondition.FAIR,
    status: AssetStatus.ACTIVE,
    notes: "Calibrated regularly. Warranty expiring in late November.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-6")
  },
  {
    id: "ast-7",
    assetTag: "AST-MWI-000007",
    name: "Lenovo ThinkCentre Neo 50s Desktop Tower",
    categoryId: "cat-1",
    departmentId: "dept-3",
    clientId: "cli-3",
    locationId: "loc-1",
    supplierId: "sup-2",
    purchaseDate: "2025-03-15",
    purchaseCost: 1700000,
    serialNumber: "LNV-TCN-NE50-Z778",
    warrantyExpiry: "2026-03-15",
    condition: AssetCondition.POOR,
    status: AssetStatus.DAMAGED,
    notes: "Damaged during office shifting. Faulty motherboard and cracked bezel.",
    qrCode: generateAssetQRCodeSVG("https://assets.local/records/ast-7")
  }
];

const defaultAssignments: AssetAssignment[] = [
  {
    id: "asg-1",
    assetId: "ast-1",
    userId: "u-1",
    departmentId: "dept-1",
    assignedDate: "2026-01-15",
    status: "Active",
    remarks: "Default CEO Suite desk allocation"
  },
  {
    id: "asg-2",
    assetId: "ast-2",
    userId: "u-5",
    departmentId: "dept-2",
    assignedDate: "2026-02-12",
    status: "Active",
    remarks: "Workstation assigned to junior dev engineer"
  },
  {
    id: "asg-3",
    assetId: "ast-5",
    userId: "u-2",
    departmentId: "dept-4",
    assignedDate: "2026-01-20",
    status: "Active",
    remarks: "Co-assigned vehicle control key to logistics coordinator"
  }
];

const defaultTransfers: AssetTransfer[] = [
  {
    id: "trf-1",
    assetId: "ast-2",
    sourceDepartmentId: "dept-1",
    destDepartmentId: "dept-2",
    sourceLocationId: "loc-1",
    destLocationId: "loc-2",
    status: TransferStatus.APPROVED,
    transferDate: "2026-02-10",
    authorizedBy: "Administrator",
    remarks: "Laptop transfer requested from HQ Admin base to engineering team."
  },
  {
    id: "trf-2",
    assetId: "ast-4",
    sourceDepartmentId: "dept-3",
    destDepartmentId: "dept-3",
    sourceLocationId: "loc-1",
    destLocationId: "loc-4",
    status: TransferStatus.PENDING,
    transferDate: "2026-06-05",
    authorizedBy: "Pending Authorized Manager",
    remarks: "Relocating office printer to communal annex hallway to distribute workload."
  }
];

const defaultMaintenance: MaintenanceRecord[] = [
  {
    id: "maint-1",
    assetId: "ast-4",
    requestBy: "Auditor",
    technician: "James Omondi (Printers Specialist)",
    serviceProvider: "Enterprise Facilities Support",
    cost: 120.00,
    maintenanceDate: "2026-06-04",
    status: "In Progress",
    notes: "Diagnosing recurring fuser roller jams and clearing fine carbon dust."
  },
  {
    id: "maint-2",
    assetId: "ast-6",
    requestBy: "Asset Manager",
    technician: "Maina Precision Engineering",
    serviceProvider: "General Machinery Corp",
    cost: 850.00,
    maintenanceDate: "2026-03-10",
    completionDate: "2026-03-12",
    status: "Completed",
    notes: "Replaced high-pressure seal valves and recalibrated safety sensors on cutting bay."
  }
];

const defaultVerifications: VerificationRecord[] = [
  {
    id: "vrf-1",
    assetId: "ast-1",
    verificationDate: "2026-05-15",
    verifiedBy: "Auditor",
    status: AssetStatus.ACTIVE,
    condition: AssetCondition.EXCELLENT,
    result: VerificationResult.VERIFIED,
    notes: "Desks are in perfect shape. Polished recently, no chips observed."
  },
  {
    id: "vrf-2",
    assetId: "ast-7",
    verificationDate: "2026-05-30",
    verifiedBy: "Auditor",
    status: AssetStatus.DAMAGED,
    condition: AssetCondition.POOR,
    result: VerificationResult.DAMAGED,
    notes: "Inspected at HQ Room 101 basement - motherboard is toast after liquid spill."
  }
];

const defaultDisposals: DisposalRecord[] = [
  {
    id: "dsp-1",
    assetId: "ast-7",
    disposalDate: "2026-06-02",
    method: "Scrapped",
    reason: "Severe liquid damage making repair costs exceed 90% of a brand-new motherboard unit replacement.",
    authorizedBy: "Administrator",
    supportingDocuments: "GPL-SCRAP-DOC-112.pdf"
  }
];

const defaultAuditLogs: AuditLog[] = [
  {
    id: "log-1",
    userId: "System",
    userName: "Database System Tracker",
    action: "System Initialization",
    details: "Fixed asset management database successfully seeded with roles, default accounts, assets, assignments, transfers, maintenance, verification, and disposal records.",
    timestamp: "2026-06-08T08:00:00Z",
    ipAddress: "127.0.0.1"
  },
  {
    id: "log-2",
    userId: "u-1",
    userName: "Administrator",
    action: "Login",
    details: "Administrator successfully authenticated via the fixed asset management portal.",
    timestamp: "2026-06-08T09:10:00Z",
    ipAddress: "192.168.1.100"
  }
];

const defaultNotifications: Notification[] = [
  {
    id: "not-1",
    userId: "all",
    title: "Quarterly Asset Verification Due",
    message: "Attention all physical staff: The Q2 Fixed Asset Verification audit is underway. Please ensure and report your tag counts.",
    isRead: false,
    createdAt: "2026-06-01T09:00:00Z",
    type: "warning"
  },
  {
    id: "not-2",
    userId: "u-2",
    title: "Transfer Pending Approval",
    message: "HP LaserJet Printer transfer request is awaiting approval from your department coordinator.",
    isRead: false,
    createdAt: "2026-06-05T14:20:00Z",
    type: "info"
  }
];

const defaultNotificationPreferences: NotificationPreference[] = defaultUsers.map(user => ({
  userId: user.id,
  emailEnabled: user.preferences?.emailNotif ?? true,
  pushEnabled: user.preferences?.desktopNotif ?? true,
  smsEnabled: false
}));

const defaultReminderSchedule = [30, 14, 7, 3, 1, 0];

const defaultSettings: SystemSettings = {
  orgName: "FAIMS Malawi Asset Management System",
  logo: "FA",
  theme: "light",
  emailHost: "smtp.faims.local",
  emailPort: "587",
  emailSender: "noreply@faims.local",
  isNotificationsEnabled: true,
  reminderIntervals: [30, 14, 7, 3, 1, 0],
  backupFrequency: "weekly",
  orgAddress: "Head Office, Lilongwe, Malawi",
  orgPhone: "+265 1 755 000",
  orgEmail: "assets@faims.mw",
  orgWebsite: "assets.faims.mw",
  orgFooterText: "2026 FAIMS Malawi. Asset lifecycle, audit, and maintenance platform.",
  orgDefaultLanguage: "en",
  systemTheme: "light",
  currency: "MWK",
  timezone: "Africa/Blantyre",
  dateFormat: "DD/MM/YYYY",
  country: "Malawi",
  phoneFormat: "+265 XXX XXX XXX",
  companySlogan: "Track, maintain, verify, and retire assets with confidence.",
  companyDescription: "A fixed asset management platform configured for asset registration, assignments, transfers, maintenance, verification, disposal, reporting, and audit trails.",
  socialLinks: { website: "https://assets.faims.mw" },
  businessRegistration: "Malawi Enterprise Asset Registry",
  officeLocations: [
    { id: "office-hq", name: "Lilongwe Head Office", address: "City Centre, Lilongwe", phone: "+265 1 755 000", email: "hq@faims.mw" },
    { id: "office-warehouse", name: "Blantyre Stores", address: "Makata Industrial Area, Blantyre", phone: "+265 1 870 000", email: "stores@faims.mw" }
  ],
  primaryColor: "#1d4ed8",
  secondaryColor: "#1e293b",
  layoutDensity: "comfortable",
  typography: "Montserrat",
  homeContent: "Welcome to the fixed asset management workspace for asset lifecycle control.",
  aboutContent: "A modern asset operations platform for registration, custody, movement, maintenance, verification, disposal, and reporting.",
  services: ["Asset Registration", "Assignment Tracking", "Transfer Control", "Preventive Maintenance", "Physical Verification", "Disposal Management"],
  teamMembers: [
    { id: "team-1", name: "Administrator", role: "System Administrator", email: "admin@faims.local", phone: "+1 555 010 0100" },
    { id: "team-2", name: "Asset Manager", role: "Asset Manager", email: "assets@faims.local", phone: "+1 555 010 0200" }
  ],
  announcements: [{ id: "ann-1", title: "Asset verification cycle", body: "Quarterly physical verification is managed centrally from the asset workspace.", date: "2026-06-10" }]
};

const emptyOperationalState = (): DBState => ({
  users: defaultUsers,
  passwords: defaultPasswords,
  clients: defaultClients,
  categories: defaultCategories,
  departments: defaultDepartments,
  locations: defaultLocations,
  suppliers: defaultSuppliers,
  assets: defaultAssets,
  assignments: defaultAssignments,
  transfers: defaultTransfers,
  maintenance: defaultMaintenance,
  verifications: defaultVerifications,
  disposals: defaultDisposals,
  auditLogs: defaultAuditLogs,
  reminders: [],
  notifications: defaultNotifications,
  notificationPreferences: defaultNotificationPreferences,
  documents: [],
  documentTemplates: [],
  printHistory: [],
  reminderTemplates: [],
  settings: defaultSettings
});

const seedIds = {
  users: new Set(defaultUsers.map(item => item.id).filter(id => id !== defaultUsers[0].id)),
  clients: new Set(defaultClients.map(item => item.id)),
  categories: new Set(defaultCategories.map(item => item.id)),
  departments: new Set(defaultDepartments.map(item => item.id)),
  locations: new Set(defaultLocations.map(item => item.id)),
  suppliers: new Set(defaultSuppliers.map(item => item.id)),
  assets: new Set(defaultAssets.map(item => item.id)),
  assignments: new Set(defaultAssignments.map(item => item.id)),
  transfers: new Set(defaultTransfers.map(item => item.id)),
  maintenance: new Set(defaultMaintenance.map(item => item.id)),
  verifications: new Set(defaultVerifications.map(item => item.id)),
  disposals: new Set(defaultDisposals.map(item => item.id)),
  auditLogs: new Set(defaultAuditLogs.map(item => item.id)),
  notifications: new Set(defaultNotifications.map(item => item.id))
};

function removeBundledOperationalRecords(state: DBState): DBState {
  // Return the state unmodified to keep persistent seeded data entries in localStorage.
  return state;
}

export function getDatabaseState(): DBState {
  let data: string | null = null;
  try {
    data = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.error("FAIMS: localStorage is unavailable. Using in-memory database state.", e);
    if (!memoryDatabaseState) {
      memoryDatabaseState = emptyOperationalState();
    }
    return memoryDatabaseState;
  }
  if (!data) {
    const initialState = emptyOperationalState();
    memoryDatabaseState = initialState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
      if (typeof window !== "undefined") window.dispatchEvent(new Event(DATABASE_SYNC_EVENT));
    } catch (e) {
      console.error("FAIMS: Failed to persist initial state to localStorage.", e);
    }
    return initialState;
  }
  
  try {
    const parsed = removeBundledOperationalRecords(JSON.parse(data) as DBState);
    // Auto-patch missing serviceIntervalDays for categories that already exist in local storage
    let modified = false;
    if (parsed.categories && Array.isArray(parsed.categories)) {
      parsed.categories = parsed.categories.map(cat => {
        const defaultCat = defaultCategories.find(d => d.id === cat.id);
        if (defaultCat && cat.serviceIntervalDays === undefined) {
          modified = true;
          return { ...cat, serviceIntervalDays: defaultCat.serviceIntervalDays };
        }
        return cat;
      });
    }

    if (Array.isArray(parsed.users)) {
      parsed.users = parsed.users.map(user => {
        const defaultUser = defaultUsers.find(d => d.id === user.id);
        if (!defaultUser) return user;
        const isLegacyEmail =
          user.email !== defaultUser.email &&
          (user.email.endsWith("@enterprise.local") ||
            user.email.includes("clarkes") ||
            user.email === "asset.manager@faims.local");
        if (isLegacyEmail) {
          modified = true;
          return { ...user, email: defaultUser.email };
        }
        return user;
      });

      if (!parsed.users.some(user => user.id === defaultUsers[0].id)) {
        parsed.users.unshift(defaultUsers[0]);
        modified = true;
      }
    } else {
      parsed.users = [defaultUsers[0]];
      modified = true;
    }

    if (!parsed.passwords) {
      parsed.passwords = { [defaultUsers[0].id]: defaultPasswords[defaultUsers[0].id] };
      modified = true;
    } else if (parsed.passwords[defaultUsers[0].id] === undefined) {
      parsed.passwords[defaultUsers[0].id] = defaultPasswords[defaultUsers[0].id];
      modified = true;
    }

    if (!Array.isArray(parsed.clients)) {
      parsed.clients = [];
      modified = true;
    }

    if (Array.isArray(parsed.clients)) {
      parsed.clients = parsed.clients.map((client, index) => {
        const fallback = defaultClients[index % defaultClients.length] || defaultClients[0];
        const patched: Client = {
          ...client,
          code: client.code?.startsWith("CLI-MWI-") ? client.code : `CLI-MWI-${String(index + 1).padStart(4, "0")}`,
          organizationType: client.organizationType && client.organizationType !== "External Organization" && client.organizationType !== "Internal Department"
            ? client.organizationType
            : fallback.organizationType,
          region: client.region || fallback.region,
          district: client.district || fallback.district,
          postalAddress: client.postalAddress || fallback.postalAddress || "",
          registrationNumber: client.registrationNumber || "",
          tinNumber: client.tinNumber || ""
        };
        if (
          patched.code !== client.code ||
          patched.organizationType !== client.organizationType ||
          patched.region !== client.region ||
          patched.district !== client.district ||
          patched.postalAddress !== client.postalAddress ||
          patched.registrationNumber !== client.registrationNumber ||
          patched.tinNumber !== client.tinNumber
        ) {
          modified = true;
        }
        return patched;
      });
    }

    if (Array.isArray(parsed.assets)) {
      parsed.assets = parsed.assets.map((asset, index) => {
        const nextTag = `AST-MWI-${String(index + 1).padStart(6, "0")}`;
        let patchedAsset = asset.assetTag?.startsWith("AST-MWI-") ? asset : { ...asset, assetTag: nextTag };
        if (patchedAsset !== asset) modified = true;
        if (patchedAsset.clientId) return patchedAsset;
        const client = parsed.clients.find(item => item.departmentId === asset.departmentId) || parsed.clients[0];
        if (client) {
          modified = true;
          return { ...patchedAsset, clientId: client.id };
        }
        return patchedAsset;
      });
    }

    if (!Array.isArray(parsed.categories)) parsed.categories = [];
    if (!Array.isArray(parsed.departments)) parsed.departments = [];
    if (!Array.isArray(parsed.locations)) parsed.locations = [];
    if (!Array.isArray(parsed.suppliers)) parsed.suppliers = [];
    if (!Array.isArray(parsed.assets)) parsed.assets = [];
    if (!Array.isArray(parsed.assignments)) parsed.assignments = [];
    if (!Array.isArray(parsed.transfers)) parsed.transfers = [];
    if (!Array.isArray(parsed.maintenance)) parsed.maintenance = [];
    if (!Array.isArray(parsed.verifications)) parsed.verifications = [];
    if (!Array.isArray(parsed.disposals)) parsed.disposals = [];
    if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = [];
    if (!Array.isArray(parsed.reminders)) {
      parsed.reminders = [];
      modified = true;
    }
    if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
    if (!Array.isArray(parsed.notificationPreferences)) {
      parsed.notificationPreferences = [];
      modified = true;
    }
    if (!Array.isArray(parsed.documents)) {
      parsed.documents = [];
      modified = true;
    }
    if (!Array.isArray(parsed.documentTemplates)) {
      parsed.documentTemplates = [];
      modified = true;
    }
    if (!Array.isArray(parsed.printHistory)) {
      parsed.printHistory = [];
      modified = true;
    }
    if (!Array.isArray(parsed.reminderTemplates)) {
      parsed.reminderTemplates = [];
      modified = true;
    }

    if (Array.isArray(parsed.reminders)) {
      parsed.reminders = parsed.reminders.map((reminder, index) => {
        const assignedTo = reminder.assignedTo || reminder.responsibleUserId || "all";
        const responsibleUserId = reminder.responsibleUserId || (assignedTo !== "all" ? assignedTo : undefined);
        const normalizedSchedule = Array.isArray(reminder.notificationSchedule) && reminder.notificationSchedule.length > 0
          ? [...new Set(reminder.notificationSchedule.map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value) && value >= 0))]
          : defaultReminderSchedule;
        const normalizedPriority: ReminderPriority =
          reminder.priority === "Low" || reminder.priority === "Medium" || reminder.priority === "High" || reminder.priority === "Critical"
            ? reminder.priority
            : "Medium";
        const normalizedCategory = typeof reminder.category === "string" ? reminder.category : "Custom Reminder";
        const normalizedDescription = reminder.description ?? reminder.notes ?? "";
        const normalizedNotes = reminder.notes ?? reminder.description ?? "";
        const normalizedStatus = reminder.status === "Completed" || reminder.status === "Snoozed" || reminder.status === "Cancelled"
          ? reminder.status
          : "Active";
        const normalizedDueDate = typeof reminder.dueDate === "string" && reminder.dueDate ? reminder.dueDate : new Date().toISOString().split("T")[0];
        const normalizedTemplateId = typeof reminder.templateId === "string" ? reminder.templateId : undefined;
        const normalizedCreatedBy = typeof reminder.createdBy === "string" ? reminder.createdBy : defaultUsers[0].id;
        const normalizedCreatedByName = typeof reminder.createdByName === "string" ? reminder.createdByName : defaultUsers[0].name;
        const normalizedDepartmentId = typeof reminder.departmentId === "string" ? reminder.departmentId : undefined;
        const normalizedClientId = typeof reminder.clientId === "string" ? reminder.clientId : undefined;
        const normalizedNotification = normalizedSchedule.length > 0 ? normalizedSchedule : defaultReminderSchedule;
        const normalized = {
          ...reminder,
          assignedTo,
          responsibleUserId,
          priority: normalizedPriority,
          category: normalizedCategory,
          description: normalizedDescription,
          notes: normalizedNotes,
          status: normalizedStatus,
          dueDate: normalizedDueDate,
          templateId: normalizedTemplateId,
          createdBy: normalizedCreatedBy,
          createdByName: normalizedCreatedByName,
          departmentId: normalizedDepartmentId,
          clientId: normalizedClientId,
          notificationSchedule: normalizedNotification,
          updatedAt: reminder.updatedAt || reminder.createdAt || new Date().toISOString()
        };
        if (
          normalized.assignedTo !== reminder.assignedTo ||
          normalized.responsibleUserId !== reminder.responsibleUserId ||
          normalized.priority !== reminder.priority ||
          normalized.category !== reminder.category ||
          normalized.description !== reminder.description ||
          normalized.notes !== reminder.notes ||
          normalized.status !== reminder.status ||
          normalized.dueDate !== reminder.dueDate ||
          normalized.templateId !== reminder.templateId ||
          normalized.createdBy !== reminder.createdBy ||
          normalized.createdByName !== reminder.createdByName ||
          normalized.departmentId !== reminder.departmentId ||
          normalized.clientId !== reminder.clientId ||
          JSON.stringify(normalized.notificationSchedule) !== JSON.stringify(reminder.notificationSchedule)
        ) {
          modified = true;
        }
        return normalized;
      });
    }

    parsed.users.forEach(user => {
      const existingPref = parsed.notificationPreferences.find(pref => pref.userId === user.id);
      if (!existingPref) {
        parsed.notificationPreferences.push({
          userId: user.id,
          emailEnabled: user.preferences?.emailNotif ?? true,
          pushEnabled: user.preferences?.desktopNotif ?? true,
          smsEnabled: false
        });
        modified = true;
      }
    });

    // Auto-patch settings with fixed-asset defaults
    if (!parsed.settings) {
      parsed.settings = defaultSettings;
      modified = true;
    } else {
      if (parsed.settings.currency !== "MWK") {
        parsed.settings.currency = "MWK";
        modified = true;
      }
      if (parsed.settings.timezone !== "Africa/Blantyre") {
        parsed.settings.timezone = "Africa/Blantyre";
        modified = true;
      }
      if (parsed.settings.dateFormat !== "DD/MM/YYYY") {
        parsed.settings.dateFormat = "DD/MM/YYYY";
        modified = true;
      }
      if (parsed.settings.country !== "Malawi") {
        parsed.settings.country = "Malawi";
        modified = true;
      }
      if (parsed.settings.phoneFormat !== "+265 XXX XXX XXX") {
        parsed.settings.phoneFormat = "+265 XXX XXX XXX";
        modified = true;
      }
    }

    const legacyDomain = "clarkes" + "attorneys";
    const legacyOrgName = "Clarkes" + " Attorneys";
    const hasLegacyBrand =
      !parsed.settings.orgName ||
      parsed.settings.logo?.includes("AIMS") ||
      parsed.settings.logo?.includes("CA") ||
      parsed.settings.emailSender?.includes("aims") ||
      parsed.settings.emailSender?.includes(legacyDomain) ||
      parsed.settings.orgWebsite === "www.enterprise.mw" ||
      parsed.settings.orgWebsite?.includes(legacyDomain) ||
      parsed.settings.orgName.includes(legacyOrgName);
    if (hasLegacyBrand) {
      parsed.settings = { ...parsed.settings, ...defaultSettings };
      parsed.settings.orgAddress = defaultSettings.orgAddress;
      parsed.settings.orgPhone = defaultSettings.orgPhone;
      parsed.settings.orgEmail = defaultSettings.orgEmail;
      parsed.settings.orgWebsite = defaultSettings.orgWebsite;
      parsed.settings.orgFooterText = defaultSettings.orgFooterText;
      parsed.settings.emailHost = defaultSettings.emailHost;
      parsed.settings.emailSender = defaultSettings.emailSender;
      modified = true;
    }
    const settingsPatch: Partial<SystemSettings> = {
      country: defaultSettings.country,
      phoneFormat: defaultSettings.phoneFormat,
      currency: defaultSettings.currency,
      timezone: defaultSettings.timezone,
      dateFormat: "DD/MM/YYYY",
      reminderIntervals: defaultSettings.reminderIntervals,
      typography: "Montserrat"
    };
    Object.entries(settingsPatch).forEach(([key, value]) => {
      const typedKey = key as keyof SystemSettings;
      if (!parsed.settings[typedKey]) {
        (parsed.settings as unknown as Record<string, unknown>)[key] = value;
        modified = true;
      }
    });
    ([
      "companySlogan",
      "companyDescription",
      "socialLinks",
      "officeLocations",
      "businessRegistration",
      "primaryColor",
      "secondaryColor",
      "layoutDensity",
      "homeContent",
      "aboutContent",
      "services",
      "teamMembers",
      "announcements"
    ] as Array<keyof SystemSettings>).forEach((key) => {
      if (!parsed.settings[key]) {
        (parsed.settings as unknown as Record<string, unknown>)[key] = defaultSettings[key] as unknown;
        modified = true;
      }
    });

    memoryDatabaseState = parsed;
    return parsed;
  } catch (e) {
    // If storage is corrupt, recover to a clean bootstrap state.
    // IMPORTANT: do NOT call saveDatabaseState() here — it can throw and would escape the catch block.
    console.error("FAIMS: localStorage corruption detected. Recovering to clean state.", e);
    const cleanState = emptyOperationalState();
    memoryDatabaseState = cleanState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
      if (typeof window !== "undefined") window.dispatchEvent(new Event(DATABASE_SYNC_EVENT));
    } catch (storageError) {
      console.error("FAIMS: Failed to persist recovery state.", storageError);
    }
    return cleanState;
  }
}

export interface DatabaseIntegrityResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    users: number;
    clients: number;
    assets: number;
    reminders: number;
    notifications: number;
    auditLogs: number;
    documents: number;
  };
}

function collectDuplicateIds(items: Array<{ id: string }>, label: string, errors: string[]): void {
  const seen = new Set<string>();
  items.forEach(item => {
    if (!item.id) {
      errors.push(`${label} record missing id.`);
      return;
    }
    if (seen.has(item.id)) {
      errors.push(`${label} contains duplicate id '${item.id}'.`);
    }
    seen.add(item.id);
  });
}

export function validateDatabaseIntegrity(state: DBState): DatabaseIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const collections: Array<[keyof DBState, string]> = [
    ["users", "users"],
    ["clients", "clients"],
    ["categories", "categories"],
    ["departments", "departments"],
    ["locations", "locations"],
    ["suppliers", "suppliers"],
    ["assets", "assets"],
    ["assignments", "assignments"],
    ["transfers", "transfers"],
    ["maintenance", "maintenance"],
    ["verifications", "verifications"],
    ["disposals", "disposals"],
    ["auditLogs", "auditLogs"],
    ["reminders", "reminders"],
    ["reminderTemplates", "reminderTemplates"],
    ["notifications", "notifications"],
    ["notificationPreferences", "notificationPreferences"],
    ["documents", "documents"],
    ["documentTemplates", "documentTemplates"],
    ["printHistory", "printHistory"]
  ];

  collections.forEach(([key, label]) => {
    if (!Array.isArray(state[key])) {
      errors.push(`${label} collection is missing or invalid.`);
    }
  });

  if (errors.length === 0) {
    collectDuplicateIds(state.users, "users", errors);
    collectDuplicateIds(state.clients, "clients", errors);
    collectDuplicateIds(state.categories, "categories", errors);
    collectDuplicateIds(state.departments, "departments", errors);
    collectDuplicateIds(state.locations, "locations", errors);
    collectDuplicateIds(state.suppliers, "suppliers", errors);
    collectDuplicateIds(state.assets, "assets", errors);
    collectDuplicateIds(state.assignments, "assignments", errors);
    collectDuplicateIds(state.transfers, "transfers", errors);
    collectDuplicateIds(state.maintenance, "maintenance", errors);
    collectDuplicateIds(state.verifications, "verifications", errors);
    collectDuplicateIds(state.disposals, "disposals", errors);
    collectDuplicateIds(state.auditLogs, "auditLogs", errors);
    collectDuplicateIds(state.reminders, "reminders", errors);
    collectDuplicateIds(state.reminderTemplates, "reminderTemplates", errors);
    collectDuplicateIds(state.notifications, "notifications", errors);
    collectDuplicateIds(state.documents, "documents", errors);
    collectDuplicateIds(state.documentTemplates, "documentTemplates", errors);
    collectDuplicateIds(state.printHistory, "printHistory", errors);

    state.assets.forEach(asset => {
      if (!state.categories.some(item => item.id === asset.categoryId)) warnings.push(`Asset ${asset.assetTag} references missing category ${asset.categoryId}.`);
      if (!state.departments.some(item => item.id === asset.departmentId)) warnings.push(`Asset ${asset.assetTag} references missing department ${asset.departmentId}.`);
      if (!state.locations.some(item => item.id === asset.locationId)) warnings.push(`Asset ${asset.assetTag} references missing location ${asset.locationId}.`);
      if (!state.suppliers.some(item => item.id === asset.supplierId)) warnings.push(`Asset ${asset.assetTag} references missing supplier ${asset.supplierId}.`);
      if (asset.assignedUserId && !state.users.some(item => item.id === asset.assignedUserId)) warnings.push(`Asset ${asset.assetTag} references missing assigned user ${asset.assignedUserId}.`);
      if (asset.clientId && !state.clients.some(item => item.id === asset.clientId)) warnings.push(`Asset ${asset.assetTag} references missing client ${asset.clientId}.`);
    });

    state.assignments.forEach(record => {
      if (!state.assets.some(item => item.id === record.assetId)) warnings.push(`Assignment ${record.id} references missing asset ${record.assetId}.`);
      if (!state.users.some(item => item.id === record.userId)) warnings.push(`Assignment ${record.id} references missing user ${record.userId}.`);
      if (!state.departments.some(item => item.id === record.departmentId)) warnings.push(`Assignment ${record.id} references missing department ${record.departmentId}.`);
    });

    state.reminders.forEach(reminder => {
      if (reminder.assignedTo !== "all" && !state.users.some(item => item.id === reminder.assignedTo)) warnings.push(`Reminder ${reminder.id} references missing assigned user ${reminder.assignedTo}.`);
      if (Number.isNaN(new Date(reminder.dueDate).getTime())) warnings.push(`Reminder ${reminder.id} has invalid due date ${reminder.dueDate}.`);
    });

    state.notifications.forEach(notification => {
      if (notification.userId !== "all" && !state.users.some(item => item.id === notification.userId)) warnings.push(`Notification ${notification.id} references missing user ${notification.userId}.`);
      if (notification.reminderId && !state.reminders.some(item => item.id === notification.reminderId)) warnings.push(`Notification ${notification.id} references missing reminder ${notification.reminderId}.`);
    });
  }

  if (state.settings.currency !== "MWK") warnings.push("Currency is not MWK.");
  if (state.settings.timezone !== "Africa/Blantyre") warnings.push("Timezone is not Africa/Blantyre.");
  if (state.settings.dateFormat !== "DD/MM/YYYY") warnings.push("Date format is not DD/MM/YYYY.");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      users: Array.isArray(state.users) ? state.users.length : 0,
      clients: Array.isArray(state.clients) ? state.clients.length : 0,
      assets: Array.isArray(state.assets) ? state.assets.length : 0,
      reminders: Array.isArray(state.reminders) ? state.reminders.length : 0,
      notifications: Array.isArray(state.notifications) ? state.notifications.length : 0,
      auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs.length : 0,
      documents: Array.isArray(state.documents) ? state.documents.length : 0
    }
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeDocumentId(prefix: string, sourceType: string, sourceId: string): string {
  return `doc-${prefix}-${sourceType}-${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function makeReceiptNumber(prefix: string, sourceId: string): string {
  const stamp = sourceId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "000000";
  return `${prefix}-${stamp}-${Date.now().toString().slice(-6)}`;
}

function buildBrandBlock(settings: SystemSettings, title: string, subtitle: string, receiptNumber?: string): string {
  const logo = settings.logo || "FA";
  return `
    <div class="brand-bar">
      <div class="brand-mark">${escapeHtml(logo)}</div>
      <div class="brand-copy">
        <div class="org-name">${escapeHtml(settings.orgName || "FAIMS Malawi Asset Management System")}</div>
        <div class="org-meta">${escapeHtml(settings.orgAddress || "")}</div>
        <div class="org-meta">${escapeHtml(settings.orgPhone || "")} ${settings.orgEmail ? ` | ${escapeHtml(settings.orgEmail)}` : ""}</div>
      </div>
      <div class="brand-right">
        <div class="doc-title">${escapeHtml(title)}</div>
        <div class="doc-subtitle">${escapeHtml(subtitle)}</div>
        ${receiptNumber ? `<div class="doc-chip">Receipt #${escapeHtml(receiptNumber)}</div>` : ""}
      </div>
    </div>`;
}

function buildDocHtml(title: string, subtitle: string, bodyBlocks: string[], settings: SystemSettings, receiptNumber?: string, watermark?: string): string {
  const safeWatermark = watermark ? `<div class="watermark">${escapeHtml(watermark)}</div>` : "";
  return `
    <div class="doc-shell">
      ${safeWatermark}
      ${buildBrandBlock(settings, title, subtitle, receiptNumber)}
      <div class="doc-body">
        ${bodyBlocks.join("")}
      </div>
      <div class="doc-footer">
        <span>${escapeHtml(settings.orgFooterText || "")}</span>
        <span>Printed ${escapeHtml(new Date().toLocaleString())}</span>
      </div>
    </div>`;
}

function rowList(items: Array<{ label: string; value: string }>): string {
  return `<div class="field-grid">${items.map(item => `<div class="field"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value || "-")}</strong></div>`).join("")}</div>`;
}

function tableMarkup(headers: string[], rows: string[][]): string {
  return `
    <table class="doc-table">
      <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>`;
}

function docFingerprint(payload: unknown): string {
  return JSON.stringify(payload);
}

function upsertDocument(state: DBState, doc: DocumentRecord): boolean {
  const idx = state.documents.findIndex(item => item.id === doc.id);
  if (idx === -1) {
    state.documents.unshift(doc);
    return true;
  }

  const current = state.documents[idx];
  const shouldUpdate =
    current.sourceFingerprint !== doc.sourceFingerprint ||
    current.htmlContent !== doc.htmlContent ||
    current.title !== doc.title ||
    current.description !== doc.description ||
    current.amount !== doc.amount ||
    current.currency !== doc.currency ||
    current.paymentMethod !== doc.paymentMethod ||
    current.scope !== doc.scope ||
    current.departmentId !== doc.departmentId ||
    current.clientId !== doc.clientId ||
    current.assetId !== doc.assetId;

  if (!shouldUpdate) return false;

  state.documents[idx] = {
    ...current,
    ...doc,
    createdAt: current.createdAt,
    createdBy: current.createdBy,
    createdByName: current.createdByName,
    receiptNumber: current.receiptNumber || doc.receiptNumber,
    version: current.version + 1,
    signatures: current.signatures,
    approvalStatus: current.approvalStatus === "Archived" ? "Archived" : current.approvalStatus,
    printCount: current.printCount,
    lastPrintedAt: current.lastPrintedAt,
    archived: current.archived
  };
  return true;
}

function syncGeneratedDocuments(state: DBState): boolean {
  let modified = false;
  const settings = state.settings || defaultSettings;
  const defaultAuthor = state.users[0];
  const authorId = defaultAuthor?.id || "system";
  const authorName = defaultAuthor?.name || settings.orgName || "FAIMS";
  const currency = settings.currency || "MWK";

  state.documents = Array.isArray(state.documents) ? state.documents : [];
  state.documentTemplates = Array.isArray(state.documentTemplates) ? state.documentTemplates : [];
  state.printHistory = Array.isArray(state.printHistory) ? state.printHistory : [];

  state.assets.forEach(asset => {
    const client = asset.clientId ? state.clients.find(item => item.id === asset.clientId) : undefined;
    const dept = state.departments.find(item => item.id === asset.departmentId);
    const location = state.locations.find(item => item.id === asset.locationId);
    const supplier = state.suppliers.find(item => item.id === asset.supplierId);
    const sourceFingerprint = docFingerprint({
      asset,
      client,
      dept,
      location,
      supplier,
      settings: { orgName: settings.orgName, logo: settings.logo, currency, dateFormat: settings.dateFormat, timezone: settings.timezone }
    });
    const receiptNumber = makeReceiptNumber("PUR", asset.id);
    modified = upsertDocument(state, {
      id: makeDocumentId("purchase", "asset", asset.id),
      docType: "Asset Purchase Receipt",
      title: `Asset Purchase Receipt - ${asset.assetTag}`,
      description: `Purchase receipt for ${asset.name}`,
      htmlContent: buildDocHtml(
        `Asset Purchase Receipt`,
        `${asset.assetTag} • ${asset.name}`,
        [
          rowList([
            { label: "Asset Tag", value: asset.assetTag },
            { label: "Asset Name", value: asset.name },
            { label: "Category", value: state.categories.find(item => item.id === asset.categoryId)?.name || "-" },
            { label: "Department", value: dept?.name || "-" },
            { label: "Location", value: location?.name || "-" },
            { label: "Supplier", value: supplier?.name || "-" },
            { label: "Client", value: client?.name || "-" },
            { label: "Purchase Date", value: formatDate(asset.purchaseDate) },
            { label: "Amount", value: formatCurrency(asset.purchaseCost) },
            { label: "Currency", value: currency },
            { label: "Generated", value: new Date().toISOString() }
          ]),
          `<div class="doc-note">This receipt is generated from live asset master data and may be re-issued when asset records are updated.</div>`,
          `<div class="doc-qr">QR: ${escapeHtml(asset.assetTag)}</div>`
        ],
        settings,
        receiptNumber,
        "LIVE RECEIPT"
      ),
      plainText: stripHtml(asset.name),
      scope: client ? "client" : "asset",
      sourceType: "asset",
      sourceId: asset.id,
      sourceFingerprint,
      version: 1,
      approvalStatus: "Approved",
      createdBy: authorId,
      createdByName: authorName,
      modifiedBy: authorId,
      modifiedByName: authorName,
      createdAt: asset.purchaseDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      isAutoGenerated: true,
      receiptNumber,
      amount: asset.purchaseCost,
      currency,
      paymentMethod: "Purchase Order",
      clientId: asset.clientId,
      assetId: asset.id,
      departmentId: asset.departmentId,
      tags: ["receipt", "purchase", "asset"],
      attachments: [],
      signatures: [],
      printCount: 0,
      qrPayload: asset.assetTag
    }) || modified;
  });

  state.assignments.forEach(assignment => {
    const asset = state.assets.find(item => item.id === assignment.assetId);
    const user = state.users.find(item => item.id === assignment.userId);
    const dept = state.departments.find(item => item.id === assignment.departmentId);
    const sourceFingerprint = docFingerprint({ assignment, asset, user, dept, settings: { orgName: settings.orgName, logo: settings.logo } });
    modified = upsertDocument(state, {
      id: makeDocumentId("handover", "assignment", assignment.id),
      docType: "Asset Handover Form",
      title: `Asset Handover Form - ${asset?.assetTag || assignment.assetId}`,
      description: `Handover form for ${asset?.name || assignment.assetId}`,
      htmlContent: buildDocHtml(
        "Asset Handover Form",
        asset?.assetTag || assignment.id,
        [
          rowList([
            { label: "Asset", value: asset?.name || assignment.assetId },
            { label: "Assigned User", value: user?.name || assignment.userId },
            { label: "Department", value: dept?.name || assignment.departmentId },
            { label: "Assigned Date", value: formatDate(assignment.assignedDate) },
            { label: "Status", value: assignment.status },
            { label: "Remarks", value: assignment.remarks || "-" }
          ]),
          `<div class="doc-signature-line">Authorized by operations and acknowledged by the recipient.</div>`
        ],
        settings,
        undefined,
        "HANDOVER"
      ),
      plainText: stripHtml(asset?.name || assignment.id),
      scope: user ? "personal" : "department",
      sourceType: "assignment",
      sourceId: assignment.id,
      sourceFingerprint,
      version: 1,
      approvalStatus: assignment.status === "Returned" ? "Approved" : "Pending Approval",
      createdBy: authorId,
      createdByName: authorName,
      modifiedBy: authorId,
      modifiedByName: authorName,
      createdAt: assignment.assignedDate,
      updatedAt: new Date().toISOString(),
      archived: false,
      isAutoGenerated: true,
      clientId: asset?.clientId,
      assetId: asset?.id,
      departmentId: assignment.departmentId,
      tags: ["handover", "assignment", "asset"],
      attachments: [],
      signatures: [],
      printCount: 0
    }) || modified;

    if (assignment.status === "Returned" && assignment.returnDate) {
      const returnFingerprint = docFingerprint({ assignment, asset, user, dept, settings: { orgName: settings.orgName, logo: settings.logo } });
      modified = upsertDocument(state, {
        id: makeDocumentId("return", "assignment", assignment.id),
        docType: "Asset Return Form",
        title: `Asset Return Form - ${asset?.assetTag || assignment.assetId}`,
        description: `Return form for ${asset?.name || assignment.assetId}`,
        htmlContent: buildDocHtml(
          "Asset Return Form",
          asset?.assetTag || assignment.id,
          [rowList([
            { label: "Asset", value: asset?.name || assignment.assetId },
            { label: "Returned By", value: user?.name || assignment.userId },
            { label: "Return Date", value: formatDate(assignment.returnDate) },
            { label: "Department", value: dept?.name || assignment.departmentId },
            { label: "Status", value: assignment.status }
          ])],
          settings,
          undefined,
          "RETURN"
        ),
        plainText: stripHtml(asset?.name || assignment.id),
        scope: user ? "personal" : "department",
        sourceType: "assignment-return",
        sourceId: assignment.id,
        sourceFingerprint: returnFingerprint,
        version: 1,
        approvalStatus: "Approved",
        createdBy: authorId,
        createdByName: authorName,
        modifiedBy: authorId,
        modifiedByName: authorName,
        createdAt: assignment.returnDate,
        updatedAt: new Date().toISOString(),
        archived: false,
        isAutoGenerated: true,
        clientId: asset?.clientId,
        assetId: asset?.id,
        departmentId: assignment.departmentId,
        tags: ["return", "assignment", "asset"],
        attachments: [],
        signatures: [],
        printCount: 0
      }) || modified;
    }
  });

  state.transfers.forEach(transfer => {
    const asset = state.assets.find(item => item.id === transfer.assetId);
    const sourceDept = state.departments.find(item => item.id === transfer.sourceDepartmentId);
    const destDept = state.departments.find(item => item.id === transfer.destDepartmentId);
    const sourceLoc = state.locations.find(item => item.id === transfer.sourceLocationId);
    const destLoc = state.locations.find(item => item.id === transfer.destLocationId);
    const sourceFingerprint = docFingerprint({ transfer, asset, sourceDept, destDept, sourceLoc, destLoc, settings: { orgName: settings.orgName, logo: settings.logo } });
    modified = upsertDocument(state, {
      id: makeDocumentId("transfer", "movement", transfer.id),
      docType: "Asset Transfer Form",
      title: `Asset Transfer Form - ${asset?.assetTag || transfer.assetId}`,
      description: `Transfer form for ${asset?.name || transfer.assetId}`,
      htmlContent: buildDocHtml(
        "Asset Transfer Form",
        asset?.assetTag || transfer.id,
        [rowList([
          { label: "Asset", value: asset?.name || transfer.assetId },
          { label: "From Department", value: sourceDept?.name || transfer.sourceDepartmentId },
          { label: "To Department", value: destDept?.name || transfer.destDepartmentId },
          { label: "From Location", value: sourceLoc?.name || transfer.sourceLocationId },
          { label: "To Location", value: destLoc?.name || transfer.destLocationId },
          { label: "Status", value: transfer.status },
          { label: "Authorized By", value: transfer.authorizedBy || "-" },
          { label: "Date", value: formatDate(transfer.transferDate) },
          { label: "Remarks", value: transfer.remarks || "-" }
        ])],
        settings,
        undefined,
        "TRANSFER"
      ),
      plainText: stripHtml(asset?.name || transfer.id),
      scope: "department",
      sourceType: "transfer",
      sourceId: transfer.id,
      sourceFingerprint,
      version: 1,
      approvalStatus: transfer.status === TransferStatus.APPROVED ? "Approved" : "Pending Approval",
      createdBy: authorId,
      createdByName: authorName,
      modifiedBy: authorId,
      modifiedByName: authorName,
      createdAt: transfer.transferDate,
      updatedAt: new Date().toISOString(),
      archived: false,
      isAutoGenerated: true,
      clientId: asset?.clientId,
      assetId: asset?.id,
      departmentId: transfer.destDepartmentId,
      tags: ["transfer", "asset"],
      attachments: [],
      signatures: [],
      printCount: 0
    }) || modified;
  });

  state.maintenance.forEach(record => {
    const asset = state.assets.find(item => item.id === record.assetId);
    const sourceFingerprint = docFingerprint({ record, asset, settings: { orgName: settings.orgName, logo: settings.logo, currency } });
    modified = upsertDocument(state, {
      id: makeDocumentId("maintenance", "record", record.id),
      docType: "Maintenance Report",
      title: `Maintenance Report - ${asset?.assetTag || record.assetId}`,
      description: `Maintenance report for ${asset?.name || record.assetId}`,
      htmlContent: buildDocHtml(
        "Maintenance Report",
        asset?.assetTag || record.id,
        [rowList([
          { label: "Asset", value: asset?.name || record.assetId },
          { label: "Request By", value: record.requestBy },
          { label: "Technician", value: record.technician || "-" },
          { label: "Service Provider", value: record.serviceProvider || "-" },
          { label: "Cost", value: formatCurrency(record.cost) },
          { label: "Date", value: formatDate(record.maintenanceDate) },
          { label: "Completion", value: record.completionDate ? formatDate(record.completionDate) : "Pending" },
          { label: "Status", value: record.status },
          { label: "Notes", value: record.notes || "-" }
        ])],
        settings,
        undefined,
        "MAINTENANCE"
      ),
      plainText: stripHtml(asset?.name || record.id),
      scope: "department",
      sourceType: "maintenance",
      sourceId: record.id,
      sourceFingerprint,
      version: 1,
      approvalStatus: record.status === "Completed" ? "Approved" : "Pending Approval",
      createdBy: authorId,
      createdByName: authorName,
      modifiedBy: authorId,
      modifiedByName: authorName,
      createdAt: record.maintenanceDate,
      updatedAt: new Date().toISOString(),
      archived: false,
      isAutoGenerated: true,
      amount: record.cost,
      currency,
      paymentMethod: record.serviceProvider || "Maintenance Service",
      clientId: asset?.clientId,
      assetId: asset?.id,
      departmentId: asset?.departmentId,
      tags: ["maintenance", "report"],
      attachments: [],
      signatures: [],
      printCount: 0
    }) || modified;

    if (record.cost > 0) {
      const receiptFingerprint = docFingerprint({ record, asset, settings: { orgName: settings.orgName, logo: settings.logo, currency } });
      const receiptNumber = makeReceiptNumber("MNT", record.id);
      modified = upsertDocument(state, {
        id: makeDocumentId("maintenance-receipt", "record", record.id),
        docType: "Maintenance Payment Receipt",
        title: `Maintenance Payment Receipt - ${asset?.assetTag || record.assetId}`,
        description: `Payment receipt for maintenance on ${asset?.name || record.assetId}`,
        htmlContent: buildDocHtml(
          "Maintenance Payment Receipt",
          asset?.assetTag || record.id,
          [rowList([
            { label: "Asset", value: asset?.name || record.assetId },
            { label: "Amount", value: formatCurrency(record.cost) },
            { label: "Currency", value: currency },
            { label: "Payment Method", value: record.serviceProvider || "Cash/Bank" },
            { label: "Printed Timestamp", value: new Date().toISOString() }
          ])],
          settings,
          receiptNumber,
          "RECEIPT"
        ),
        plainText: stripHtml(asset?.name || record.id),
        scope: "department",
        sourceType: "maintenance-receipt",
        sourceId: record.id,
        sourceFingerprint: receiptFingerprint,
        version: 1,
        approvalStatus: "Approved",
        createdBy: authorId,
        createdByName: authorName,
        modifiedBy: authorId,
        modifiedByName: authorName,
        createdAt: record.completionDate || record.maintenanceDate,
        updatedAt: new Date().toISOString(),
        archived: false,
        isAutoGenerated: true,
        receiptNumber,
        amount: record.cost,
        currency,
        paymentMethod: record.serviceProvider || "Maintenance Service",
        clientId: asset?.clientId,
        assetId: asset?.id,
        departmentId: asset?.departmentId,
        tags: ["receipt", "maintenance"],
        attachments: [],
        signatures: [],
        printCount: 0,
        qrPayload: `${asset?.assetTag || record.assetId}:${record.id}`
      }) || modified;
    }
  });

  state.verifications.forEach(record => {
    const asset = state.assets.find(item => item.id === record.assetId);
    const sourceFingerprint = docFingerprint({ record, asset, settings: { orgName: settings.orgName, logo: settings.logo } });
    modified = upsertDocument(state, {
      id: makeDocumentId("verification", "record", record.id),
      docType: "Verification Report",
      title: `Verification Report - ${asset?.assetTag || record.assetId}`,
      description: `Verification report for ${asset?.name || record.assetId}`,
      htmlContent: buildDocHtml(
        "Verification Report",
        asset?.assetTag || record.id,
        [rowList([
          { label: "Asset", value: asset?.name || record.assetId },
          { label: "Verified By", value: record.verifiedBy },
          { label: "Verification Date", value: formatDate(record.verificationDate) },
          { label: "Status", value: record.status },
          { label: "Condition", value: record.condition },
          { label: "Result", value: record.result },
          { label: "Notes", value: record.notes || "-" }
        ])],
        settings,
        undefined,
        "VERIFICATION"
      ),
      plainText: stripHtml(asset?.name || record.id),
      scope: "department",
      sourceType: "verification",
      sourceId: record.id,
      sourceFingerprint,
      version: 1,
      approvalStatus: "Approved",
      createdBy: authorId,
      createdByName: authorName,
      modifiedBy: authorId,
      modifiedByName: authorName,
      createdAt: record.verificationDate,
      updatedAt: new Date().toISOString(),
      archived: false,
      isAutoGenerated: true,
      clientId: asset?.clientId,
      assetId: asset?.id,
      departmentId: asset?.departmentId,
      tags: ["verification", "report"],
      attachments: [],
      signatures: [],
      printCount: 0
    }) || modified;
  });

  state.disposals.forEach(record => {
    const asset = state.assets.find(item => item.id === record.assetId);
    const sourceFingerprint = docFingerprint({ record, asset, settings: { orgName: settings.orgName, logo: settings.logo } });
    modified = upsertDocument(state, {
      id: makeDocumentId("disposal", "record", record.id),
      docType: "Disposal Certificate",
      title: `Disposal Certificate - ${asset?.assetTag || record.assetId}`,
      description: `Disposal certificate for ${asset?.name || record.assetId}`,
      htmlContent: buildDocHtml(
        "Disposal Certificate",
        asset?.assetTag || record.id,
        [rowList([
          { label: "Asset", value: asset?.name || record.assetId },
          { label: "Disposal Date", value: formatDate(record.disposalDate) },
          { label: "Method", value: record.method },
          { label: "Reason", value: record.reason },
          { label: "Authorized By", value: record.authorizedBy },
          { label: "Supporting Docs", value: record.supportingDocuments || "-" }
        ])],
        settings,
        undefined,
        "DISPOSAL"
      ),
      plainText: stripHtml(asset?.name || record.id),
      scope: "department",
      sourceType: "disposal",
      sourceId: record.id,
      sourceFingerprint,
      version: 1,
      approvalStatus: "Approved",
      createdBy: authorId,
      createdByName: authorName,
      modifiedBy: authorId,
      modifiedByName: authorName,
      createdAt: record.disposalDate,
      updatedAt: new Date().toISOString(),
      archived: false,
      isAutoGenerated: true,
      clientId: asset?.clientId,
      assetId: asset?.id,
      departmentId: asset?.departmentId,
      tags: ["disposal", "certificate"],
      attachments: [],
      signatures: [],
      printCount: 0
    }) || modified;
  });

  return modified;
}

export function saveDatabaseState(state: DBState): void {
  memoryDatabaseState = state;
  syncGeneratedDocuments(state);
  // Run integrity validation for observability — but NEVER throw.
  // Throwing here propagates through runReminderEngine/useEffect and crashes the React tree.
  const integrity = validateDatabaseIntegrity(state);
  if (!integrity.ok) {
    console.error("FAIMS database integrity warnings (save will proceed):", integrity.errors);
  }
  if (integrity.warnings.length > 0) {
    console.warn("FAIMS database integrity notices:", integrity.warnings);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(DATABASE_SYNC_EVENT));
    }
  } catch (error) {
    // localStorage can fail (quota exceeded, private mode, etc.) — log only, never re-throw.
    console.error("FAIMS: Failed to persist database state to localStorage.", error);
  }
}

export function subscribeToDatabaseState(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(DATABASE_SYNC_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(DATABASE_SYNC_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

// Global actions with Audit Logs inside!
export function addAuditRecord(userId: string, userName: string, action: string, details: string): void {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: "client-unavailable"
  };

  if (isOffline()) {
    addBufferedAuditLog(newLog);
  } else {
    const state = getDatabaseState();
    state.auditLogs.unshift(newLog); // Newer activities on top
    saveDatabaseState(state);
  }
}

export function triggerNotification(userId: string, title: string, message: string, type: "info" | "warning" | "success" | "error"): void {
  const state = getDatabaseState();
  const newNot: Notification = {
    id: `not-${Date.now()}`,
    userId,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    type
  };
  state.notifications.unshift(newNot);
  saveDatabaseState(state);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toLocalDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateOnly(dateString: string): Date | null {
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntilDate(dueDate: string, now = new Date()): number | null {
  const due = parseDateOnly(dueDate);
  if (!due) return null;
  return Math.ceil((toLocalDateOnly(due).getTime() - toLocalDateOnly(now).getTime()) / MS_PER_DAY);
}

function addRecurrence(dateString: string, recurrence: Reminder["recurrence"]): string | null {
  if (recurrence === "None") return null;
  const due = parseDateOnly(dateString);
  if (!due) return null;
  const next = new Date(due);
  if (recurrence === "Daily") next.setDate(next.getDate() + 1);
  if (recurrence === "Weekly") next.setDate(next.getDate() + 7);
  if (recurrence === "Monthly") next.setMonth(next.getMonth() + 1);
  if (recurrence === "Quarterly") next.setMonth(next.getMonth() + 3);
  if (recurrence === "Semi-Annual") next.setMonth(next.getMonth() + 6);
  if (recurrence === "Annual") next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().split("T")[0];
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function notificationRecipients(reminder: Reminder, db: DBState): string[] {
  if (reminder.responsibleUserId) {
    const userExists = db.users.some(user => user.id === reminder.responsibleUserId);
    if (userExists) return [reminder.responsibleUserId];
  }
  if (reminder.assignedTo && reminder.assignedTo !== "all") {
    const userExists = db.users.some(user => user.id === reminder.assignedTo);
    if (userExists) return [reminder.assignedTo];
  }
  if (reminder.responsibleRole) {
    const usersByRole = db.users.filter(user => user.role === reminder.responsibleRole).map(user => user.id);
    if (usersByRole.length > 0) return usersByRole;
  }
  return ["all"];
}

function buildReminderMessage(reminder: Reminder, dayDelta: number): string {
  const due = formatDate(reminder.dueDate);
  const amount = reminder.amount ? ` Amount: ${formatCurrency(reminder.amount)}.` : "";
  const priority = reminder.priority ? ` Priority: ${reminder.priority}.` : "";
  const target = (reminder.responsibleRole || reminder.assignedTo !== "all")
    ? ` Assigned to ${reminder.responsibleRole || reminder.assignedTo}.`
    : "";
  if (dayDelta < 0) {
    return `${reminder.title} is overdue by ${Math.abs(dayDelta)} day${Math.abs(dayDelta) === 1 ? "" : "s"} (due ${due}).${priority}${target}${amount}`;
  }
  if (dayDelta === 0) {
    return `${reminder.title} is due today (${due}).${priority}${target}${amount}`;
  }
  return `${reminder.title} is due in ${dayDelta} day${dayDelta === 1 ? "" : "s"} (${due}).${priority}${target}${amount}`;
}

export function runReminderEngine(now = new Date()): { notificationsCreated: number; recurrencesCreated: number } {
  const db = getDatabaseState();
  if (!db.settings.isNotificationsEnabled) {
    return { notificationsCreated: 0, recurrencesCreated: 0 };
  }

  const intervals = [...new Set(db.settings.reminderIntervals || defaultReminderSchedule)]
    .filter(value => Number.isFinite(value) && value >= 0)
    .sort((a, b) => b - a);
  let notificationsCreated = 0;
  let recurrencesCreated = 0;
  let modified = false;

  db.reminders.forEach(reminder => {
    if (reminder.status === "Cancelled") return;

    const dayDelta = daysUntilDate(reminder.dueDate, now);
    if (dayDelta === null) return;

    if (reminder.status === "Completed") {
      if (reminder.recurrence !== "None" && !reminder.nextOccurrenceGenerated) {
        const nextDueDate = addRecurrence(reminder.dueDate, reminder.recurrence);
        if (nextDueDate) {
          db.reminders.unshift({
            ...reminder,
            id: uniqueId("rem"),
            dueDate: nextDueDate,
            status: "Active",
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            completedAt: undefined,
            snoozedUntil: undefined,
            parentReminderId: reminder.id,
            nextOccurrenceGenerated: false
          });
          reminder.nextOccurrenceGenerated = true;
          reminder.updatedAt = now.toISOString();
          db.auditLogs.unshift({
            id: uniqueId("log-reminder-recur"),
            userId: "System",
            userName: "Reminder Engine",
            action: "Reminder Created",
            details: `Generated next ${reminder.recurrence} occurrence for ${reminder.title}, due ${nextDueDate}.`,
            timestamp: now.toISOString(),
            ipAddress: "127.0.0.1"
          });
          recurrencesCreated++;
          modified = true;
        }
      }
      return;
    }

    if (reminder.snoozedUntil) {
      const snoozedUntil = parseDateOnly(reminder.snoozedUntil);
      if (snoozedUntil && toLocalDateOnly(now).getTime() < snoozedUntil.getTime()) return;
    }

    const reminderIntervals = [...new Set((reminder.notificationSchedule && reminder.notificationSchedule.length > 0 ? reminder.notificationSchedule : intervals))]
      .filter(value => Number.isFinite(value) && value >= 0)
      .sort((a, b) => b - a);
    const shouldNotify = dayDelta < 0 || reminderIntervals.includes(dayDelta);
    if (!shouldNotify) return;

    notificationRecipients(reminder, db).forEach(userId => {
      const deliveryKey = `${reminder.id}:${dayDelta < 0 ? "overdue" : dayDelta}:${now.toISOString().split("T")[0]}:${userId}`;
      const exists = db.notifications.some(notification => notification.deliveryKey === deliveryKey);
      if (exists) return;

      const statusType = dayDelta < 0 || dayDelta <= 3 ? "warning" : "info";
      const title = dayDelta < 0 ? `Overdue: ${reminder.title}` : dayDelta === 0 ? `Due Today: ${reminder.title}` : `Upcoming: ${reminder.title}`;
      db.notifications.unshift({
        id: uniqueId("not-rem"),
        reminderId: reminder.id,
        userId,
        title,
        message: buildReminderMessage(reminder, dayDelta),
        isRead: false,
        createdAt: now.toISOString(),
        sentAt: now.toISOString(),
        status: "sent",
        channel: "in-app",
        deliveryKey,
        type: statusType
      });
      db.auditLogs.unshift({
        id: uniqueId("log-notification"),
        userId: "System",
        userName: "Reminder Engine",
        action: "Notification Sent",
        details: `${title} routed to ${userId} through in-app/dashboard notification channel.`,
        timestamp: now.toISOString(),
        ipAddress: "127.0.0.1"
      });
      notificationsCreated++;
      modified = true;
    });
  });

  if (modified) {
    saveDatabaseState(db);
  }

  return { notificationsCreated, recurrencesCreated };
}

export function startReminderScheduler(): () => void {
  if (typeof window === "undefined") return () => undefined;
  runReminderEngine();
  const intervalId = window.setInterval(() => runReminderEngine(), 60 * 60 * 1000);
  return () => window.clearInterval(intervalId);
}

export function completeReminder(reminderId: string, userId: string, userName: string): void {
  const db = getDatabaseState();
  const reminder = db.reminders.find(item => item.id === reminderId);
  if (!reminder) return;
  reminder.status = "Completed";
  reminder.completedAt = new Date().toISOString();
  reminder.updatedAt = reminder.completedAt;
  db.auditLogs.unshift({
    id: uniqueId("log-reminder-complete"),
    userId,
    userName,
    action: "Reminder Completed",
    details: `${reminder.title} marked complete. Recurrence: ${reminder.recurrence}.`,
    timestamp: reminder.completedAt,
    ipAddress: "client-unavailable"
  });
  saveDatabaseState(db);
  runReminderEngine();
}

export function snoozeReminder(reminderId: string, days: number, userId: string, userName: string): void {
  const db = getDatabaseState();
  const reminder = db.reminders.find(item => item.id === reminderId);
  if (!reminder) return;
  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + days);
  reminder.status = "Snoozed";
  reminder.snoozedUntil = snoozedUntil.toISOString().split("T")[0];
  reminder.updatedAt = new Date().toISOString();
  db.auditLogs.unshift({
    id: uniqueId("log-reminder-snooze"),
    userId,
    userName,
    action: "Reminder Updated",
    details: `${reminder.title} snoozed until ${reminder.snoozedUntil}.`,
    timestamp: reminder.updatedAt,
    ipAddress: "client-unavailable"
  });
  saveDatabaseState(db);
}

export function updateNotificationPreference(userId: string, patch: Partial<NotificationPreference>): void {
  const db = getDatabaseState();
  const existing = db.notificationPreferences.find(pref => pref.userId === userId);
  if (existing) {
    Object.assign(existing, patch);
  } else {
    db.notificationPreferences.push({
      userId,
      emailEnabled: patch.emailEnabled ?? true,
      pushEnabled: patch.pushEnabled ?? true,
      smsEnabled: patch.smsEnabled ?? false
    });
  }
  saveDatabaseState(db);
}

// ==========================================
// CLIENT-SIDE BUFFERING & OFFLINE ENGINE APIs
// ==========================================

const OFFLINE_MODE_KEY = "faims_offline_mode";
const BUFFER_VERIFICATIONS_KEY = "faims_offline_buffer_verifications";
const BUFFER_AUDIT_LOGS_KEY = "faims_offline_buffer_audit_logs";

export function isOffline(): boolean {
  let offlineOverride: string | null = null;
  try {
    offlineOverride = localStorage.getItem(OFFLINE_MODE_KEY);
  } catch (e) {
    console.error("FAIMS: Unable to read offline mode from localStorage.", e);
  }
  if (offlineOverride === null) {
    if (typeof navigator !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  }
  return offlineOverride === "true";
}

export function setOfflineMode(offline: boolean): void {
  localStorage.setItem(OFFLINE_MODE_KEY, String(offline));
  window.dispatchEvent(new Event("faims_network_connection_changed"));
  if (!offline) {
    // Connection re-established! Trigger auto sync
    syncOfflineData();
  }
}

export function getBufferedVerifications(): VerificationRecord[] {
  const buffered = localStorage.getItem(BUFFER_VERIFICATIONS_KEY);
  if (!buffered) return [];
  try {
    return JSON.parse(buffered);
  } catch {
    return [];
  }
}

export function addBufferedVerification(record: VerificationRecord): void {
  const current = getBufferedVerifications();
  current.unshift(record);
  localStorage.setItem(BUFFER_VERIFICATIONS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event("faims_offline_buffer_updated"));
}

export function getBufferedAuditLogs(): AuditLog[] {
  const buffered = localStorage.getItem(BUFFER_AUDIT_LOGS_KEY);
  if (!buffered) return [];
  try {
    return JSON.parse(buffered);
  } catch {
    return [];
  }
}

export function addBufferedAuditLog(record: AuditLog): void {
  const current = getBufferedAuditLogs();
  current.unshift(record);
  localStorage.setItem(BUFFER_AUDIT_LOGS_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event("faims_offline_buffer_updated"));
}

export function getOfflineBufferLengths(): { verifications: number; logs: number; total: number } {
  const vLen = getBufferedVerifications().length;
  const lLen = getBufferedAuditLogs().length;
  return {
    verifications: vLen,
    logs: lLen,
    total: vLen + lLen
  };
}

export function syncOfflineData(): { verificationsSynced: number; logsSynced: number } {
  const verifications = getBufferedVerifications();
  const logs = getBufferedAuditLogs();
  
  if (verifications.length === 0 && logs.length === 0) {
    return { verificationsSynced: 0, logsSynced: 0 };
  }

  const currentDB = getDatabaseState();

  // 1. Merge Verifications and update corresponding Assets
  verifications.forEach(v => {
    currentDB.verifications.unshift(v);

    // Update real asset condition and status inside the database State
    const assetObj = currentDB.assets.find(a => a.id === v.assetId);
    if (assetObj) {
      assetObj.condition = v.condition;
      assetObj.status = v.status;
    }
  });

  // 2. Merge Audit Logs
  logs.forEach(l => {
    currentDB.auditLogs.unshift(l);
  });

  // Write sync event log to DB
  const syncTimeStr = new Date().toISOString();
  const syncAuditLog: AuditLog = {
    id: `log-sync-${Date.now()}`,
    userId: "System",
    userName: "Database Synchronizer",
    action: "Offline Buffers Synced",
    details: `Device re-established connection and synchronized backups. Merged ${verifications.length} verified physical inspects and ${logs.length} auditing entries from offline local buffer queues.`,
    timestamp: syncTimeStr,
    ipAddress: "127.0.0.1"
  };
  currentDB.auditLogs.unshift(syncAuditLog);

  // Trigger sync notification
  const syncNotification: Notification = {
    id: `not-sync-${Date.now()}`,
    userId: "all",
    title: "Offline Sync Complete",
    message: `Successfully synchronized ${verifications.length} physical inspections and ${logs.length} security audits to live database.`,
    isRead: false,
    createdAt: syncTimeStr,
    type: "success"
  };
  currentDB.notifications.unshift(syncNotification);

  // Save the master state
  saveDatabaseState(currentDB);

  // Clear buffers
  localStorage.removeItem(BUFFER_VERIFICATIONS_KEY);
  localStorage.removeItem(BUFFER_AUDIT_LOGS_KEY);

  // Dispatch global updates for UI components to reload DB state
  window.dispatchEvent(new Event("faims_offline_buffer_updated"));
  window.dispatchEvent(new Event(DATABASE_SYNC_EVENT));

  return { verificationsSynced: verifications.length, logsSynced: logs.length };
}

// Register standard window online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const offlineOverride = localStorage.getItem(OFFLINE_MODE_KEY);
    if (offlineOverride !== "true") {
      syncOfflineData();
      window.dispatchEvent(new Event("faims_network_connection_changed"));
    }
  });

  window.addEventListener("offline", () => {
    const offlineOverride = localStorage.getItem(OFFLINE_MODE_KEY);
    if (offlineOverride !== "true") {
      window.dispatchEvent(new Event("faims_network_connection_changed"));
    }
  });
}

export function checkAndAutoTriggerMaintenance(): { triggeredCount: number } {
  const db = getDatabaseState();
  let triggeredCount = 0;
  let modified = false;
  const now = new Date();

  db.assets.forEach(asset => {
    // Only scheduled for Active or Damaged assets
    if (asset.status !== AssetStatus.ACTIVE && asset.status !== AssetStatus.DAMAGED) {
      return;
    }

    const category = db.categories.find(c => c.id === asset.categoryId);
    // Only if category has defined serviceIntervalDays
    if (!category || !category.serviceIntervalDays || category.serviceIntervalDays <= 0) {
      return;
    }

    // Get all completes
    const completedRecords = db.maintenance.filter(m => m.assetId === asset.id && m.status === "Completed");
    
    // Determine last completion or fallback
    let lastServiceDateStr = asset.purchaseDate;
    if (completedRecords.length > 0) {
      const sorted = [...completedRecords].sort((a, b) => {
        const d1 = new Date(a.completionDate || a.maintenanceDate).getTime();
        const d2 = new Date(b.completionDate || b.maintenanceDate).getTime();
        return d2 - d1;
      });
      lastServiceDateStr = sorted[0].completionDate || sorted[0].maintenanceDate;
    }

    const lastServiceDate = new Date(lastServiceDateStr);
    if (isNaN(lastServiceDate.getTime())) {
      return; // Skip invalid dates
    }

    const intervalMs = category.serviceIntervalDays * 24 * 60 * 60 * 1000;
    const dueDate = new Date(lastServiceDate.getTime() + intervalMs);

    if (now.getTime() >= dueDate.getTime()) {
      // It is due for service! Check if a pending or in-progress is already active.
      const hasActiveMaint = db.maintenance.some(m => m.assetId === asset.id && (m.status === "Pending" || m.status === "In Progress"));
      
      if (!hasActiveMaint) {
        // Auto-trigger record!
        const nextMaint: MaintenanceRecord = {
          id: `m-rec-auto-${asset.id}-${Date.now()}`,
          assetId: asset.id,
          requestBy: "Auto Maintenance Scheduler",
          technician: "Internal Service Specialist",
          serviceProvider: "Corporate Preventive Services",
          cost: 0,
          maintenanceDate: now.toISOString().split("T")[0],
          notes: `[Auto PM Trigger] Standard service interval of ${category.serviceIntervalDays} Days reached for '${category.name}' category. Reference Date (latest completing/purchase): ${lastServiceDateStr}.`,
          status: "Pending"
        };

        // Also move asset into MAINTENANCE state!
        asset.status = AssetStatus.UNDER_MAINTENANCE;

        db.maintenance.unshift(nextMaint);
        
        // Add audit record
        const logMsg = `Asset Tag: ${asset.assetTag} (${asset.name}) auto-scheduled for Maintenance service. Interval cycle: every ${category.serviceIntervalDays} days.`;
        const newLog: AuditLog = {
          id: `log-auto-${Date.now()}-${triggeredCount}`,
          userId: "System",
          userName: "Preventive Maintenance Engine",
          action: "Asset Auto-Scheduled",
          details: logMsg,
          timestamp: now.toISOString(),
          ipAddress: "127.0.0.1"
        };
        db.auditLogs.unshift(newLog);

        // Notify
        const newNot: Notification = {
          id: `not-auto-${Date.now()}-${triggeredCount}`,
          userId: "all",
          title: "Auto-PM Cycle Triggered",
          message: `Asset ${asset.assetTag} was auto-routed to diagnostics queue per category rules (${category.serviceIntervalDays} days).`,
          isRead: false,
          createdAt: now.toISOString(),
          type: "warning"
        };
        db.notifications.unshift(newNot);

        triggeredCount++;
        modified = true;
      }
    }
  });

  if (modified) {
    saveDatabaseState(db);
    // Dispatch events to let React UI update
    window.dispatchEvent(new Event("faims_offline_buffer_updated"));
    window.dispatchEvent(new Event(DATABASE_SYNC_EVENT));
  }

  // Also trigger preemptive alert checks in compliance with the preemptive system guidelines
  try {
    checkPreemptiveMaintenance();
  } catch (err) {
    console.error("Failed to run preemptive checks in checkAndAutoTriggerMaintenance", err);
  }

  return { triggeredCount };
}

export function calculateAssetMTBF(assetId: string, dbState?: DBState): { mtbfDays: number | null; totalFailures: number; ageInDays: number } {
  const db = dbState || getDatabaseState();
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) return { mtbfDays: null, totalFailures: 0, ageInDays: 0 };

  const now = new Date();
  const purchaseDate = new Date(asset.purchaseDate);
  const ageInMs = now.getTime() - purchaseDate.getTime();
  const ageInDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));

  // Filter completed maintenance records (failures/corrective events)
  const completed = db.maintenance.filter(m => m.assetId === assetId && m.status === "Completed");
  const totalFailures = completed.length;

  if (totalFailures === 0) {
    return { mtbfDays: null, totalFailures: 0, ageInDays };
  }

  // Sort completed chronologically by Completion Date or Maintenance Date
  const sorted = [...completed].sort((a, b) => {
    const da = new Date(a.completionDate || a.maintenanceDate).getTime();
    const dbVal = new Date(b.completionDate || b.maintenanceDate).getTime();
    return da - dbVal;
  });

  // Calculate intervals between failure events
  let totalIntervalDays = 0;
  let prevDate = purchaseDate;

  sorted.forEach(record => {
    const recordDate = new Date(record.completionDate || record.maintenanceDate);
    const diffMs = recordDate.getTime() - prevDate.getTime();
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    totalIntervalDays += diffDays;
    prevDate = recordDate;
  });

  const mtbfDays = parseFloat((totalIntervalDays / totalFailures).toFixed(1));
  return { mtbfDays, totalFailures, ageInDays };
}

export function checkPreemptiveMaintenance(): { warningsTriggered: number } {
  const db = getDatabaseState();
  let warningsTriggered = 0;
  let modified = false;
  const now = new Date();

  db.assets.forEach(asset => {
    // Only check active, under maintenance, or damaged assets
    if (asset.status !== AssetStatus.ACTIVE && asset.status !== AssetStatus.DAMAGED && asset.status !== AssetStatus.UNDER_MAINTENANCE) {
      return;
    }

    const category = db.categories.find(c => c.id === asset.categoryId);
    if (!category || !category.serviceIntervalDays || category.serviceIntervalDays <= 0) {
      return;
    }

    // Get latest completed service or purchase fallback
    const completedRecords = db.maintenance.filter(m => m.assetId === asset.id && m.status === "Completed");
    let lastServiceDateStr = asset.purchaseDate;
    if (completedRecords.length > 0) {
      const sorted = [...completedRecords].sort((a, b) => {
        const d1 = new Date(a.completionDate || a.maintenanceDate).getTime();
        const d2 = new Date(b.completionDate || b.maintenanceDate).getTime();
        return d2 - d1;
      });
      lastServiceDateStr = sorted[0].completionDate || sorted[0].maintenanceDate;
    }

    const lastServiceDate = new Date(lastServiceDateStr);
    if (isNaN(lastServiceDate.getTime())) return;

    const elapsedMs = now.getTime() - lastServiceDate.getTime();
    const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
    const intervalDays = category.serviceIntervalDays;

    if (elapsedDays >= intervalDays) {
      // Exceeded expected interval! Trigger warning notification if not already done.
      const alreadyNotified = db.notifications.some(
        n => n.type === "warning" && n.message.includes(asset.assetTag) && n.title.includes("Overdue")
      );

      if (!alreadyNotified) {
        const newNot: Notification = {
          id: `not-preempt-overdue-${asset.id}-${Date.now()}`,
          userId: "all",
          title: "Critical Overdue Maintenance",
          message: `Asset ${asset.name} (${asset.assetTag}) has exceeded its expected service cycle of ${intervalDays} days. Elapsed: ${elapsedDays} days. Please route to service.`,
          isRead: false,
          createdAt: now.toISOString(),
          type: "warning"
        };
        db.notifications.unshift(newNot);
        warningsTriggered++;
        modified = true;
      }
    } else if (elapsedDays >= intervalDays * 0.85) {
      // Preemptive Warning (within 85% of standard service schedule)
      const alreadyNotified = db.notifications.some(
        n => n.type === "warning" && n.message.includes(asset.assetTag) && n.title.includes("Preemptive")
      );

      if (!alreadyNotified) {
        const newNot: Notification = {
          id: `not-preempt-near-${asset.id}-${Date.now()}`,
          userId: "all",
          title: "Preemptive Maintenance Warning",
          message: `Preemptive Alert: Asset ${asset.name} (${asset.assetTag}) is near its expected service cycle of ${intervalDays} days (Elapsed: ${elapsedDays}/${intervalDays} days). Consider scheduling a service soon.`,
          isRead: false,
          createdAt: now.toISOString(),
          type: "warning"
        };
        db.notifications.unshift(newNot);
        warningsTriggered++;
        modified = true;
      }
    }
  });

  if (modified) {
    saveDatabaseState(db);
  }

  return { warningsTriggered };
}

// Global localization formatting helpers (draw dynamically from database settings)
export function formatCurrency(amount: number): string {
  const db = getDatabaseState();
  const currency = db.settings.currency || "MWK";
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: currency === "MWK" ? 0 : 2,
    maximumFractionDigits: currency === "MWK" ? 0 : 2
  });
  return `${currency} ${formatted}`;
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  // Hande standardized ISO formatting or YYYY-MM-DD
  const parts = dateString.split("T")[0].split("-");
  if (parts.length !== 3) return dateString; // Rollback
  const [year, month, day] = parts;
  
  const db = getDatabaseState();
  const format = db.settings.dateFormat || "DD/MM/YYYY";
  if (format === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  } else if (format === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }
  // Default is DD/MM/YYYY
  return `${day}/${month}/${year}`;
}
