import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Config } from './config';
import { errorBody, type ApiRequest, type ApiResponse } from './http';

export const createApp = (handler: (req: ApiRequest) => Promise<ApiResponse>, config: Pick<Config, 'corsOrigins'>) => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST'], allowedHeaders: ['authorization', 'content-type'], maxAge: 600 }));
  // Lớp chặn theo IP (thô); giới hạn theo từng người dùng nằm trong handler.
  app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use(express.json({ limit: '10kb' }));

  app.use(async (req, res) => {
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) headers[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    const out = await handler({ method: req.method, path: req.path, headers, body: req.body });
    for (const [key, value] of Object.entries(out.headers ?? {})) res.setHeader(key, value);
    res.status(out.status).json(out.body);
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed' || type === 'entity.too.large') {
      res.status(type === 'entity.too.large' ? 413 : 400).json(errorBody('invalid_request', 'Nội dung gửi lên không hợp lệ.'));
      return;
    }
    console.error('Lỗi không mong đợi:', err instanceof Error ? err.message : 'unknown');
    res.status(500).json(errorBody('internal_error', 'Đã có lỗi xảy ra. Hãy thử lại sau.'));
  };
  app.use(onError);
  return app;
};
