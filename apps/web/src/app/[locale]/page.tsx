import { DEFAULT_LOCALE, isLocale } from '@miu/tarot-core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CardBack, CardFace } from '@/components/CardArt';
import { MeetArt, MeetList } from '@/components/HomeMeet';
import { Mascot } from '@/components/Mascot';
import { Reveal, RevealLink } from '@/components/Reveal';
import { Link } from '@/i18n/navigation';

const CHEV = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;

const DECK_SHOWCASE = [
  { id: 'rws', face: 'sun', delay: 0 },
  { id: 'moon', face: 'moon', delay: 90 },
  { id: 'lotus', face: 'empress', delay: 180 }
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = await getTranslations('home');
  const d = await getTranslations('decks');

  return (
    <>
      <div className="hero wrap">
        <Reveal as="h1" className="display" delay={60}>{t('titleA')}<span className="grad-text">{t('titleB')}</span></Reveal>
        <Reveal as="p" className="lead" delay={120}>{t('lead')}</Reveal>
        <Reveal className="cta-row" delay={180}>
          <Link className="btn btn-primary btn-lg" href="/draw">{t('cta')}</Link>
          <Link className="link-chev" href="/cards">{t('browse')}{CHEV}</Link>
        </Reveal>
        <Reveal className="hero-stage" delay={240}>
          <div className="halo" />
          <CardFace className="fc fc-1" id="star" deck="rws" locale={locale} />
          <CardBack className="fc fc-2" deck="moon" />
          <CardFace className="fc fc-3" id="moon" deck="lotus" locale={locale} />
          <Mascot className="hero-mascot" />
        </Reveal>
      </div>

      <div className="section wrap" id="decks">
        <Reveal className="sec-head center">
          <h2 className="h2">{t('decksTitle')}</h2>
          <p className="lead">{t('decksLead')}</p>
        </Reveal>
        <div className="decks">
          {DECK_SHOWCASE.map(({ id, face, delay }) => (
            <RevealLink key={id} className="deck-card glass" delay={delay} href={{ pathname: '/draw', query: { deck: id } }}>
              <div className="deck-art" aria-hidden="true">
                <CardBack className="a back" deck={id} />
                <CardFace className="a front" id={face} deck={id} locale={locale} />
              </div>
              <span className="tag">{d(`${id}.tag`)}</span>
              <h3 className="h3">{d(`${id}.name`)}</h3>
              <p>{d(`${id}.desc`)}</p>
              <span className="link-chev">{t('useDeck')}{CHEV}</span>
            </RevealLink>
          ))}
        </div>
      </div>

      <div className="section wrap" id="features">
        <Reveal className="sec-head center"><h2 className="h2">{t('featuresTitle')}</h2></Reveal>
        <div className="features">
          <Reveal as="article" className="tile glass">
            <p className="eyebrow" style={{ margin: 0 }}>{t('dailyEyebrow')}</p>
            <h3 className="h2" style={{ fontSize: 'clamp(30px,3.6vw,44px)' }}>{t('dailyTitle')}</h3>
            <p className="body">{t('dailyBody')}</p>
            <div className="tile-art" aria-hidden="true"><div className="glow" /><CardFace className="c solo" id="sun" deck="moon" locale={locale} /></div>
            <div className="cta-row left"><Link className="btn btn-primary" href={{ pathname: '/draw', query: { spread: '1' } }}>{t('dailyCta')}</Link></div>
          </Reveal>
          <Reveal as="article" className="tile glass" delay={100}>
            <p className="eyebrow" style={{ margin: 0 }}>{t('threeEyebrow')}</p>
            <h3 className="h2" style={{ fontSize: 'clamp(30px,3.6vw,44px)' }}>{t('threeTitle')}</h3>
            <p className="body">{t('threeBody')}</p>
            <div className="tile-art" aria-hidden="true">
              <CardBack className="c t1" deck="lotus" /><CardBack className="c t2" deck="lotus" /><CardBack className="c t3" deck="lotus" />
            </div>
            <div className="cta-row left"><Link className="btn btn-secondary" href={{ pathname: '/draw', query: { spread: '3' } }}>{t('threeCta')}</Link></div>
          </Reveal>
        </div>
      </div>

      <div className="section wrap">
        <div className="meet">
          <Reveal className="meet-art"><MeetArt /></Reveal>
          <Reveal delay={100}>
            <h2 className="h2">{t('meetTitle')}</h2>
            <p className="lead">{t('meetLead')}</p>
            <MeetList items={[t('meet1'), t('meet2'), t('meet3')]} />
            <div className="cta-row left"><Link className="btn btn-primary" href="/draw">{t('meetCta')}</Link></div>
          </Reveal>
        </div>
      </div>

      <Reveal className="section wrap final center">
        <h2 className="h2">{t('finalA')}<br /><span className="grad-text">{t('finalB')}</span></h2>
        <div className="cta-row"><Link className="btn btn-primary btn-lg" href="/draw">{t('start')}</Link></div>
      </Reveal>
    </>
  );
}
