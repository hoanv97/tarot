import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Đổi mã đăng nhập (liên kết trong email) lấy phiên, rồi quay về trang chủ. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/history';
  // Chỉ cho phép chuyển hướng nội bộ (tránh open redirect).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (code) {
    const supabase = await createClient();
    await supabase?.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${safeNext}`);
}
