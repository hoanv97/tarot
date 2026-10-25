import { createClient } from '@/lib/supabase/server';

/**
 * Trả về client Supabase đã gắn phiên của người đang đăng nhập, chỉ khi người đó là quản trị viên.
 * Đây là kiểm tra để báo lỗi sớm; quyền ghi thực sự do RLS (public.is_admin()) quyết định.
 */
export const getAdmin = async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin' ? { supabase, userId: data.user.id } : null;
};
