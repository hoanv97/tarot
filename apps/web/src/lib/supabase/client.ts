import { createBrowserClient } from '@supabase/ssr';

/** Trả về null khi chưa cấu hình Supabase (để trang vẫn chạy được lúc phát triển). */
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
};
