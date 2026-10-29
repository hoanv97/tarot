'use client';

import type { Locale } from '@miu/tarot-core';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { resetSiteContent, saveSiteContent } from '@/lib/actions';
import { SITE_CONTENT_KEYS, type SiteContentKey } from '@/lib/constants';
import { JsonTextEditor } from './JsonTextEditor';
import { ConfirmButton, SaveMessage, useSave } from './useSave';

type Initial = Record<Locale, { value: unknown; edited: boolean }>;

const LEGAL_TEMPLATE = { heading: '', paragraphs: [], items: [] };
const isLegal = (key: SiteContentKey) => key === 'privacy' || key === 'terms';

/** Mỗi mục pháp lý luôn có đủ paragraphs/items để thêm dòng; khi lưu thì bỏ các danh sách rỗng và dòng trống. */
const toEditable = (key: SiteContentKey, value: unknown): unknown => {
  if (!isLegal(key) || typeof value !== 'object' || value === null) return value;
  const doc = value as { sections?: { heading: string; paragraphs?: string[]; items?: string[] }[] };
  return { ...doc, sections: (doc.sections ?? []).map((s) => ({ heading: s.heading, paragraphs: s.paragraphs ?? [], items: s.items ?? [] })) };
};

const toSaved = (key: SiteContentKey, value: unknown): unknown => {
  if (!isLegal(key)) return value;
  const doc = value as { sections: { heading: string; paragraphs: string[]; items: string[] }[] };
  const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);
  return {
    ...doc,
    sections: doc.sections.map((s) => ({
      heading: s.heading,
      ...(clean(s.paragraphs).length ? { paragraphs: clean(s.paragraphs) } : {}),
      ...(clean(s.items).length ? { items: clean(s.items) } : {})
    }))
  };
};

export function ContentEditor({ contentKey, initial }: { contentKey: SiteContentKey; initial: Initial }) {
  const t = useTranslations('admin.content');
  const router = useRouter();
  const { pending, result, run, clear } = useSave();
  const [locale, setLocale] = useState<Locale>('vi');
  const [values, setValues] = useState<Record<Locale, unknown>>({ vi: toEditable(contentKey, initial.vi.value), en: toEditable(contentKey, initial.en.value) });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(() => saveSiteContent(contentKey, locale, toSaved(contentKey, values[locale])), () => router.refresh());
  };

  return (
    <form onSubmit={submit} className="glass admin-panel">
      <h1 className="h2">{t('title')}</h1>
      <p className="muted">{t('lead')}</p>

      <nav className="chips" aria-label={t('kinds')}>
        {SITE_CONTENT_KEYS.map((k) => (
          <Link key={k} className="chip" href={{ pathname: '/content', query: { key: k } }} aria-pressed={k === contentKey}>{t(`key.${k}`)}</Link>
        ))}
      </nav>

      <div className="seg" role="tablist" aria-label={t('language')}>
        {(['vi', 'en'] as const).map((l) => (
          <button key={l} type="button" role="tab" aria-selected={locale === l} onClick={() => { setLocale(l); clear(); }}>{l === 'vi' ? 'Tiếng Việt' : 'English'}</button>
        ))}
      </div>
      <p className="muted small">{initial[locale].edited ? t('edited') : t('defaults')}</p>

      <JsonTextEditor key={`${contentKey}-${locale}`} value={values[locale]} templates={{ sections: LEGAL_TEMPLATE }}
        onChange={(next) => setValues((all) => ({ ...all, [locale]: next }))} />

      <div className="admin-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>{t('save')}</button>
        {initial[locale].edited
          ? <ConfirmButton label={t('reset')} message={t('resetConfirm')} disabled={pending} onConfirm={() => run(() => resetSiteContent(contentKey, locale), () => router.refresh())} />
          : null}
      </div>
      <SaveMessage result={result} />
    </form>
  );
}
