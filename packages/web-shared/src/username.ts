/**
 * Supabase Auth đăng nhập bằng email + mật khẩu, không có "tên đăng nhập" riêng. Tên đăng nhập được quy ước thành
 * một email nội bộ `<tên>@<miền>` (không bao giờ gửi thư vì tắt xác nhận email); người dùng chỉ thấy tên.
 * Đổi miền bằng NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN nếu Supabase từ chối miền mặc định.
 */
export const USERNAME_DOMAIN = process.env.NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN ?? 'miutarot.app';

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Tên đăng nhập viết thường, bỏ khoảng trắng hai đầu. */
export const normalizeUsername = (input: string): string => input.trim().toLowerCase();

/** Nhập email thật thì dùng nguyên; nhập tên đăng nhập thì ghép với miền nội bộ. */
export const toLoginEmail = (input: string): string => {
  const value = normalizeUsername(input);
  return value.includes('@') ? value : `${value}@${USERNAME_DOMAIN}`;
};

/** Tên hiển thị: bỏ phần miền nội bộ, email thật giữ nguyên. */
export const displayName = (email: string | null | undefined): string => {
  if (!email) return '';
  const suffix = `@${USERNAME_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
};
