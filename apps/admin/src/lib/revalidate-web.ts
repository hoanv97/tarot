/**
 * Web công khai và trang quản trị là hai ứng dụng riêng nên cache của web không tự làm mới khi admin lưu.
 * Sau mỗi lần lưu, gọi hàm này để báo web làm mới các tag nội dung (xem apps/web/src/app/api/revalidate).
 * Không cấu hình REVALIDATE_SECRET hoặc web không trả lời thì bỏ qua: web vẫn tự làm mới sau vài phút.
 */
export const revalidateWeb = async (...tags: string[]): Promise<void> => {
  const base = process.env.WEB_URL ?? 'http://localhost:3000';
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) { console.warn('[admin] Chưa đặt REVALIDATE_SECRET: web sẽ tự làm mới sau vài phút.'); return; }
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) console.warn(`[admin] Web trả về ${res.status} khi làm mới cache.`);
  } catch (error) {
    console.warn('[admin] Không báo được cho web làm mới cache:', error instanceof Error ? error.message : 'lỗi');
  }
};
