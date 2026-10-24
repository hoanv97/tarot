/** Kiểu request/response tối giản, độc lập với Express để dễ kiểm thử. */
export type ApiRequest = {
  method: string;
  path: string;
  /** Tên header viết thường */
  headers: Record<string, string | undefined>;
  body: unknown;
};
export type ApiResponse = { status: number; body: unknown; headers?: Record<string, string> };

export const json = (status: number, body: unknown, headers?: Record<string, string>): ApiResponse => ({ status, body, headers });
export const errorBody = (code: string, message: string) => ({ error: { code, message } });
