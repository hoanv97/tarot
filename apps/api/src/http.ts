/** Kiểu request/response tối giản, độc lập với Express để dễ kiểm thử. */
export type ApiRequest = {
  method: string;
  path: string;
  /** Tên header viết thường */
  headers: Record<string, string | undefined>;
  body: unknown;
  /** Tham số trên URL (?a=b); chỉ chuỗi, bỏ qua dạng mảng/đối tượng */
  query?: Record<string, string | undefined>;
};
export type ApiResponse = { status: number; body: unknown; headers?: Record<string, string> };

export const json = (status: number, body: unknown, headers?: Record<string, string>): ApiResponse => ({ status, body, headers });
export const errorBody = (code: string, message: string) => ({ error: { code, message } });
