import { setRequestLocale } from 'next-intl/server';
import { RuleEditor, type EditableRule } from '@/components/RuleEditor';
import { getAdmin } from '@/lib/guard';

// Luôn đọc dữ liệu mới; quyền đã kiểm tra ở layout, RLS vẫn là lớp bảo vệ cuối cùng.
export const dynamic = 'force-dynamic';

export default async function AdminRulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin) return null;
  const { supabase } = admin;

  const [{ data: rules }, { data: texts }] = await Promise.all([
    supabase.from('rules').select('id, priority, enabled, when_json').order('sort_order'),
    supabase.from('rule_translations').select('rule_id, text').eq('locale', 'vi')
  ]);
  const textById = new Map((texts ?? []).map((row) => [row.rule_id as string, row.text as string]));
  const editable: EditableRule[] = (rules ?? []).map((r) => ({
    id: r.id as string, priority: r.priority as number, enabled: r.enabled as boolean, when_json: r.when_json, text: textById.get(r.id as string) ?? ''
  }));

  return <RuleEditor rules={editable} />;
}
