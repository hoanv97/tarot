import { setRequestLocale } from 'next-intl/server';
import { SpreadsEditor, type SpreadFormData } from '@/components/SpreadsEditor';
import { getAdmin, getDb } from '@/lib/guard';

export const dynamic = 'force-dynamic';

type Translation = { locale: 'vi' | 'en'; label: string; positions: Record<string, { label: string; prompt: string }> };

export default async function AdminSpreadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Dữ liệu nội dung đọc công khai được, nên truy vấn chạy ngay, song song với kiểm tra vai trò admin (tiết kiệm một lượt chờ Supabase).
  const supabase = await getDb();
  const adminCheck = getAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from('spreads').select('id, positions, active, spread_translations(locale, label, positions)').order('sort_order');
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
  const admin = await adminCheck;
  if (!admin) return null;

  return <SpreadsEditor spreads={spreads} />;
}
