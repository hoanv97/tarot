import { setRequestLocale } from 'next-intl/server';
import { UsersManager, type AuditRow } from '@/components/UsersManager';
import { getAdmin, getDb } from '@/lib/guard';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Dữ liệu nội dung đọc công khai được, nên truy vấn chạy ngay, song song với kiểm tra vai trò admin (tiết kiệm một lượt chờ Supabase).
  const supabase = await getDb();
  const adminCheck = getAdmin();
  if (!supabase) return null;

  // Nhật ký đọc trực tiếp qua RLS (chỉ quản trị viên đọc được); danh sách tài khoản lấy từ api vì cần service_role.
  const { data } = await supabase.from('admin_audit_log').select('id, actor_email, action, target_email, created_at').order('created_at', { ascending: false }).limit(20);
  const audit: AuditRow[] = (data ?? []).map((r) => ({
    id: r.id as number, actor: (r.actor_email as string | null) ?? '', action: r.action as string, target: (r.target_email as string | null) ?? '', at: r.created_at as string
  }));
  const admin = await adminCheck;
  if (!admin) return null;

  return <UsersManager me={admin.userId} audit={audit} />;
}
