import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Trả về client Supabase đã gắn phiên của người đang đăng nhập, chỉ khi người đó là quản trị viên.
 * Đây là kiểm tra để báo lỗi sớm; quyền ghi thực sự do RLS (public.is_admin()) quyết định.
 *
 * Nhanh vì: (1) `cache` giúp layout và trang trong cùng một request chỉ kiểm tra một lần;
 * (2) getClaims() xác minh chữ ký JWT tại chỗ bằng khóa công khai của project (không gọi mạng khi project dùng
 * khóa ký bất đối xứng; nếu không thì nó tự hỏi Supabase Auth như getUser()). Vai trò vẫn đọc mới từ bảng profiles
 * ở mỗi request, nên bỏ quyền admin có hiệu lực ngay.
 */
export const getAdmin = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return profile?.role === 'admin' ? { supabase, userId } : null;
});
