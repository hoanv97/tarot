import { useTranslations } from 'next-intl';

/** Màn chờ khi chuyển trang. CSS chỉ cho hiện sau 1 giây, nên trang nhanh sẽ không thấy gì nhấp nháy. */
export default function Loading() {
  const t = useTranslations('nav');
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="pl-cards" aria-hidden="true"><span /><span /><span /></div>
      <p className="pl-text">{t('loading')}</p>
    </div>
  );
}
