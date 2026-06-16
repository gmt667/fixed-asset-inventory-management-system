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
  notifications: Notification[];
  settings: SystemSettings;
}

const STORAGE_KEY = "faims_db_state";
export const DATABASE_SYNC_EVENT = "faims_db_synced";

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

const defaultSettings: SystemSettings = {
  orgName: "FAIMS Malawi Asset Management System",
  logo: "FA",
  theme: "light",
  emailHost: "smtp.faims.local",
  emailPort: "587",
  emailSender: "noreply@faims.local",
  isNotificationsEnabled: true,
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
  users: [defaultUsers[0]],
  passwords: { [defaultUsers[0].id]: defaultPasswords[defaultUsers[0].id] },
  clients: [],
  categories: [],
  departments: [],
  locations: [],
  suppliers: [],
  assets: [],
  assignments: [],
  transfers: [],
  maintenance: [],
  verifications: [],
  disposals: [],
  auditLogs: [],
  notifications: [],
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
  return {
    ...state,
    users: Array.isArray(state.users)
      ? state.users.filter(user => !seedIds.users.has(user.id))
      : [defaultUsers[0]],
    clients: Array.isArray(state.clients) ? state.clients.filter(item => !seedIds.clients.has(item.id)) : [],
    categories: Array.isArray(state.categories) ? state.categories.filter(item => !seedIds.categories.has(item.id)) : [],
    departments: Array.isArray(state.departments) ? state.departments.filter(item => !seedIds.departments.has(item.id)) : [],
    locations: Array.isArray(state.locations) ? state.locations.filter(item => !seedIds.locations.has(item.id)) : [],
    suppliers: Array.isArray(state.suppliers) ? state.suppliers.filter(item => !seedIds.suppliers.has(item.id)) : [],
    assets: Array.isArray(state.assets) ? state.assets.filter(item => !seedIds.assets.has(item.id)) : [],
    assignments: Array.isArray(state.assignments) ? state.assignments.filter(item => !seedIds.assignments.has(item.id)) : [],
    transfers: Array.isArray(state.transfers) ? state.transfers.filter(item => !seedIds.transfers.has(item.id)) : [],
    maintenance: Array.isArray(state.maintenance) ? state.maintenance.filter(item => !seedIds.maintenance.has(item.id)) : [],
    verifications: Array.isArray(state.verifications) ? state.verifications.filter(item => !seedIds.verifications.has(item.id)) : [],
    disposals: Array.isArray(state.disposals) ? state.disposals.filter(item => !seedIds.disposals.has(item.id)) : [],
    auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs.filter(item => !seedIds.auditLogs.has(item.id)) : [],
    notifications: Array.isArray(state.notifications) ? state.notifications.filter(item => !seedIds.notifications.has(item.id)) : []
  };
}

export function getDatabaseState(): DBState {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initialState = emptyOperationalState();
    saveDatabaseState(initialState);
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
    if (!Array.isArray(parsed.notifications)) parsed.notifications = [];

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

    if (modified) {
      saveDatabaseState(parsed);
    }
    return parsed;
  } catch (e) {
    // If storage is corrupt, recover to a clean bootstrap state.
    const cleanState = emptyOperationalState();
    saveDatabaseState(cleanState);
    return cleanState;
  }
}

export function saveDatabaseState(state: DBState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATABASE_SYNC_EVENT));
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

// ==========================================
// CLIENT-SIDE BUFFERING & OFFLINE ENGINE APIs
// ==========================================

const OFFLINE_MODE_KEY = "faims_offline_mode";
const BUFFER_VERIFICATIONS_KEY = "faims_offline_buffer_verifications";
const BUFFER_AUDIT_LOGS_KEY = "faims_offline_buffer_audit_logs";

export function isOffline(): boolean {
  const offlineOverride = localStorage.getItem(OFFLINE_MODE_KEY);
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
