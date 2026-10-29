'use client';

import type { Locale } from '@miu/tarot-core';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { resetAnalysisSection, saveAnalysisSection } from '@/lib/actions';
import { ANALYSIS_SECTIONS, type AnalysisSection } from '@/lib/constants';
import { ConfirmButton, SaveMessage, useSave } from './useSave';

export type AnalysisSnapshot = Record<Locale, Partial<Record<AnalysisSection, { value: unknown; edited: boolean }>>>;

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * Sửa từng phần của dữ liệu Phân tích chuyên sâu dưới dạng JSON. Lưu là thay nguyên cả phần đó;
 * máy chủ chạy validateAnalysis trên bản sẽ có hiệu lực và từ chối nếu còn lỗi.
 */
export function AnalysisEditor({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const t = useTranslations('admin.analysis');
  const router = useRouter();
  const { pending, result, run, clear } = useSave();
  const [locale, setLocale] = useState<Locale>('vi');
  const [section, setSection] = useState<AnalysisSection>('labels');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [jsonError, setJsonError] = useState<string | null>(null);

  const sections = ANALYSIS_SECTIONS.filter((s) => snapshot[locale][s] !== undefined);
  const current = snapshot[locale][section];
  const draftKey = `${locale}:${section}`;
  const text = drafts[draftKey] ?? pretty(current?.value ?? null);

  const choose = (nextLocale: Locale, nextSection: AnalysisSection) => {
    setLocale(nextLocale);
    setSection(snapshot[nextLocale][nextSection] ? nextSection : 'labels');
    setJsonError(null);
    clear();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let data: unknown;
    try { data = JSON.parse(text); } catch (error) { return setJsonError(error instanceof Error ? error.message : 'JSON'); }
    setJsonError(null);
    run(() => saveAnalysisSection(locale, section, data), () => { setDrafts((d) => { const { [draftKey]: _saved, ...rest } = d; return rest; }); router.refresh(); });
  };

  return (
    <form onSubmit={submit} className="glass admin-panel">
      <h1 className="h2">{t('title')}</h1>
      <p className="muted">{t('lead')}</p>

      <div className="seg" role="tablist" aria-label={t('language')}>
        {(['vi', 'en'] as const).map((l) => (
          <button key={l} type="button" role="tab" aria-selected={locale === l} onClick={() => choose(l, section)}>{l === 'vi' ? 'Tiếng Việt' : 'English'}</button>
        ))}
      </div>
      {locale === 'en' ? <p className="muted small">{t('fallbackHint')}</p> : null}

      <div className="field"><label htmlFor="section">{t('section')}</label>
        <select className="input" id="section" value={section} onChange={(e) => choose(locale, e.target.value as AnalysisSection)}>
          {sections.map((s) => <option key={s} value={s}>{t(`sections.${s}`)}{snapshot[locale][s]?.edited ? ` · ${t('editedMark')}` : ''}</option>)}
        </select></div>
      <p className="muted small">{t(`hints.${section}`)}</p>

      <div className="field"><label htmlFor="json">{t('json')}</label>
        <textarea className="input admin-json" id="json" rows={22} spellCheck={false} value={text} onChange={(e) => { setDrafts({ ...drafts, [draftKey]: e.target.value }); setJsonError(null); }} /></div>
      {jsonError ? <p className="err" role="alert">{t('jsonInvalid', { reason: jsonError })}</p> : null}

      <div className="admin-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? t('validating') : t('save')}</button>
        {current?.edited
          ? <ConfirmButton label={t('reset')} message={t('resetConfirm')} disabled={pending} onConfirm={() => run(() => resetAnalysisSection(locale, section), () => { setDrafts((d) => { const { [draftKey]: _x, ...rest } = d; return rest; }); router.refresh(); })} />
          : null}
      </div>
      <SaveMessage result={result} />
    </form>
  );
}
