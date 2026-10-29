import { bearerToken, type VerifyToken } from './auth';
import { UUID, type AdminStore, type Role } from './admin-store';
import { errorBody, json, type ApiRequest, type ApiResponse } from './http';

export type AdminDeps = {
  verify: VerifyToken;
  store: AdminStore;
  onEvent?: (event: { type: 'admin_action' | 'admin_denied' | 'admin_error'; detail?: string }) => void;
};

const MAX_PER_PAGE = 100;

const intParam = (raw: string | undefined, fallback: number, max: number): number => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Các route /v1/admin/*. Người gọi phải có token Supabase hợp lệ và có vai trò admin trong bảng profiles
 * (đọc bằng service_role ở phía api, không tin dữ liệu do trình duyệt gửi lên).
 *   GET    /v1/admin/users?page&perPage
 *   GET    /v1/admin/admins
 *   POST   /v1/admin/users/:id/role   { role: 'admin' | 'user' }
 *   POST   /v1/admin/users/:id/lock   { locked: boolean }
 *   DELETE /v1/admin/users/:id        { confirm: <email của tài khoản bị xóa> }
 */
export const createAdminHandler = (deps: AdminDeps) => {
  const { store } = deps;
  const deny = (status: number, code: string, message: string) => json(status, errorBody(code, message));

  return async (req: ApiRequest): Promise<ApiResponse> => {
    const token = bearerToken(req.headers.authorization);
    const caller = token ? await deps.verify(token) : null;
    if (!caller) return deny(401, 'unauthorized', 'Bạn cần đăng nhập.');

    try {
      if ((await store.getRole(caller.id)) !== 'admin') {
        deps.onEvent?.({ type: 'admin_denied', detail: req.method + ' ' + req.path });
        return deny(403, 'forbidden', 'Bạn không có quyền quản trị.');
      }
      const actor = { actorId: caller.id, actorEmail: caller.email };
      const path = req.path;
      const query = req.query ?? {};

      if (req.method === 'GET' && path === '/v1/admin/users') {
        const page = intParam(query.page, 1, 1_000_000);
        const perPage = intParam(query.perPage, 50, MAX_PER_PAGE);
        return json(200, { ...(await store.listUsers({ page, perPage })), page, perPage });
      }
      if (req.method === 'GET' && path === '/v1/admin/admins') return json(200, { admins: await store.listAdmins() });

      const match = /^\/v1\/admin\/users\/([^/]+)(?:\/(role|lock))?$/.exec(path);
      if (!match) return deny(404, 'not_found', 'Không tìm thấy.');
      const [, id, action] = match as unknown as [string, string, 'role' | 'lock' | undefined];
      if (!UUID.test(id)) return deny(400, 'invalid_request', 'Mã tài khoản không hợp lệ.');

      const target = await store.getUser(id);
      if (!target) return deny(404, 'not_found', 'Không tìm thấy tài khoản.');
      const body = isObject(req.body) ? req.body : {};
      const done = (detail: string) => { deps.onEvent?.({ type: 'admin_action', detail }); };

      if (req.method === 'POST' && action === 'role') {
        const role = body.role;
        if (role !== 'admin' && role !== 'user') return deny(400, 'invalid_request', 'role phải là admin hoặc user.');
        if (id === caller.id && role !== 'admin') return deny(400, 'cannot_demote_self', 'Bạn không thể tự bỏ quyền quản trị của chính mình.');
        if (target.role === role) return json(200, { ok: true, role });
        await store.log({ ...actor, action: role === 'admin' ? 'role.grant' : 'role.revoke', targetId: id, targetEmail: target.email });
        await store.setRole(id, role as Role);
        done(role === 'admin' ? 'role.grant' : 'role.revoke');
        return json(200, { ok: true, role });
      }

      if (req.method === 'POST' && action === 'lock') {
        if (typeof body.locked !== 'boolean') return deny(400, 'invalid_request', 'locked phải là true hoặc false.');
        if (id === caller.id) return deny(400, 'cannot_target_self', 'Bạn không thể khóa chính mình.');
        if (target.role === 'admin') return deny(409, 'target_is_admin', 'Hãy bỏ quyền quản trị của tài khoản này trước khi khóa.');
        await store.log({ ...actor, action: body.locked ? 'user.lock' : 'user.unlock', targetId: id, targetEmail: target.email });
        await store.setLocked(id, body.locked);
        done(body.locked ? 'user.lock' : 'user.unlock');
        return json(200, { ok: true, locked: body.locked });
      }

      if (req.method === 'DELETE' && !action) {
        if (id === caller.id) return deny(400, 'cannot_target_self', 'Bạn không thể xóa chính mình.');
        if (target.role === 'admin') return deny(409, 'target_is_admin', 'Hãy bỏ quyền quản trị của tài khoản này trước khi xóa.');
        if (!target.email || body.confirm !== target.email) return deny(400, 'confirmation_required', 'Cần nhập đúng email của tài khoản để xác nhận xóa.');
        // Ghi nhật ký trước: nếu không ghi được thì không xóa.
        await store.log({ ...actor, action: 'user.delete', targetId: id, targetEmail: target.email });
        await store.deleteUser(id);
        done('user.delete');
        return json(200, { ok: true });
      }

      return deny(405, 'method_not_allowed', 'Phương thức không được hỗ trợ.');
    } catch (error) {
      deps.onEvent?.({ type: 'admin_error', detail: error instanceof Error ? error.message : 'unknown' });
      return deny(502, 'upstream_error', 'Không thực hiện được. Hãy thử lại sau.');
    }
  };
};
