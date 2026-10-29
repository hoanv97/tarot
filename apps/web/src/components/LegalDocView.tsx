import { Link } from '@/i18n/navigation';
import { LEGAL_UPDATED, type LegalDoc } from '@miu/web-shared';

type Props = {
  doc: LegalDoc;
  updatedLabel: string;
  otherHref: '/privacy' | '/terms';
  otherLabel: string;
};

export function LegalDocView({ doc, updatedLabel, otherHref, otherLabel }: Props) {
  return (
    <div className="wrap page page-tight">
      <div className="page-head center">
        <h1 className="h2">{doc.title}</h1>
        <p className="muted">{updatedLabel}: {LEGAL_UPDATED}</p>
      </div>
      <article className="glass doc-read">
        <div className="doc-bars">
          <p className="doc-bar doc-intro">{doc.intro}</p>
        </div>
        {doc.sections.map((s, si) => (
          <section key={s.heading} className="doc-sec" data-hue={si % 4}>
            <h2 className="doc-h">{s.heading.replace(/^\d+[.)]\s*/, '')}</h2>
            <div className="doc-bars">
              {s.paragraphs?.map((p) => <p key={p} className="doc-bar">{p}</p>)}
              {s.items?.map((i) => <p key={i} className="doc-bar">{i}</p>)}
            </div>
          </section>
        ))}
        <div className="doc-links"><Link href={otherHref}>{otherLabel}</Link></div>
      </article>
    </div>
  );
}
