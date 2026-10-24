import { CARD_INDEX, getLocaleBundle, type Locale } from '@miu/tarot-core';
import { backSVG, faceSvgFor } from '@/lib/art/draw';

const faceCache = new Map<string, string>();

/** SVG mặt trước của một lá (chuỗi). Dùng được ở cả server lẫn client. */
export const cardFaceSvg = (id: string, deck: string, locale: Locale): string => {
  const key = `${locale}:${deck}:${id}`;
  const cached = faceCache.get(key);
  if (cached) return cached;
  const structure = CARD_INDEX.get(id);
  const text = getLocaleBundle(locale).cards[id];
  const svg = structure && text ? faceSvgFor({ id, numeral: structure.numeral, name: text.name }, deck) : backSVG(deck);
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
