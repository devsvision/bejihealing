const USER_STORAGE_KEY = "beji-dashboard-users";
const CURRENT_USER_KEY = "beji-current-user";

export const ROLE_RULES = {
  "Super Admin": {
    homeRoute: "dashboard",
    allowedRoutes: "*",
    canCreateSuperAdmin: true
  },
  Admin: {
    homeRoute: "dashboard",
    allowedRoutes: ["dashboard", "dashboard-booking", "dashboard-calendar", "dashboard-services", "dashboard-healers", "customers", "finance", "reports", "users"],
    canCreateSuperAdmin: false
  },
  Finance: {
    homeRoute: "finance",
    allowedRoutes: ["dashboard", "finance", "reports"],
    canCreateSuperAdmin: false
  },
  "Front Office": {
    homeRoute: "front-office",
    allowedRoutes: ["front-office"],
    canCreateSuperAdmin: false
  },
  Staff: {
    homeRoute: "front-office",
    allowedRoutes: ["front-office"],
    canCreateSuperAdmin: false
  },
  Healer: {
    homeRoute: "dashboard-healers",
    allowedRoutes: ["dashboard-healers"],
    canCreateSuperAdmin: false
  },
  "Content Manager": {
    homeRoute: "dashboard-services",
    allowedRoutes: ["dashboard", "dashboard-services", "dashboard-healers"],
    canCreateSuperAdmin: false
  }
};

export const DEFAULT_USERS = [
  {
    id: "USR-0001",
    name: "Super Admin",
    email: "superadmin@bejihealing.com",
    phone: "+62 813 9788 880",
    role: "Super Admin",
    dashboard: "Admin Dashboard",
    permission: "super-admin",
    status: "active",
    photo: "",
    password: "healing",
    notes: "Hidden owner account with full access."
  },
  {
    id: "USR-0002",
    name: "System Admin",
    email: "admin@bejihealing.com",
    phone: "+62 813 9788 886",
    role: "Admin",
    dashboard: "Admin Dashboard",
    permission: "admin",
    status: "active",
    photo: "",
    password: "healing",
    notes: "Administrator account without settings access."
  },
  {
    id: "USR-0003",
    name: "Front Office",
    email: "fo@bejihealing.com",
    phone: "+62 813 9788 887",
    role: "Front Office",
    dashboard: "Front Office Dashboard",
    permission: "front-office",
    status: "active",
    photo: "",
    password: "healing",
    notes: "Front office operational login."
  },
  {
    id: "USR-0004",
    name: "Healer Team",
    email: "healer@bejihealing.com",
    phone: "+62 813 9788 888",
    role: "Healer",
    dashboard: "Healer Dashboard",
    permission: "healer",
    status: "active",
    photo: "",
    password: "healing",
    notes: "Healer dashboard login."
  }
];

export function loadUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
    const users = Array.isArray(stored) && stored.length ? stored : DEFAULT_USERS;
    return ensureDefaultUsers(users);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return DEFAULT_USERS;
  }
}

export function saveUsers(users) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(ensureDefaultUsers(users)));
}

export function loginUser(email, password) {
  const user = loadUsers().find((item) => item.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.status !== "active") return null;
  if ((user.password || "healing") !== password) return null;
  const sessionUser = sanitizeUser(user);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
  } catch {
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

export function getAccessRule(user = getCurrentUser()) {
  return ROLE_RULES[user?.role] || ROLE_RULES.Admin;
}

export function canAccessRoute(routeName, user = getCurrentUser()) {
  if (!user) return true;
  const rule = getAccessRule(user);
  if (rule.allowedRoutes === "*") return true;
  if (rule.deniedRoutes?.includes(routeName)) return false;
  if (rule.allowedRoutes) return rule.allowedRoutes.includes(routeName);
  return true;
}

export function canCreateSuperAdmin(user = getCurrentUser()) {
  return Boolean(getAccessRule(user).canCreateSuperAdmin);
}

export function isSuperAdmin(user = getCurrentUser()) {
  return user?.role === "Super Admin";
}

export function routeForUser(user = getCurrentUser()) {
  return getAccessRule(user).homeRoute || "dashboard";
}

export function sanitizeUser(user) {
  const { password, confirmPassword, ...safeUser } = user;
  return safeUser;
}

function ensureDefaultUsers(users) {
  const byEmail = new Map(users.map((user) => [String(user.email).toLowerCase(), user]));
  DEFAULT_USERS.forEach((defaultUser) => {
    if (!byEmail.has(defaultUser.email.toLowerCase())) byEmail.set(defaultUser.email.toLowerCase(), defaultUser);
  });
  return [...byEmail.values()];
}
