import { setRequestLocale } from 'next-intl/server';
import { UsersManager, type AuditRow } from '@/components/UsersManager';
import { getAdmin } from '@/lib/guard';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin) return null;

  // Nhật ký đọc trực tiếp qua RLS (chỉ quản trị viên đọc được); danh sách tài khoản lấy từ api vì cần service_role.
  const { data } = await admin.supabase.from('admin_audit_log').select('id, actor_email, action, target_email, created_at').order('created_at', { ascending: false }).limit(20);
  const audit: AuditRow[] = (data ?? []).map((r) => ({
    id: r.id as number, actor: (r.actor_email as string | null) ?? '', action: r.action as string, target: (r.target_email as string | null) ?? '', at: r.created_at as string
  }));
  return <UsersManager me={admin.userId} audit={audit} />;
}
