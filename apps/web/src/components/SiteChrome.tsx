'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * Khung của trang web công khai (header, nền sao, footer, linh vật). Khu quản trị có khung riêng nên bỏ qua toàn bộ
 * phần này. Quyết định ở trình duyệt để các trang công khai vẫn được dựng sẵn tĩnh, không phải đọc header của request.
 */
export function SiteChrome({ top, bottom, children }: { top: ReactNode; bottom: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return <>{children}</>;
  return (
    <>
      {top}
      <main id="main" tabIndex={-1}>{children}</main>
      {bottom}
    </>
  );
}
