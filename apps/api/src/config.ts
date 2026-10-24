export type Config = {
  port: number;
  anthropicApiKey: string;
  anthropicModel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  corsOrigins: string[];
  /** Số lượt đọc AI tối đa của một người dùng trong 1 phút / 1 ngày */
  perMinuteLimit: number;
  perDayLimit: number;
};

export class ConfigError extends Error {}

export const loadConfig = (env: Record<string, string | undefined>): Config => {
  const required = (key: string): string => {
    const value = env[key]?.trim();
    if (!value) throw new ConfigError(`Thiếu biến môi trường ${key}`);
    return value;
  };
  const int = (key: string, fallback: number): number => {
    const raw = env[key];
    if (raw === undefined || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) throw new ConfigError(`${key} phải là số nguyên dương`);
    return n;
  };
  return {
    port: int('PORT', 4000),
    anthropicApiKey: required('ANTHROPIC_API_KEY'),
    anthropicModel: env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-5-5',
    supabaseUrl: required('SUPABASE_URL').replace(/\/+$/, ''),
    supabaseAnonKey: required('SUPABASE_ANON_KEY'),
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
    perMinuteLimit: int('RATE_LIMIT_PER_MINUTE', 5),
    perDayLimit: int('RATE_LIMIT_PER_DAY', 40)
  };
};
