'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { VERDICT_ICON, verdictOf, type Verdict } from '@/lib/yesno';

type CardTextLite = {
  name?: string;
  keywords_upright?: string[];
  keywords_reversed?: string[];
  advice?: { upright: string; reversed: string };
  questions?: { upright: string[]; reversed: string[] };
};
type Props = { question: string; children: ReactNode; cards: { id: string; reversed: boolean }[]; verdict: Verdict; texts: Record<string, CardTextLite | undefined> };

/** Bản xem nhanh kết quả Có / Không của một lượt đã rút, dùng trong Lịch sử. */
export function YesNoSummary({ question, children, cards, verdict, texts }: Props) {
  const t = useTranslations('yesno');
  const tHistory = useTranslations('history');
  const lead = cards.find((c) => verdictOf(c.id, c.reversed) === verdict) ?? cards[0];
  if (!lead) return null;
  const side = (reversed: boolean): 'upright' | 'reversed' => (reversed ? 'reversed' : 'upright');
  const advice = texts[lead.id]?.advice?.[side(lead.reversed)];
  const selfQuestion = texts[lead.id]?.questions?.[side(lead.reversed)]?.[0];
  const keywords = (c: { id: string; reversed: boolean }): string => ((c.reversed ? texts[c.id]?.keywords_reversed : texts[c.id]?.keywords_upright) ?? []).slice(0, 3).join(', ');

  return (
    <div className="h-yn">
      <section className="h-yn-panel" data-v={verdict}>
      {question ? <p className="h-yq" title={question}><span className="h-yq-label">{tHistory('yesnoQuestion')}</span><span className="h-yq-text">{question}</span></p> : null}
      <div className="h-yn-top">
      <div className="h-cards">{children}</div>
      <div className="yn-verdict yn-mini" data-v={verdict}>
        <div className="yn-headline">
          <span className="yn-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: VERDICT_ICON[verdict] }} /></span>
          <p className="yn-word">{t(`verdict.${verdict}.word`)}</p>
        </div>
        <p className="yn-line">{t(`verdict.${verdict}.line`)}</p>
      </div>
      </div>
      <div className="yn-bars">
        {cards.map((c) => (
          <p key={c.id} className="yn-bar" data-v={verdictOf(c.id, c.reversed)}>
            {t('reason', { name: texts[c.id]?.name ?? c.id, orient: c.reversed ? t('reversed') : t('upright'), keywords: keywords(c) })}
          </p>
        ))}
      </div>
      {advice || selfQuestion ? (
        <details className="h-yn-more">
          <summary>{tHistory('yesnoMore')}</summary>
          {advice ? <p className="advice-box">{advice}</p> : null}
          {selfQuestion ? <p className="yn-bar" data-v="self">{selfQuestion}</p> : null}
        </details>
      ) : null}
      </section>
    </div>
  );
}
