import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RuleEditor, type EditableRule } from '@/components/RuleEditor';
import { createClient } from '@/lib/supabase/server';

// Luôn kiểm tra quyền ở máy chủ; RLS vẫn là lớp bảo vệ cuối cùng.
export const dynamic = 'force-dynamic';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('admin');
  const supabase = await createClient();
  const shell = (node: React.ReactNode) => <div className="wrap page page-tight">{node}</div>;
  if (!supabase) return shell(<p className="err">{t('notConfigured')}</p>);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null };
  if (profile?.role !== 'admin') return shell(<p className="err">{t('forbidden')}</p>);

  const [{ data: rules }, { data: texts }] = await Promise.all([
    supabase.from('rules').select('id, priority, enabled, when_json').order('sort_order'),
    supabase.from('rule_translations').select('rule_id, text').eq('locale', 'vi')
  ]);
  const textById = new Map((texts ?? []).map((row) => [row.rule_id as string, row.text as string]));
  const editable: EditableRule[] = (rules ?? []).map((r) => ({
    id: r.id as string, priority: r.priority as number, enabled: r.enabled as boolean, when_json: r.when_json, text: textById.get(r.id as string) ?? ''
  }));

  return shell(<RuleEditor rules={editable} />);
}
