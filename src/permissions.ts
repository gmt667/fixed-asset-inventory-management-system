import { UserRole } from "./types";

export type Permission =
  | "asset:create"
  | "asset:edit"
  | "asset:delete"
  | "asset:assign"
  | "asset:transfer"
  | "asset:maintenance"
  | "asset:verification"
  | "client:view"
  | "client:create"
  | "client:edit"
  | "client:archive"
  | "client:delete"
  | "report:view"
  | "audit:view"
  | "user:manage"
  | "role:manage"
  | "security:manage"
  | "settings:manage"
  | "system:configure"
  | "profile:manage";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    "asset:create", "asset:edit", "asset:delete", "asset:assign", "asset:transfer", "asset:maintenance", "asset:verification",
    "client:view", "client:create", "client:edit", "client:archive", "client:delete",
    "report:view", "audit:view", "user:manage", "role:manage", "security:manage", "settings:manage", "system:configure", "profile:manage"
  ],
  [UserRole.ASSET_MANAGER]: [
    "asset:create", "asset:edit", "asset:assign", "asset:transfer", "asset:maintenance", "asset:verification",
    "client:view", "client:create", "client:edit", "client:archive",
    "report:view", "profile:manage"
  ],
  [UserRole.DEPT_MANAGER]: [
    "asset:transfer", "asset:maintenance", "asset:verification", "report:view", "profile:manage"
  ],
  [UserRole.AUDITOR]: [
    "client:view", "report:view", "audit:view", "profile:manage"
  ],
  [UserRole.EMPLOYEE]: [
    "asset:maintenance", "profile:manage"
  ]
};

export const can = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const canAny = (role: UserRole, permissions: Permission[]): boolean => {
  return permissions.some(permission => can(role, permission));
};
