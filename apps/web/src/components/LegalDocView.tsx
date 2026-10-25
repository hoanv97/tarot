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
      <article className="glass" style={{ padding: 28, display: 'grid', gap: 22 }}>
        <p>{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.heading} style={{ display: 'grid', gap: 8 }}>
            <h2 className="h3">{s.heading}</h2>
            {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
            {s.items && (
              <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 6 }}>
                {s.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            )}
          </section>
        ))}
        <p className="muted"><Link href={otherHref}>{otherLabel}</Link></p>
      </article>
    </div>
  );
}
