import { describe, expect, it } from 'vitest';
import { bearerToken, createSupabaseVerifier, type FetchLike } from '../src/auth';
import { createCache } from '../src/cache';
import { ConfigError, loadConfig } from '../src/config';
import { LlmError, createClaudeClient } from '../src/llm';
import { createRateLimiter } from '../src/rate-limit';

const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

describe('loadConfig', () => {
  const env = { ANTHROPIC_API_KEY: 'k', SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_ANON_KEY: 'a' };
  it('đọc cấu hình và đặt mặc định', () => {
    const c = loadConfig(env);
    expect(c).toMatchObject({ port: 4000, anthropicModel: 'claude-sonnet-5-5', supabaseUrl: 'https://x.supabase.co', perMinuteLimit: 5, perDayLimit: 40 });
    expect(c.corsOrigins).toEqual(['http://localhost:3000']);
  });
  it('báo lỗi khi thiếu biến bắt buộc hoặc số không hợp lệ', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ ...env, PORT: 'abc' })).toThrow(/PORT/);
  });
  it('tách nhiều origin', () => {
    expect(loadConfig({ ...env, CORS_ORIGINS: 'https://a.com, https://b.com' }).corsOrigins).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('bearerToken / verifier', () => {
  it('tách token', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def');
    expect(bearerToken('bearer x')).toBe('x');
    expect(bearerToken('Basic x')).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
  });
  it('gọi Supabase Auth và trả về người dùng', async () => {
    let seen: { url: string; headers?: Record<string, string> } | undefined;
    const fetch: FetchLike = async (url, init) => { seen = { url, headers: init?.headers }; return ok({ id: 'u1', email: 'a@b.c' }); };
    const verify = createSupabaseVerifier({ url: 'https://x.supabase.co', anonKey: 'anon', fetch });
    expect(await verify('tok')).toEqual({ id: 'u1', email: 'a@b.c' });
    expect(seen?.url).toBe('https://x.supabase.co/auth/v1/user');
    expect(seen?.headers).toEqual({ apikey: 'anon', authorization: 'Bearer tok' });
  });
  it('trả null khi token sai, thiếu id, hoặc lỗi mạng', async () => {
    expect(await createSupabaseVerifier({ url: 'u', anonKey: 'a', fetch: async () => ok({}, 401) })('t')).toBeNull();
    expect(await createSupabaseVerifier({ url: 'u', anonKey: 'a', fetch: async () => ok({ email: 'x' }) })('t')).toBeNull();
    expect(await createSupabaseVerifier({ url: 'u', anonKey: 'a', fetch: async () => { throw new Error('down'); } })('t')).toBeNull();
    expect(await createSupabaseVerifier({ url: 'u', anonKey: 'a', fetch: async () => ok({ id: 'x' }) })('')).toBeNull();
  });
});

describe('createClaudeClient', () => {
  it('gửi đúng yêu cầu và ghép các khối text', async () => {
    let call: { url: string; headers?: Record<string, string>; body?: string } | undefined;
    const fetch: FetchLike = async (url, init) => { call = { url, headers: init?.headers, body: init?.body }; return ok({ content: [{ type: 'text', text: 'Xin ' }, { type: 'text', text: 'chào' }] }); };
    const client = createClaudeClient({ apiKey: 'sk', model: 'm', fetch });
    expect(await client.complete({ system: 'S', user: 'U', maxTokens: 100 })).toBe('Xin chào');
    expect(call?.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call?.headers?.['x-api-key']).toBe('sk');
    expect(call?.headers?.['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(call?.body ?? '{}');
    expect(body).toMatchObject({ model: 'm', max_tokens: 100, messages: [{ role: 'user', content: 'U' }] });
    expect(body.system[0]).toMatchObject({ type: 'text', text: 'S', cache_control: { type: 'ephemeral' } });
  });
  it('ném LlmError khi HTTP lỗi, nội dung trống hoặc mạng lỗi', async () => {
    const make = (fetch: FetchLike) => createClaudeClient({ apiKey: 'k', model: 'm', fetch }).complete({ system: 's', user: 'u', maxTokens: 1 });
    await expect(make(async () => ok({}, 500))).rejects.toBeInstanceOf(LlmError);
    await expect(make(async () => ok({ content: [] }))).rejects.toBeInstanceOf(LlmError);
    await expect(make(async () => { throw new Error('net'); })).rejects.toBeInstanceOf(LlmError);
  });
});

describe('createRateLimiter', () => {
  it('chặn khi vượt giới hạn phút rồi mở lại', () => {
    let t = 0;
    const limiter = createRateLimiter([{ windowMs: 60_000, max: 2 }, { windowMs: 3_600_000, max: 3 }], () => t);
    expect(limiter.consume('u').allowed).toBe(true);
    expect(limiter.consume('u').allowed).toBe(true);
    const blocked = limiter.consume('u');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);
    t = 61_000;
    expect(limiter.consume('u').allowed).toBe(true);
    t = 122_000;
    expect(limiter.consume('u').allowed).toBe(false); // đã đủ 3 lượt trong 1 giờ
    expect(limiter.consume('other').allowed).toBe(true);
  });
});

describe('createCache', () => {
  it('hết hạn và giới hạn số phần tử', () => {
    let t = 0;
    const cache = createCache<number>({ maxEntries: 2, ttlMs: 100, now: () => t });
    cache.set('a', 1); cache.set('b', 2); cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    t = 101;
    expect(cache.get('c')).toBeUndefined();
  });
});
