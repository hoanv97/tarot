import { getLocaleBundle, type Locale } from '@miu/tarot-core';

/** Tuyên bố "tham khảo và giải trí". Hiện ở mọi kết quả đọc bài và ở chân trang. */
export function Disclaimer({ locale, showMindNote = false }: { locale: Locale; showMindNote?: boolean }) {
  const { disclaimer } = getLocaleBundle(locale).ui;
  return (
    <aside className="note-box" aria-label="disclaimer">
      <p>{disclaimer.full}</p>
      {showMindNote ? <p>{disclaimer.mind_note}</p> : null}
    </aside>
  );
}
