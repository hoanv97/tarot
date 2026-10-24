import { evaluateCondition } from './conditions';
import { computeMetrics, type CardIndex } from './metrics';
import type { DrawnCard, Insight, Metrics, RuleDef, RuleSetDef, RuleTexts, SpreadId, TopicId, UiText } from './types';

export type InsightInput = {
  picks: readonly DrawnCard[];
  spreadId: SpreadId;
  topicId: TopicId;
  ruleSet: RuleSetDef;
  ruleTexts: RuleTexts;
  ui: UiText;
  cards: CardIndex;
  /** id lá bài -> tên hiển thị theo ngôn ngữ */
  cardName: (id: string) => string;
};

const fillPlaceholders = (text: string, metrics: Metrics, input: InsightInput): string => {
  const { picks, cards, ui, cardName } = input;
  const elementName = (e: string | null) => (e ? (ui.elements[e as keyof UiText['elements']]?.name ?? '') : '');
  const repeated = picks.filter((p) => {
    const card = cards.get(p.id);
    if (!card) return false;
    if (metrics.repeated_numerology !== null) return card.numerology === metrics.repeated_numerology;
    return metrics.repeated_rank !== null && card.rank === metrics.repeated_rank;
  });
  const replacements: Record<string, string> = {
    '{dominant}': elementName(metrics.dominant_element),
    '{secondary}': elementName(metrics.secondary_element),
    '{major_names}': picks.filter((p) => cards.get(p.id)?.arcana === 'major').map((p) => cardName(p.id)).join(', '),
    '{repeated_names}': repeated.map((p) => cardName(p.id)).join(', ')
  };
  return Object.entries(replacements).reduce((out, [key, value]) => out.split(key).join(value), text);
};

/**
 * Chọn luật cho một trải bài:
 * 1. Giữ luật đang bật, đúng kiểu trải, đủ ưu tiên tối thiểu và điều kiện đúng.
 * 2. Mỗi nhóm loại trừ chỉ giữ luật ưu tiên cao nhất (bằng nhau thì luật đứng trước).
 * 3. Sắp theo ưu tiên giảm dần (bằng nhau thì theo thứ tự trong bảng), lấy tối đa max_insights.
 */
export const selectRules = (input: Pick<InsightInput, 'ruleSet' | 'spreadId'> & { metrics: Metrics }): RuleDef[] => {
  const { ruleSet, spreadId, metrics } = input;
  const { min_priority: minPriority, max_insights: maxInsights } = ruleSet.selection;
  const matched = ruleSet.rules
    .map((rule, order) => ({ rule, order }))
    .filter(({ rule }) => rule.enabled !== false && rule.spreads.includes(spreadId) && rule.priority >= minPriority && evaluateCondition(rule.when, metrics));

  const bestByGroup = new Map<string, { rule: RuleDef; order: number }>();
  const chosen: { rule: RuleDef; order: number }[] = [];
  for (const entry of matched) {
    const group = entry.rule.exclusive_group;
    if (!group) { chosen.push(entry); continue; }
    const current = bestByGroup.get(group);
    if (!current || entry.rule.priority > current.rule.priority) bestByGroup.set(group, entry);
  }
  chosen.push(...bestByGroup.values());
  chosen.sort((a, b) => b.rule.priority - a.rule.priority || a.order - b.order);
  return chosen.slice(0, maxInsights[spreadId] ?? 4).map((entry) => entry.rule);
};

export const generateInsights = (input: InsightInput): Insight[] => {
  if (input.picks.length === 0) return [];
  const metrics = computeMetrics(input.picks, input.cards, input.ruleSet.element_relations);
  return selectRules({ ruleSet: input.ruleSet, spreadId: input.spreadId, metrics }).flatMap((rule) => {
    const text = input.ruleTexts[rule.id];
    if (!text) return []; // luật chưa có chữ ở ngôn ngữ này thì bỏ qua thay vì hiện trống
    const extra = text.topic_text?.[input.topicId];
    const body = fillPlaceholders(text.text, metrics, input);
    return [{ id: rule.id, category: rule.category, tone: rule.tone, text: extra ? `${body} ${extra}` : body }];
  });
};
