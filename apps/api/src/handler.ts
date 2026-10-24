import { bearerToken, type VerifyToken } from './auth';
import { errorBody, json, type ApiRequest, type ApiResponse } from './http';
import { createInterpreter, parseInterpretBody, type InterpretDeps } from './interpret';
import { createRateLimiter } from './rate-limit';

export type HandlerDeps = InterpretDeps & {
  verify: VerifyToken;
  perMinuteLimit: number;
  perDayLimit: number;
  now?: () => number;
};

/**
 * Toàn bộ logic các route, tách khỏi Express để kiểm thử trực tiếp.
 *   GET  /health
 *   POST /v1/interpret   (cần đăng nhập)  body: { spread, topic, locale?, question?, cards: [{id, reversed}] }
 */
export const createHandler = (deps: HandlerDeps) => {
  const interpreter = createInterpreter(deps);
  const limiter = createRateLimiter([
    { windowMs: 60_000, max: deps.perMinuteLimit },
    { windowMs: 24 * 60 * 60_000, max: deps.perDayLimit }
  ], deps.now);

  return async (req: ApiRequest): Promise<ApiResponse> => {
    if (req.method === 'GET' && req.path === '/health') return json(200, { ok: true });

    if (req.method === 'POST' && req.path === '/v1/interpret') {
      const token = bearerToken(req.headers.authorization);
      const user = token ? await deps.verify(token) : null;
      if (!user) return json(401, errorBody('unauthorized', 'Bạn cần đăng nhập để dùng tính năng này.'));

      const parsed = parseInterpretBody(req.body);
      if (!parsed.ok) return json(400, errorBody('invalid_request', parsed.message));

      const cached = interpreter.peek(parsed.value);
      if (cached) return json(200, cached);
      // Lời nhắn hỗ trợ khi có dấu hiệu khủng hoảng không tốn lượt gọi AI nên không bị giới hạn.
      if (!interpreter.isCrisis(parsed.value)) {
        const decision = limiter.consume(user.id);
        if (!decision.allowed) {
          return json(429, errorBody('rate_limited', 'Bạn đã dùng nhiều lượt trong thời gian ngắn. Hãy thử lại sau ít phút.'), { 'retry-after': String(decision.retryAfterSec) });
        }
      }
      return json(200, await interpreter.run(parsed.value));
    }

    return json(404, errorBody('not_found', 'Không tìm thấy.'));
  };
};
