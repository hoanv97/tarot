'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Mascot } from '@/components/Mascot';
import { useMood } from '@/lib/use-mood';

const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;

/** Miu ở trang chủ: chạm vào để nghe câu thoại tiếp theo. */
export function MeetArt() {
  const t = useTranslations('home');
  const lines = t.raw('lines') as string[];
  const [index, setIndex] = useState(0);
  const { mood, setMood, nonce } = useMood();
  const [pop, setPop] = useState(0);

  const next = () => {
    const i = (index + 1) % lines.length;
    setIndex(i);
    setPop((n) => n + 1);
    setMood(i % 2 ? 'happy' : 'wow');
  };

  return (
    <>
      <div key={pop} className={`bubble${pop ? ' pop' : ''}`} aria-live="polite">{lines[index]}</div>
      <Mascot mood={mood} nonce={nonce} onPress={next} pressLabel={t('touchMiu')} />
    </>
  );
}

export const MeetList = ({ items }: { items: string[] }) => (
  <ul>{items.map((text) => <li key={text}>{CHECK}{text}</li>)}</ul>
);
