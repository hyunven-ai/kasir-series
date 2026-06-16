import { Role, AuthUser } from './types';

const STORAGE_KEY = 'series_ponsel_auth';

// Demo accounts (sebelum Supabase Auth dikonfigurasi)
const DEMO_ACCOUNTS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    nama_lengkap: 'Super Admin',
    role: 'super_admin' as Role,
  },
  {
    id: 2,
    username: 'gudang',
    password: 'gudang123',
    nama_lengkap: 'Admin Gudang',
    role: 'admin_gudang' as Role,
  },
  {
    id: 3,
    username: 'kasir',
    password: 'kasir123',
    nama_lengkap: 'Kasir 1',
    role: 'kasir' as Role,
  },
];

export const DEMO_ACCOUNTS_PUBLIC = DEMO_ACCOUNTS.map(a => ({
  username: a.username,
  password: a.password,
  role: a.role,
  nama_lengkap: a.nama_lengkap,
  is_active: true,
}));

export function getStoredUsers(): any[] {
  if (typeof window === 'undefined') return DEMO_ACCOUNTS;
  const stored = localStorage.getItem('series_ponsel_users');
  if (!stored) {
    const initial = DEMO_ACCOUNTS.map(a => ({ ...a, is_active: true }));
    localStorage.setItem('series_ponsel_users', JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEMO_ACCOUNTS.map(a => ({ ...a, is_active: true }));
  }
}

export function login(username: string, password: string): AuthUser | null {
  const users = getStoredUsers();
  const account = users.find(
    a => a.username.toLowerCase() === username.toLowerCase() && 
         a.password === password && 
         a.is_active !== false
  );
  if (!account) return null;

  const user: AuthUser = {
    id: account.id,
    username: account.username,
    nama_lengkap: account.nama_lengkap,
    role: account.role,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  return user;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

// RBAC - Permission check
export const PERMISSIONS: Record<Role, string[]> = {
  super_admin: [
    'dashboard', 'master', 'stock', 'transaksi', 'pengaturan', 'laporan'
  ],
  admin_gudang: [
    'master', 'stock'
  ],
  kasir: [
    'transaksi'
  ],
};

export function canAccess(role: Role, feature: string): boolean {
  return PERMISSIONS[role]?.includes(feature) ?? false;
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    super_admin: 'Super Admin',
    admin_gudang: 'Admin Gudang',
    kasir: 'Kasir',
  };
  return labels[role] ?? role;
}

export function getRoleBadgeClass(role: Role): string {
  const classes: Record<Role, string> = {
    super_admin: 'badge-error',
    admin_gudang: 'badge-info',
    kasir: 'badge-success',
  };
  return classes[role] ?? 'badge-gray';
}
