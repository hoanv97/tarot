import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminLogin } from '@/components/AdminLogin';
import { redirect } from '@/i18n/navigation';
import { getAdminState } from '@/lib/guard';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin.login');
  // Đã là quản trị viên thì vào thẳng trang quản trị.
  if ((await getAdminState()).status === 'admin') redirect({ href: '/cards', locale });
  return (
    <main id="main" className="adm-login">
      <div className="glass adm-login-card">
        <h1 className="h2">{t('title')}</h1>
        <p className="muted">{t('lead')}</p>
        <AdminLogin />
      </div>
    </main>
  );
}
