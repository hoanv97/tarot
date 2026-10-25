export type AccountRole = 'user' | 'admin';
export type AdminAccount = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  role: AccountRole;
  readingCount: number;
  decks: string[];
};
export type UsersPage = { users: AdminAccount[]; total: number | null; page: number; perPage: number };

export class AdminApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

const base = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Gọi api admin bằng token đăng nhập của quản trị viên; api tự kiểm tra lại vai trò, không tin trình duyệt. */
const request = async <T>(token: string, method: string, path: string, body?: unknown): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    throw new AdminApiError(0, 'network', 'Network error');
  }
  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | T | null;
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new AdminApiError(res.status, error?.code ?? 'error', error?.message ?? 'Request failed');
  }
  return data as T;
};

export const listUsers = (token: string, page: number) => request<UsersPage>(token, 'GET', `/v1/admin/users?page=${page}&perPage=25`);
export const listAdmins = (token: string) => request<{ admins: AdminAccount[] }>(token, 'GET', '/v1/admin/admins');
export const setRole = (token: string, id: string, role: AccountRole) => request<{ ok: true }>(token, 'POST', `/v1/admin/users/${id}/role`, { role });
export const setLocked = (token: string, id: string, locked: boolean) => request<{ ok: true }>(token, 'POST', `/v1/admin/users/${id}/lock`, { locked });
export const deleteUser = (token: string, id: string, confirm: string) => request<{ ok: true }>(token, 'DELETE', `/v1/admin/users/${id}`, { confirm });
