'use client';

import type { CardText, Locale } from '@miu/tarot-core';
import { useTranslations } from 'next-intl';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { resetCard, saveCard } from '@/lib/actions';
import { createClient } from '@/lib/supabase/client';
import { ConfirmButton, SaveMessage, useSave } from './useSave';

const BUCKET = 'card-images';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const LOCALE_LIST: Locale[] = ['vi', 'en'];

type Props = {
  deck: string;
  cardId: string;
  initialImage: string | null;
  initialTexts: Record<Locale, CardText>;
  topics: string[];
  topicNames: Record<Locale, Record<string, string>>;
  customized: boolean;
};

const lines = (list: string[]) => list.join('\n');
const toList = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);

export function CardEditor({ deck, cardId, initialImage, initialTexts, topics, topicNames, customized }: Props) {
  const t = useTranslations('admin.cardEdit');
  const router = useRouter();
  const { pending, result, run } = useSave();
  const [locale, setLocale] = useState<Locale>('vi');
  const [texts, setTexts] = useState(initialTexts);
  const [image, setImage] = useState<string | null>(initialImage);
  const [upload, setUpload] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  const text = texts[locale];
  const patch = (change: Partial<CardText>) => setTexts((all) => ({ ...all, [locale]: { ...all[locale], ...change } }));
  const patchTopic = (topic: string, side: 'upright' | 'reversed', value: string) =>
    patch({ topics: { ...text.topics, [topic]: { ...text.topics[topic as keyof CardText['topics']], [side]: value } } });

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setUpload({ busy: false, error: t('imageBadType') });
    if (file.size > MAX_IMAGE_BYTES) return setUpload({ busy: false, error: t('imageTooBig') });
    const supabase = createClient();
    if (!supabase) return setUpload({ busy: false, error: t('noSupabase') });
    setUpload({ busy: true, error: null });
    const ext = file.type.split('/')[1] ?? 'png';
    const path = `${deck}/${cardId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) return setUpload({ busy: false, error: error.message });
    setImage(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    setUpload({ busy: false, error: null });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Chỉ gửi ngôn ngữ đã sửa, để bản chưa dịch không bị chép cố định từ tiếng Việt.
    const changed = Object.fromEntries(LOCALE_LIST.filter((l) => JSON.stringify(texts[l]) !== JSON.stringify(initialTexts[l])).map((l) => [l, texts[l]]));
    run(() => saveCard({ deck, cardId, imageUrl: image, texts: changed }), () => router.refresh());
  };

  return (
    <form onSubmit={submit}>
      <div className="admin-image">
        {image ? <img className="admin-image-preview" src={image} alt={texts.vi.name} width={120} height={186} /> : <div className="admin-image-preview admin-image-empty muted small">{t('noImage')}</div>}
        <div>
          <div className="field"><label htmlFor="image">{t('upload')}</label>
            <input className="input" id="image" type="file" accept={IMAGE_TYPES.join(',')} onChange={onFile} disabled={upload.busy} /></div>
          <p className="muted small">{t('imageHint')}</p>
          {upload.busy ? <p role="status" className="muted small">{t('uploading')}</p> : null}
          {upload.error ? <p className="err" role="alert">{upload.error}</p> : null}
          {image ? <button type="button" className="btn btn-text" onClick={() => setImage(null)}>{t('removeImage')}</button> : null}
        </div>
      </div>

      <div className="seg" role="tablist" aria-label={t('language')}>
        {LOCALE_LIST.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={locale === l} onClick={() => setLocale(l)}>{l === 'vi' ? 'Tiếng Việt' : 'English'}</button>
        ))}
      </div>
      {locale === 'en' ? <p className="muted small">{t('fallbackHint')}</p> : null}

      <div className="field"><label htmlFor="name">{t('name')}</label>
        <input className="input" id="name" value={text.name} onChange={(e) => patch({ name: e.target.value })} required={locale === 'vi'} maxLength={120} /></div>

      <div className="admin-two">
        <div className="field"><label htmlFor="kwu">{t('keywordsUp')}</label>
          <textarea className="input" id="kwu" rows={5} value={lines(text.keywords_upright)} onChange={(e) => patch({ keywords_upright: toList(e.target.value) })} /></div>
        <div className="field"><label htmlFor="kwr">{t('keywordsRev')}</label>
          <textarea className="input" id="kwr" rows={5} value={lines(text.keywords_reversed)} onChange={(e) => patch({ keywords_reversed: toList(e.target.value) })} /></div>
      </div>
      <p className="muted small">{t('onePerLine')}</p>

      <div className="field"><label htmlFor="mu">{t('meaningUp')}</label>
        <textarea className="input" id="mu" rows={7} value={text.meaning_upright} onChange={(e) => patch({ meaning_upright: e.target.value })} /></div>
      <div className="field"><label htmlFor="mr">{t('meaningRev')}</label>
        <textarea className="input" id="mr" rows={7} value={text.meaning_reversed} onChange={(e) => patch({ meaning_reversed: e.target.value })} /></div>

      <h2 className="h3">{t('topics')}</h2>
      {topics.map((topic) => (
        <fieldset key={topic} className="jte-group">
          <legend>{topicNames[locale][topic] ?? topic}</legend>
          <div className="field"><label htmlFor={`tu-${topic}`}>{t('topicUp')}</label>
            <textarea className="input" id={`tu-${topic}`} rows={4} value={text.topics[topic as keyof CardText['topics']]?.upright ?? ''} onChange={(e) => patchTopic(topic, 'upright', e.target.value)} /></div>
          <div className="field"><label htmlFor={`tr-${topic}`}>{t('topicRev')}</label>
            <textarea className="input" id={`tr-${topic}`} rows={4} value={text.topics[topic as keyof CardText['topics']]?.reversed ?? ''} onChange={(e) => patchTopic(topic, 'reversed', e.target.value)} /></div>
        </fieldset>
      ))}

      <div className="field"><label htmlFor="sym">{t('symbolism')}</label>
        <textarea className="input" id="sym" rows={4} value={text.symbolism} onChange={(e) => patch({ symbolism: e.target.value })} /></div>
      <div className="field"><label htmlFor="miu">{t('miu')}</label>
        <textarea className="input" id="miu" rows={3} value={text.miu} onChange={(e) => patch({ miu: e.target.value })} /></div>

      <div className="admin-actions">
        <button className="btn btn-primary" type="submit" disabled={pending || upload.busy}>{pending ? t('saving') : t('save')}</button>
        {customized ? (
          <ConfirmButton label={t('reset')} message={t('resetConfirm')} disabled={pending}
            onConfirm={() => run(() => resetCard(deck, cardId), () => router.push({ pathname: '/cards', query: { deck } }))} />
        ) : null}
      </div>
      <SaveMessage result={result} />
    </form>
  );
}
