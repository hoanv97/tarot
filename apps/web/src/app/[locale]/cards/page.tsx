import { redirect } from 'next/navigation';

/** Trang cũ: chuyển sang Bộ sưu tập (bộ Rider–Waite–Smith). */
export default async function CardsRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/collection/rws`);
}
