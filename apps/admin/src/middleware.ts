import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { refreshSession } from './lib/supabase/middleware';

const intl = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  return refreshSession(request, intl(request));
}

export const config = {
  // Bỏ qua file tĩnh, _next và các route API/auth
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
