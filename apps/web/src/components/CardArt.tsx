import { CARD_INDEX, getLocaleBundle, type Locale } from '@miu/tarot-core';
import { backSVG, esc, faceSvgFor } from '@/lib/art/draw';

const faceCache = new Map<string, string>();

/** SVG mặt trước của một lá (chuỗi). Dùng được ở cả server lẫn client. */
export const cardFaceSvg = (id: string, deck: string, locale: Locale, configured: { name?: string | undefined; image?: string | undefined } = {}): string => {
  const key = `${locale}:${deck}:${id}:${configured.name ?? ''}:${configured.image ?? ''}`;
  const cached = faceCache.get(key);
  if (cached) return cached;
  if (configured.image) {
    const image = `<svg viewBox="0 0 200 340" aria-hidden="true" focusable="false"><image href="${esc(configured.image)}" width="200" height="340" preserveAspectRatio="xMidYMid slice"/></svg>`;
    faceCache.set(key, image);
    return image;
  }
  const structure = CARD_INDEX.get(id);
  const text = getLocaleBundle(locale).cards[id];
  const name = configured.name ?? text?.name;
  const svg = structure && name ? faceSvgFor({ id, numeral: structure.numeral, name }, deck) : backSVG(deck);
  faceCache.set(key, svg);
  return svg;
};

export const cardBackSvg = (deck: string): string => backSVG(deck);

type FaceProps = { id: string; deck: string; locale: Locale; className?: string };
export function CardFace({ id, deck, locale, className }: FaceProps) {
  return <div className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: cardFaceSvg(id, deck, locale) }} />;
}

export function CardBack({ deck, className }: { deck: string; className?: string }) {
  return <div className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: backSVG(deck) }} />;
}
