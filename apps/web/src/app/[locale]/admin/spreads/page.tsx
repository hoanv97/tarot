import { setRequestLocale } from 'next-intl/server';
import { SpreadsEditor, type SpreadFormData } from '@/components/admin/SpreadsEditor';
import { getAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

type Translation = { locale: 'vi' | 'en'; label: string; positions: Record<string, { label: string; prompt: string }> };

export default async function AdminSpreadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin) return null;
  const { data } = await admin.supabase.from('spreads').select('id, positions, active, spread_translations(locale, label, positions)').order('sort_order');
  const spreads: SpreadFormData[] = (data ?? []).map((s) => {
    const rows = (s.spread_translations ?? []) as Translation[];
    const positions = s.positions as string[];
    const text = (l: 'vi' | 'en') => {
      const r = rows.find((x) => x.locale === l);
      return {
        label: r?.label ?? '',
        positions: Object.fromEntries(positions.map((p) => [p, { label: r?.positions?.[p]?.label ?? '', prompt: r?.positions?.[p]?.prompt ?? '' }]))
      };
    };
    return { id: s.id as string, active: s.active as boolean, positions, texts: { vi: text('vi'), en: text('en') } };
  });
  return <SpreadsEditor spreads={spreads} />;
}
