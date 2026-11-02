import { redirect } from 'next/navigation';

/** Đường dẫn cũ /cards/[id]: chuyển sang trang ý nghĩa trong Bộ sưu tập (bộ Rider–Waite–Smith). */
export default async function CardRedirect({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/collection/rws/${encodeURIComponent(id)}`);
}
