/** Địa chỉ trang quản trị (ứng dụng riêng apps/admin). Đặt NEXT_PUBLIC_ADMIN_URL khi triển khai. */
export const ADMIN_URL = (process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

export const adminHref = (locale: string): string => `${ADMIN_URL}/${locale}/cards`;
