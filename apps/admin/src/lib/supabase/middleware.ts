import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

/** Làm mới phiên đăng nhập Supabase và ghi cookie mới lên response (kết hợp với middleware của next-intl). */
export const refreshSession = async (request: NextRequest, response: NextResponse): Promise<NextResponse> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    }
  });
  // getClaims() làm mới token khi hết hạn và xác minh JWT tại chỗ, không tốn thêm một lượt gọi mạng cho mỗi request.
  await supabase.auth.getClaims();
  return response;
};
