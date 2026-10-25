'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createDeck, deleteDeck, saveDeck, type DeckInput } from '@/lib/actions';
import { ConfirmButton, SaveMessage, useSave } from './useSave';

const EMPTY: DeckInput = {
  id: '', sortOrder: 0, active: true,
  texts: { vi: { name: '', tag: '', description: '', voice: '' }, en: { name: '', tag: '', description: '', voice: '' } }
};
const FIELDS = ['name', 'tag', 'description', 'voice'] as const;

function DeckForm({ initial, isNew }: { initial: DeckInput; isNew: boolean }) {
  const t = useTranslations('admin.decks');
  const router = useRouter();
  const { pending, result, run } = useSave();
  const [deck, setDeck] = useState(initial);
  const setText = (locale: 'vi' | 'en', field: (typeof FIELDS)[number], value: string) =>
    setDeck((d) => ({ ...d, texts: { ...d.texts, [locale]: { ...d.texts[locale]!, [field]: value } } }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(() => (isNew ? createDeck(deck) : saveDeck(deck)), () => { if (isNew) setDeck(EMPTY); router.refresh(); });
  };

  const key = initial.id || 'new';
  return (
    <form onSubmit={submit} className="glass admin-panel">
      <h2 className="h3">{isNew ? t('newTitle') : deck.texts.vi?.name || deck.id}</h2>
      <div className="admin-two">
        <div className="field"><label htmlFor={`${key}-id`}>{t('id')}</label>
          <input className="input" id={`${key}-id`} value={deck.id} readOnly={!isNew} required pattern="[a-z0-9][a-z0-9\-]*" maxLength={40} onChange={(e) => setDeck({ ...deck, id: e.target.value })} /></div>
        <div className="field"><label htmlFor={`${key}-sort`}>{t('sort')}</label>
          <input className="input" id={`${key}-sort`} type="number" value={deck.sortOrder} onChange={(e) => setDeck({ ...deck, sortOrder: Number(e.target.value) })} /></div>
      </div>
      <label className="admin-check"><input type="checkbox" checked={deck.active} onChange={(e) => setDeck({ ...deck, active: e.target.checked })} /> {t('active')}</label>

      {(['vi', 'en'] as const).map((locale) => (
        <fieldset key={locale} className="jte-group">
          <legend>{locale === 'vi' ? 'Tiếng Việt' : 'English'}</legend>
          {FIELDS.map((field) => (
            <div className="field" key={field}><label htmlFor={`${key}-${locale}-${field}`}>{t(field)}</label>
              {field === 'description'
                ? <textarea className="input" id={`${key}-${locale}-${field}`} rows={3} value={deck.texts[locale]![field]} onChange={(e) => setText(locale, field, e.target.value)} />
                : <input className="input" id={`${key}-${locale}-${field}`} value={deck.texts[locale]![field]} required={field === 'name' && locale === 'vi'} onChange={(e) => setText(locale, field, e.target.value)} />}
            </div>
          ))}
        </fieldset>
      ))}

      <div className="admin-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>{isNew ? t('create') : t('save')}</button>
        {!isNew && deck.id !== 'rws'
          ? <ConfirmButton label={t('delete')} message={t('deleteConfirm', { id: deck.id })} disabled={pending} onConfirm={() => run(() => deleteDeck(deck.id), () => router.refresh())} />
          : null}
      </div>
      <SaveMessage result={result} />
    </form>
  );
}

export function DecksEditor({ decks }: { decks: DeckInput[] }) {
  const t = useTranslations('admin.decks');
  return (
    <div className="admin-stack">
      <h1 className="h2">{t('title')}</h1>
      <p className="muted">{t('lead')}</p>
      {decks.map((d) => <DeckForm key={d.id} initial={d} isNew={false} />)}
      <DeckForm key="new" initial={EMPTY} isNew />
    </div>
  );
}
