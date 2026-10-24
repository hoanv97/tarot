import { COURT_RANKS, ELEMENTS, type CardStructure, type CourtRank, type Element, type ElementRelation, type Metrics, type DrawnCard } from './types';

export type CardIndex = ReadonlyMap<string, CardStructure>;

const isCourt = (rank: string | null): rank is CourtRank => rank !== null && (COURT_RANKS as readonly string[]).includes(rank);

export const relationBetween = (a: Element, b: Element, relations: Record<string, ElementRelation>): ElementRelation =>
  relations[`${a}+${b}`] ?? relations[`${b}+${a}`] ?? 'neutral';

const countBy = <T>(items: readonly T[]): Map<T, number> => {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
};

const firstRepeated = <T>(counts: Map<T, number>): [T, number] | null => {
  for (const [key, n] of counts) if (n >= 2) return [key, n];
  return null;
};

/** Tính toàn bộ chỉ số của một trải bài. Ném lỗi nếu có id lá không tồn tại. */
export const computeMetrics = (picks: readonly DrawnCard[], cards: CardIndex, relations: Record<string, ElementRelation>): Metrics => {
  const drawn = picks.map((pick) => {
    const card = cards.get(pick.id);
    if (!card) throw new Error(`Không có lá bài "${pick.id}"`);
    return { card, reversed: pick.reversed };
  });

  const elementCounts = countBy(drawn.map((d) => d.card.element));
  const ranked = [...elementCounts.entries()].sort((a, b) => b[1] - a[1]);
  const profile: Metrics['element_profile'] =
    drawn.length === 1 ? 'single' : ranked.length === 1 ? 'all_same' : ranked.length === 2 ? 'dominant_pair' : 'mixed';
  const hasLead = profile !== 'mixed';
  const dominant = hasLead ? (ranked[0]?.[0] ?? null) : null;
  const secondary = profile === 'dominant_pair' ? (ranked[1]?.[0] ?? null) : null;

  const numerologies = drawn.map((d) => d.card.numerology).filter((n): n is number => n !== null);
  const repeatedNumber = firstRepeated(countBy(numerologies));
  const courtRanks = drawn.map((d) => d.card.rank).filter(isCourt);
  const repeatedRank = firstRepeated(countBy(courtRanks));

  const tokens = new Set<string>();
  for (const { card, reversed } of drawn) {
    tokens.add(card.id);
    tokens.add(`${card.id}:${reversed ? 'R' : 'U'}`);
  }

  return {
    card_count: drawn.length,
    major_count: drawn.filter((d) => d.card.arcana === 'major').length,
    court_count: drawn.filter((d) => isCourt(d.card.rank)).length,
    ace_count: drawn.filter((d) => d.card.rank === 'ace').length,
    reversal_pattern: drawn.map((d) => (d.reversed ? 'R' : 'U')).join(''),
    element_profile: profile,
    dominant_element: dominant,
    secondary_element: secondary,
    element_relation: dominant && secondary ? relationBetween(dominant, secondary, relations) : null,
    missing_element: profile === 'mixed' ? (ELEMENTS.find((e) => !elementCounts.has(e)) ?? null) : null,
    repeated_numerology: repeatedNumber ? repeatedNumber[0] : null,
    repeated_numerology_size: repeatedNumber ? repeatedNumber[1] : 0,
    repeated_rank: repeatedRank ? repeatedRank[0] : null,
    cards_present: tokens
  };
};
