export type AuthUser = { id: string; email: string | null };
export type VerifyToken = (token: string) => Promise<AuthUser | null>;
export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; headers?: { get(name: string): string | null }; json(): Promise<unknown>; text(): Promise<string> }>;

/**
 * Xác thực token đăng nhập bằng cách hỏi chính Supabase Auth (GET /auth/v1/user).
 * Không tự giải mã JWT ở đây, nên không cần giữ khóa bí mật JWT trong api.
 */
export const createSupabaseVerifier = (options: { url: string; anonKey: string; fetch: FetchLike; timeoutMs?: number }): VerifyToken =>
  async (token) => {
    if (!token) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
    try {
      const res = await options.fetch(`${options.url}/auth/v1/user`, {
        headers: { apikey: options.anonKey, authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { id?: unknown; email?: unknown };
      if (typeof data.id !== 'string') return null;
      return { id: data.id, email: typeof data.email === 'string' ? data.email : null };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

export const bearerToken = (header: string | undefined): string | null => {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match?.[1] ?? null;
};
