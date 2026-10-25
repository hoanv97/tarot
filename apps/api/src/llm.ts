import type { FetchLike } from './auth';

export type LlmRequest = { system: string; user: string; maxTokens: number };
export interface LlmClient {
  complete(request: LlmRequest): Promise<string>;
}
export class LlmError extends Error {}

/** Gọi Claude Messages API trực tiếp bằng fetch (không cần SDK). Phần system được đánh dấu cache. */
export const createClaudeClient = (options: { apiKey: string; model: string; fetch: FetchLike; baseUrl?: string; timeoutMs?: number }): LlmClient => ({
  async complete({ system, user, maxTokens }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);
    try {
      const res = await options.fetch(`${options.baseUrl ?? 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': options.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: options.model,
          max_tokens: maxTokens,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: user }]
        }),
        signal: controller.signal
      });
      if (!res.ok) throw new LlmError(`Claude API trả về ${res.status}`);
      const data = (await res.json()) as { content?: { type?: string; text?: string }[] };
      const text = (data.content ?? []).filter((b) => b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('').trim();
      if (!text) throw new LlmError('Claude API trả về nội dung trống');
      return text;
    } catch (error) {
      if (error instanceof LlmError) throw error;
      throw new LlmError(error instanceof Error ? error.message : 'Không gọi được Claude API');
    } finally {
      clearTimeout(timer);
    }
  }
});
