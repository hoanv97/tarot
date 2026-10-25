'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { saveSpread, type SpreadInput } from '@/lib/admin/actions';
import { SaveMessage, useSave } from './useSave';

export type SpreadFormData = SpreadInput & { positions: string[] };

function SpreadForm({ initial }: { initial: SpreadFormData }) {
  const t = useTranslations('admin.spreads');
  const router = useRouter();
  const { pending, result, run } = useSave();
  const [spread, setSpread] = useState(initial);

  const patch = (locale: 'vi' | 'en', change: Partial<NonNullable<SpreadInput['texts']['vi']>>) =>
    setSpread((s) => ({ ...s, texts: { ...s.texts, [locale]: { ...s.texts[locale]!, ...change } } }));
  const patchPosition = (locale: 'vi' | 'en', position: string, field: 'label' | 'prompt', value: string) => {
    const current = spread.texts[locale]!;
    patch(locale, { positions: { ...current.positions, [position]: { ...current.positions[position]!, [field]: value } } });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(() => saveSpread({ id: spread.id, active: spread.active, texts: spread.texts }), () => router.refresh());
  };

  return (
    <form onSubmit={submit} className="glass admin-panel">
      <h2 className="h3">{spread.texts.vi?.label || spread.id} <code className="muted small">{spread.id}</code></h2>
      <p className="muted small">{t('cardsCount', { n: spread.positions.length })}</p>
      <label className="admin-check"><input type="checkbox" checked={spread.active} onChange={(e) => setSpread({ ...spread, active: e.target.checked })} /> {t('active')}</label>
      {(['vi', 'en'] as const).map((locale) => (
        <fieldset key={locale} className="jte-group">
          <legend>{locale === 'vi' ? 'Tiếng Việt' : 'English'}</legend>
          <div className="field"><label htmlFor={`${spread.id}-${locale}-label`}>{t('label')}</label>
            <input className="input" id={`${spread.id}-${locale}-label`} value={spread.texts[locale]!.label} required={locale === 'vi'} onChange={(e) => patch(locale, { label: e.target.value })} /></div>
          {spread.positions.map((p) => (
            <div className="admin-two" key={p}>
              <div className="field"><label htmlFor={`${spread.id}-${locale}-${p}-l`}>{t('position', { id: p })}</label>
                <input className="input" id={`${spread.id}-${locale}-${p}-l`} value={spread.texts[locale]!.positions[p]!.label} onChange={(e) => patchPosition(locale, p, 'label', e.target.value)} /></div>
              <div className="field"><label htmlFor={`${spread.id}-${locale}-${p}-p`}>{t('prompt')}</label>
                <input className="input" id={`${spread.id}-${locale}-${p}-p`} value={spread.texts[locale]!.positions[p]!.prompt} onChange={(e) => patchPosition(locale, p, 'prompt', e.target.value)} /></div>
            </div>
          ))}
        </fieldset>
      ))}
      <div className="admin-actions"><button className="btn btn-primary" type="submit" disabled={pending}>{t('save')}</button></div>
      <SaveMessage result={result} />
    </form>
  );
}

export function SpreadsEditor({ spreads }: { spreads: SpreadFormData[] }) {
  const t = useTranslations('admin.spreads');
  return (
    <div className="admin-stack">
      <h1 className="h2">{t('title')}</h1>
      <p className="muted">{t('lead')}</p>
      {spreads.map((s) => <SpreadForm key={s.id} initial={s} />)}
    </div>
  );
}
