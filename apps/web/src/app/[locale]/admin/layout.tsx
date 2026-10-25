import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Link } from '@/i18n/navigation';
import { getAdmin } from '@/lib/admin/guard';
import { displayName } from '@/lib/username';

// Luôn kiểm tra quyền ở máy chủ; RLS vẫn là lớp bảo vệ cuối cùng.
export const dynamic = 'force-dynamic';

/** Khu quản trị có khung riêng (menu dọc), không dùng header/footer của trang công khai. */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');
  const denied = (message: string) => (
    <main id="main" className="adm-denied">
      <p className="err">{message}</p>
      <Link className="btn btn-secondary" href="/">{t('shell.backToSite')}</Link>
    </main>
  );

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return denied(t('notConfigured'));
  const admin = await getAdmin();
  if (!admin) return denied(t('forbidden'));

  return <AdminShell name={displayName(admin.email) || t('shell.title')}>{children}</AdminShell>;
}
