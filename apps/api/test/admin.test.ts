import { describe, expect, it } from 'vitest';
import { createAdminHandler } from '../src/admin';
import { createSupabaseAdminStore, type AdminStore, type AdminUser, type AuditEntry, type Role } from '../src/admin-store';
import type { FetchLike } from '../src/auth';
import { createHandler } from '../src/handler';
import type { ApiRequest } from '../src/http';

const ADMIN = '00000000-0000-4000-8000-00000000000a';
const OTHER_ADMIN = '00000000-0000-4000-8000-00000000000c';
const USER = '00000000-0000-4000-8000-00000000000b';

const makeStore = (opts: { failLog?: boolean } = {}) => {
  const people = new Map<string, { email: string; role: Role; locked: boolean }>([
    [ADMIN, { email: 'admin@x.com', role: 'admin', locked: false }],
    [OTHER_ADMIN, { email: 'admin2@x.com', role: 'admin', locked: false }],
    [USER, { email: 'user@x.com', role: 'user', locked: false }]
  ]);
  const logs: AuditEntry[] = [];
  const order: string[] = [];
  const toAdminUser = (id: string): AdminUser => ({ id, email: people.get(id)!.email, createdAt: '2026-01-01', lastSignInAt: null, bannedUntil: null, role: people.get(id)!.role, readingCount: 3, decks: ['rws'] });
  const store: AdminStore = {
    getRole: async (id) => people.get(id)?.role ?? null,
    getUser: async (id) => (people.has(id) ? { id, email: people.get(id)!.email, role: people.get(id)!.role } : null),
    listUsers: async () => ({ users: [...people.keys()].map(toAdminUser), total: people.size }),
    listAdmins: async () => [...people].filter(([, p]) => p.role === 'admin').map(([id]) => toAdminUser(id)),
    setRole: async (id, role) => { order.push('setRole'); people.get(id)!.role = role; },
    setLocked: async (id, locked) => { order.push('setLocked'); people.get(id)!.locked = locked; },
    deleteUser: async (id) => { order.push('delete'); people.delete(id); },
    log: async (entry) => { if (opts.failLog) throw new Error('log down'); order.push('log'); logs.push(entry); }
  };
  return { store, people, logs, order };
};

const setup = (opts: { failLog?: boolean } = {}) => {
  const fake = makeStore(opts);
  const events: string[] = [];
  const handler = createAdminHandler({
    verify: async (t) => (t === 'admin' ? { id: ADMIN, email: 'admin@x.com' } : t === 'user' ? { id: USER, email: 'user@x.com' } : null),
    store: fake.store,
    onEvent: (e) => events.push(e.type)
  });
  const call = async (method: string, path: string, over: Partial<ApiRequest> & { token?: string | null } = {}) => {
    const token = over.token === undefined ? 'admin' : over.token;
    const res = await handler({ method, path, headers: token ? { authorization: `Bearer ${token}` } : {}, body: over.body, ...(over.query ? { query: over.query } : {}) });
    return { status: res.status, body: res.body as any };
  };
  return { ...fake, events, call };
};

describe('quyền truy cập /v1/admin', () => {
  it('401 khi thiếu hoặc sai token, 403 khi không phải admin', async () => {
    const { call, events } = setup();
    expect((await call('GET', '/v1/admin/users', { token: null })).status).toBe(401);
    expect((await call('GET', '/v1/admin/users', { token: 'bad' })).status).toBe(401);
    expect((await call('GET', '/v1/admin/users', { token: 'user' })).status).toBe(403);
    expect(events).toContain('admin_denied');
  });
  it('route admin trả 503 khi chưa bật trên máy chủ', async () => {
    const handler = createHandler({ llm: { complete: async () => '' }, verify: async () => null, perMinuteLimit: 5, perDayLimit: 40 });
    expect((await handler({ method: 'GET', path: '/v1/admin/users', headers: {}, body: undefined })).status).toBe(503);
  });
});

describe('danh sách tài khoản', () => {
  it('trả người dùng kèm số lần rút và bộ bài đã dùng; giới hạn perPage', async () => {
    const { call } = setup();
    const res = await call('GET', '/v1/admin/users', { query: { page: '2', perPage: '9999' } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, perPage: 100, total: 3 });
    expect(res.body.users[0]).toMatchObject({ email: 'admin@x.com', role: 'admin', readingCount: 3, decks: ['rws'] });
  });
  it('liệt kê các tài khoản admin', async () => {
    const { call } = setup();
    expect((await call('GET', '/v1/admin/admins')).body.admins.map((a: AdminUser) => a.email)).toEqual(['admin@x.com', 'admin2@x.com']);
  });
});

describe('cấp và thu hồi quyền admin', () => {
  it('cấp quyền và ghi nhật ký', async () => {
    const { call, people, logs } = setup();
    expect((await call('POST', `/v1/admin/users/${USER}/role`, { body: { role: 'admin' } })).status).toBe(200);
    expect(people.get(USER)!.role).toBe('admin');
    expect(logs[0]).toMatchObject({ action: 'role.grant', actorId: ADMIN, targetId: USER });
  });
  it('không cho tự bỏ quyền của chính mình', async () => {
    const { call, people } = setup();
    const res = await call('POST', `/v1/admin/users/${ADMIN}/role`, { body: { role: 'user' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('cannot_demote_self');
    expect(people.get(ADMIN)!.role).toBe('admin');
  });
  it('thu hồi quyền của admin khác', async () => {
    const { call, people, logs } = setup();
    expect((await call('POST', `/v1/admin/users/${OTHER_ADMIN}/role`, { body: { role: 'user' } })).status).toBe(200);
    expect(people.get(OTHER_ADMIN)!.role).toBe('user');
    expect(logs[0]?.action).toBe('role.revoke');
  });
  it('từ chối role sai và mã tài khoản sai', async () => {
    const { call } = setup();
    expect((await call('POST', `/v1/admin/users/${USER}/role`, { body: { role: 'root' } })).status).toBe(400);
    expect((await call('POST', '/v1/admin/users/not-a-uuid/role', { body: { role: 'admin' } })).status).toBe(400);
  });
});

describe('khóa tài khoản', () => {
  it('khóa và mở khóa người dùng thường, có nhật ký', async () => {
    const { call, people, logs } = setup();
    expect((await call('POST', `/v1/admin/users/${USER}/lock`, { body: { locked: true } })).status).toBe(200);
    expect(people.get(USER)!.locked).toBe(true);
    await call('POST', `/v1/admin/users/${USER}/lock`, { body: { locked: false } });
    expect(logs.map((l) => l.action)).toEqual(['user.lock', 'user.unlock']);
  });
  it('không khóa chính mình hoặc admin khác', async () => {
    const { call, people } = setup();
    expect((await call('POST', `/v1/admin/users/${ADMIN}/lock`, { body: { locked: true } })).status).toBe(400);
    expect((await call('POST', `/v1/admin/users/${OTHER_ADMIN}/lock`, { body: { locked: true } })).status).toBe(409);
    expect(people.get(OTHER_ADMIN)!.locked).toBe(false);
  });
});

describe('xóa tài khoản', () => {
  it('cần nhập đúng email xác nhận', async () => {
    const { call, people } = setup();
    expect((await call('DELETE', `/v1/admin/users/${USER}`, { body: {} })).body.error.code).toBe('confirmation_required');
    expect((await call('DELETE', `/v1/admin/users/${USER}`, { body: { confirm: 'khac@x.com' } })).status).toBe(400);
    expect(people.has(USER)).toBe(true);
  });
  it('ghi nhật ký TRƯỚC khi xóa', async () => {
    const { call, people, order, logs } = setup();
    expect((await call('DELETE', `/v1/admin/users/${USER}`, { body: { confirm: 'user@x.com' } })).status).toBe(200);
    expect(order).toEqual(['log', 'delete']);
    expect(logs[0]).toMatchObject({ action: 'user.delete', targetEmail: 'user@x.com', actorEmail: 'admin@x.com' });
    expect(people.has(USER)).toBe(false);
  });
  it('không xóa nếu không ghi được nhật ký', async () => {
    const { call, people } = setup({ failLog: true });
    expect((await call('DELETE', `/v1/admin/users/${USER}`, { body: { confirm: 'user@x.com' } })).status).toBe(502);
    expect(people.has(USER)).toBe(true);
  });
  it('không xóa chính mình hoặc admin', async () => {
    const { call } = setup();
    expect((await call('DELETE', `/v1/admin/users/${ADMIN}`, { body: { confirm: 'admin@x.com' } })).status).toBe(400);
    expect((await call('DELETE', `/v1/admin/users/${OTHER_ADMIN}`, { body: { confirm: 'admin2@x.com' } })).status).toBe(409);
  });
});

describe('createSupabaseAdminStore', () => {
  it('luôn gửi service_role tới Supabase và gọi đúng đường dẫn', async () => {
    const calls: { url: string; method?: string; headers?: Record<string, string>; body?: string }[] = [];
    const respond = (url: string): unknown => {
      if (url.includes('/auth/v1/admin/users?')) return { users: [{ id: USER, email: 'user@x.com', created_at: '2026-01-01', last_sign_in_at: '2026-02-01' }] };
      if (url.includes('/rest/v1/profiles')) return [{ id: USER, role: 'user' }];
      if (url.includes('admin_reading_stats')) return [{ user_id: USER, reading_count: 7, decks: ['rws', 'moon'] }];
      return {};
    };
    const fetchFake: FetchLike = async (url, init) => {
      calls.push({ url, ...init });
      const body = respond(url);
      return { ok: true, status: 200, headers: { get: (n) => (n === 'x-total-count' ? '42' : null) }, json: async () => body, text: async () => JSON.stringify(body) };
    };
    const store = createSupabaseAdminStore({ url: 'https://p.supabase.co', serviceKey: 'SERVICE', fetch: fetchFake });
    const { users, total } = await store.listUsers({ page: 1, perPage: 50 });
    expect(total).toBe(42);
    expect(users[0]).toMatchObject({ email: 'user@x.com', role: 'user', readingCount: 7, decks: ['rws', 'moon'], lastSignInAt: '2026-02-01' });
    await store.setLocked(USER, true);
    await store.deleteUser(USER);
    expect(calls.every((c) => c.headers?.authorization === 'Bearer SERVICE' && c.headers.apikey === 'SERVICE')).toBe(true);
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toBe(`https://p.supabase.co/auth/v1/admin/users/${USER}`);
    expect(JSON.parse(put.body!)).toEqual({ ban_duration: '876000h' });
    expect(calls.find((c) => c.method === 'DELETE')!.url).toBe(`https://p.supabase.co/auth/v1/admin/users/${USER}`);
  });
  it('từ chối id không phải UUID, không ghép vào URL', async () => {
    const store = createSupabaseAdminStore({ url: 'https://p.supabase.co', serviceKey: 'S', fetch: async () => { throw new Error('không được gọi'); } });
    await expect(store.deleteUser('1;drop')).rejects.toThrow();
    expect(await store.getRole('x')).toBeNull();
  });
});
