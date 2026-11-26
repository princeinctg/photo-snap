import type { UserRole } from "@/types";

export type Permission =
  | "*"
  | "users:read"
  | "users:write"
  | "clients:read"
  | "clients:write"
  | "employees:read"
  | "employees:write"
  | "profiles:read"
  | "profiles:write"
  | "bookings:read"
  | "bookings:write"
  | "projects:read"
  | "projects:write"
  | "galleries:read"
  | "galleries:write"
  | "services:read"
  | "services:write"
  | "packages:read"
  | "packages:write"
  | "invoices:read"
  | "invoices:write"
  | "payments:read"
  | "payments:write"
  | "expenses:read"
  | "expenses:write"
  | "finances:read"
  | "attendance:read"
  | "attendance:write"
  | "notifications:read"
  | "notifications:write"
  | "settings:read"
  | "settings:write"
  | "audit:read"
  | "seed:run";

const MANAGER_PERMISSIONS: Permission[] = [
  "clients:read",
  "clients:write",
  "employees:read",
  "employees:write",
  "bookings:read",
  "bookings:write",
  "projects:read",
  "projects:write",
  "galleries:read",
  "galleries:write",
  "services:read",
  "packages:read",
  "invoices:read",
  "invoices:write",
  "payments:read",
  "payments:write",
  "expenses:read",
  "finances:read",
  "attendance:read",
  "attendance:write",
  "notifications:read",
  "notifications:write",
  "profiles:read",
  "profiles:write",
];

const EMPLOYEE_PERMISSIONS: Permission[] = [
  "clients:read",
  "bookings:read",
  "projects:read",
  "galleries:read",
  "services:read",
  "packages:read",
  "attendance:read",
  "notifications:read",
  "profiles:read",
  "profiles:write",
];

const CLIENT_PERMISSIONS: Permission[] = [
  "bookings:read",
  "galleries:read",
  "invoices:read",
  "payments:read",
  "notifications:read",
  "profiles:read",
  "profiles:write",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ["*"],
  admin: [
    "users:read",
    "users:write",
    "clients:read",
    "clients:write",
    "employees:read",
    "employees:write",
    "profiles:read",
    "profiles:write",
    "bookings:read",
    "bookings:write",
    "projects:read",
    "projects:write",
    "galleries:read",
    "galleries:write",
    "services:read",
    "services:write",
    "packages:read",
    "packages:write",
    "invoices:read",
    "invoices:write",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "finances:read",
    "attendance:read",
    "attendance:write",
    "notifications:read",
    "notifications:write",
    "settings:read",
    "settings:write",
    "audit:read",
  ],
  manager: MANAGER_PERMISSIONS,
  employee: EMPLOYEE_PERMISSIONS,
  client: CLIENT_PERMISSIONS,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  client: "Client",
};

export const STAFF_ROLES: UserRole[] = ["super_admin", "admin", "manager", "employee"];
export const MANAGEMENT_ROLES: UserRole[] = ["super_admin", "admin", "manager"];

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.includes("*") || permissions.includes(permission);
}

export function isStaff(role: string | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role as UserRole);
}

export function isManagement(role: string | undefined | null): boolean {
  return !!role && MANAGEMENT_ROLES.includes(role as UserRole);
}

/** Roles that may be assigned by each role through the user-management API. */
export function assignableRoles(actorRole: string): UserRole[] {
  if (actorRole === "super_admin") return [...USER_ROLE_VALUES];
  if (actorRole === "admin") return ["manager", "employee", "client"];
  return [];
}

const USER_ROLE_VALUES: UserRole[] = ["super_admin", "admin", "manager", "employee", "client"];
