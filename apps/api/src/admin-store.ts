import type { FetchLike } from './auth';

export type Role = 'user' | 'admin';
export type AuditAction = 'user.delete' | 'user.lock' | 'user.unlock' | 'role.grant' | 'role.revoke';

export type AdminUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  role: Role;
  readingCount: number;
  decks: string[];
};
export type AuditEntry = { actorId: string; actorEmail: string | null; action: AuditAction; targetId: string; targetEmail: string | null; detail?: Record<string, unknown> };

/** Mọi thao tác trên tài khoản; chỉ api (giữ service_role) được dùng. Tách thành giao diện để kiểm thử bằng bản giả. */
export type AdminStore = {
  getRole(userId: string): Promise<Role | null>;
  getUser(userId: string): Promise<{ id: string; email: string | null; role: Role } | null>;
  listUsers(args: { page: number; perPage: number }): Promise<{ users: AdminUser[]; total: number | null }>;
  listAdmins(): Promise<AdminUser[]>;
  setRole(userId: string, role: Role): Promise<void>;
  setLocked(userId: string, locked: boolean): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  log(entry: AuditEntry): Promise<void>;
};

export class StoreError extends Error {}

type AuthUser = { id: string; email?: string | null; created_at?: string | null; last_sign_in_at?: string | null; banned_until?: string | null };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCK_DURATION = '876000h'; // khoảng 100 năm; mở khóa bằng 'none'

export const createSupabaseAdminStore = (options: { url: string; serviceKey: string; fetch: FetchLike }): AdminStore => {
  const headers = { apikey: options.serviceKey, authorization: `Bearer ${options.serviceKey}`, 'content-type': 'application/json' };

  const call = async (path: string, init: { method?: string; body?: unknown; prefer?: string } = {}) => {
    const res = await options.fetch(`${options.url}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...headers, ...(init.prefer ? { prefer: init.prefer } : {}) },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) })
    });
    if (!res.ok) throw new StoreError(`${init.method ?? 'GET'} ${path.split('?')[0]} → ${res.status}`);
    return res;
  };
  const ids = (list: string[]) => list.filter((id) => UUID.test(id));

  const roles = async (userIds: string[]): Promise<Map<string, Role>> => {
    const valid = ids(userIds);
    if (!valid.length) return new Map();
    const rows = (await (await call(`/rest/v1/profiles?select=id,role&id=in.(${valid.join(',')})`)).json()) as { id: string; role: Role }[];
    return new Map(rows.map((r) => [r.id, r.role]));
  };

  const stats = async (userIds: string[]): Promise<Map<string, { count: number; decks: string[] }>> => {
    const valid = ids(userIds);
    if (!valid.length) return new Map();
    const rows = (await (await call('/rest/v1/rpc/admin_reading_stats', { method: 'POST', body: { user_ids: valid } })).json()) as { user_id: string; reading_count: number; decks: string[] }[];
    return new Map(rows.map((r) => [r.user_id, { count: Number(r.reading_count), decks: r.decks }]));
  };

  const decorate = async (users: AuthUser[]): Promise<AdminUser[]> => {
    const userIds = users.map((u) => u.id);
    const [roleById, statById] = await Promise.all([roles(userIds), stats(userIds)]);
    return users.map((u) => ({
      id: u.id, email: u.email ?? null, createdAt: u.created_at ?? null, lastSignInAt: u.last_sign_in_at ?? null, bannedUntil: u.banned_until ?? null,
      role: roleById.get(u.id) ?? 'user', readingCount: statById.get(u.id)?.count ?? 0, decks: statById.get(u.id)?.decks ?? []
    }));
  };

  const authUser = async (userId: string): Promise<AuthUser | null> => {
    if (!UUID.test(userId)) return null;
    try { return (await (await call(`/auth/v1/admin/users/${userId}`)).json()) as AuthUser; } catch { return null; }
  };

  return {
    async getRole(userId) {
      if (!UUID.test(userId)) return null;
      return (await roles([userId])).get(userId) ?? null;
    },
    async getUser(userId) {
      const user = await authUser(userId);
      if (!user) return null;
      return { id: user.id, email: user.email ?? null, role: (await roles([userId])).get(userId) ?? 'user' };
    },
    async listUsers({ page, perPage }) {
      const res = await call(`/auth/v1/admin/users?page=${page}&per_page=${perPage}`);
      const body = (await res.json()) as { users?: AuthUser[]; total?: number };
      const total = Number(res.headers?.get('x-total-count') ?? body.total);
      return { users: await decorate(body.users ?? []), total: Number.isFinite(total) ? total : null };
    },
    async listAdmins() {
      const rows = (await (await call('/rest/v1/profiles?select=id&role=eq.admin&order=created_at')).json()) as { id: string }[];
      const users = (await Promise.all(rows.map((r) => authUser(r.id)))).filter((u): u is AuthUser => u !== null);
      return decorate(users);
    },
    async setRole(userId, role) {
      if (!UUID.test(userId)) throw new StoreError('invalid id');
      const updated = (await (await call(`/rest/v1/profiles?id=eq.${userId}`, { method: 'PATCH', body: { role }, prefer: 'return=representation' })).json()) as unknown[];
      if (!updated.length) throw new StoreError('profile not found');
    },
    async setLocked(userId, locked) {
      if (!UUID.test(userId)) throw new StoreError('invalid id');
      await call(`/auth/v1/admin/users/${userId}`, { method: 'PUT', body: { ban_duration: locked ? LOCK_DURATION : 'none' } });
    },
    async deleteUser(userId) {
      if (!UUID.test(userId)) throw new StoreError('invalid id');
      await call(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
    },
    async log(entry) {
      await call('/rest/v1/admin_audit_log', {
        method: 'POST', prefer: 'return=minimal',
        body: { actor_id: entry.actorId, actor_email: entry.actorEmail, action: entry.action, target_id: entry.targetId, target_email: entry.targetEmail, detail: entry.detail ?? {} }
      });
    }
  };
};
