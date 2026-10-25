import { getTranslations } from 'next-intl/server';

/** Hiện ngay khi chuyển giữa các mục admin, trong lúc máy chủ kiểm tra quyền và đọc dữ liệu. */
export default async function AdminLoading() {
  const t = await getTranslations('admin');
  return <p className="muted" role="status" aria-live="polite">{t('loading')}</p>;
}
