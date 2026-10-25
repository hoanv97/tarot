import { displayName } from '@miu/web-shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { SignOutButton } from '@/components/SignOutButton';
import { redirect } from '@/i18n/navigation';
import { getAdminState } from '@/lib/guard';

// Luôn kiểm tra quyền ở máy chủ; RLS vẫn là lớp bảo vệ cuối cùng.
export const dynamic = 'force-dynamic';

/** Khung của trang quản trị (menu dọc). Chưa đăng nhập thì chuyển tới /login; không phải quản trị viên thì báo không có quyền. */
export default async function PanelLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');
  const state = await getAdminState();

  if (state.status === 'anonymous') redirect({ href: '/login', locale });
  if (state.status !== 'admin') {
    return (
      <main id="main" className="adm-denied">
        <p className="err">{state.status === 'unconfigured' ? t('notConfigured') : t('forbidden')}</p>
        {state.status === 'forbidden' ? <SignOutButton /> : null}
      </main>
    );
  }
  return <AdminShell name={displayName(state.email) || t('shell.title')}>{children}</AdminShell>;
}
