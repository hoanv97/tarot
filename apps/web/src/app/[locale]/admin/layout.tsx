import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { getAdmin } from '@/lib/admin/guard';
import { createClient } from '@/lib/supabase/server';

// Luôn kiểm tra quyền ở máy chủ; RLS vẫn là lớp bảo vệ cuối cùng.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');
  const shell = (node: ReactNode) => <div className="wrap page page-tight">{node}</div>;

  if (!(await createClient())) return shell(<p className="err">{t('notConfigured')}</p>);
  if (!(await getAdmin())) return shell(<p className="err">{t('forbidden')}</p>);

  return (
    <div className="wrap page admin">
      <AdminNav />
      {children}
    </div>
  );
}
