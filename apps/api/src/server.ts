import { createApp } from './app';
import { createSupabaseVerifier, type FetchLike } from './auth';
import { loadConfig } from './config';
import { createHandler } from './handler';
import { createClaudeClient } from './llm';

// Nạp .env (ở thư mục gốc monorepo hoặc thư mục api) nếu có; biến đã đặt sẵn trong môi trường được ưu tiên.
for (const file of ['../../.env', '.env']) {
  try { process.loadEnvFile(file); } catch { /* không có file thì bỏ qua */ }
}

const config = loadConfig(process.env);
const httpFetch = fetch as unknown as FetchLike;

const handler = createHandler({
  verify: createSupabaseVerifier({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey, fetch: httpFetch }),
  llm: createClaudeClient({ apiKey: config.anthropicApiKey, model: config.anthropicModel, fetch: httpFetch, ...(config.anthropicBaseUrl ? { baseUrl: config.anthropicBaseUrl } : {}) }),
  perMinuteLimit: config.perMinuteLimit,
  perDayLimit: config.perDayLimit,
  // Chỉ ghi loại sự kiện, không ghi câu hỏi hay nội dung người dùng.
  onEvent: (event) => console.warn(`[miu-api] ${event.type}${event.detail ? ` (${event.detail})` : ''}`)
});

const server = createApp(handler, config).listen(config.port, () => console.log(`[miu-api] đang chạy ở cổng ${config.port}`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
