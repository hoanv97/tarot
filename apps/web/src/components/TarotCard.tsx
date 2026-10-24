import type { CardStructure } from '@miu/tarot-core';

const SUIT_SYMBOL: Record<string, string> = { wands: '🜂', cups: '🜄', swords: '🜁', pentacles: '🜃' };
const ELEMENT_SYMBOL: Record<string, string> = { fire: '🜂', water: '🜄', air: '🜁', earth: '🜃' };

/**
 * Lá bài tạm thời bằng CSS. TODO: chuyển bộ SVG ba bộ bài (Rider–Waite–Smith, Nguyệt Quang, Hoa Đăng)
 * từ tarot.html vào gói riêng (packages/tarot-art) và thay thế phần ".face".
 */
export function TarotCard({ card, name, reversed = false, href }: { card: CardStructure; name: string; reversed?: boolean; href?: string }) {
  const symbol = card.suit ? SUIT_SYMBOL[card.suit] : ELEMENT_SYMBOL[card.element];
  const body = (
    <>
      <span className="num">{card.arcana === 'major' ? card.number : card.rank}</span>
      <span className="face" aria-hidden="true" style={{ fontSize: 40 }}>{symbol}</span>
      <span className="name">{name}</span>
    </>
  );
  const className = `tarot-card${reversed ? ' reversed' : ''}`;
  return href ? <a className={className} href={href}>{body}</a> : <div className={className}>{body}</div>;
}
