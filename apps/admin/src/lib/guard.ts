import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type AdminState =
  | { status: 'unconfigured' }
  | { status: 'anonymous' }
  | { status: 'forbidden'; email: string }
  | { status: 'admin'; supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>; userId: string; email: string };

/**
 * Trạng thái đăng nhập của người đang truy cập: chưa cấu hình, chưa đăng nhập, đăng nhập nhưng không phải quản trị
 * viên, hoặc là quản trị viên. Đây là kiểm tra để báo lỗi sớm; quyền ghi thực sự do RLS (public.is_admin()) quyết định.
 *
 * Nhanh vì: (1) `cache` giúp layout và trang trong cùng một request chỉ kiểm tra một lần;
 * (2) getClaims() xác minh chữ ký JWT tại chỗ bằng khóa công khai của project (không gọi mạng khi project dùng
 * khóa ký bất đối xứng; nếu không thì nó tự hỏi Supabase Auth như getUser()). Vai trò vẫn đọc mới từ bảng profiles
 * ở mỗi request, nên bỏ quyền admin có hiệu lực ngay.
 */
/** Client Supabase gắn phiên của người truy cập (dùng chung trong một request). null khi chưa cấu hình Supabase. */
export const getDb = cache(async () => createClient());

export const getAdminState = cache(async (): Promise<AdminState> => {
  const supabase = await getDb();
  if (!supabase) return { status: 'unconfigured' };
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { status: 'anonymous' };
  const email = typeof data.claims.email === 'string' ? data.claims.email : '';
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return profile?.role === 'admin' ? { status: 'admin', supabase, userId, email } : { status: 'forbidden', email };
});

/** Client Supabase gắn phiên của quản trị viên, hoặc null nếu người truy cập không phải quản trị viên. */
export const getAdmin = async () => {
  const state = await getAdminState();
  return state.status === 'admin' ? state : null;
};
