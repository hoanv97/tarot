'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';

/** Lá chưa được chỉnh riêng trong bộ này: chọn để bắt đầu nhập nội dung riêng cho bộ. */
export function AddCardPicker({ deck, options }: { deck: string; options: { id: string; name: string }[] }) {
  const t = useTranslations('admin.cards');
  const router = useRouter();
  const [id, setId] = useState('');
  if (options.length === 0) return <p className="muted small">{t('noneToAdd')}</p>;
  return (
    <div className="admin-toolbar">
      <div className="field"><label htmlFor="add-card">{t('addPick')}</label>
        <select className="input" id="add-card" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select></div>
      <div className="field"><button className="btn btn-secondary" type="button" disabled={!id}
        onClick={() => router.push({ pathname: `/cards/${id}`, query: { deck } })}>{t('addGo')}</button></div>
    </div>
  );
}
