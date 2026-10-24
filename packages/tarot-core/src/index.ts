import { CARD_INDEX, RULE_SET, getLocaleBundle, getCardName } from './data';
import { generateInsights } from './insights';
import { DEFAULT_LOCALE, type DrawnCard, type Insight, type Locale, type RuleSetDef, type RuleTexts, type SpreadId, type TopicId } from './types';

export * from './types';
export * from './metrics';
export * from './conditions';
export * from './insights';
export * from './draw';
export * from './validate';
export { CARDS, CARD_INDEX, CARD_IDS, RULE_SET, getLocaleBundle, getCardName } from './data';
export type { LocaleBundle } from './data';

export type ReadSpreadArgs = {
  picks: readonly DrawnCard[];
  spreadId: SpreadId;
  topicId: TopicId;
  locale?: Locale;
  /** Dùng bảng luật khác (ví dụ lấy từ database) thay cho bản đóng gói sẵn. */
  ruleSet?: RuleSetDef;
  ruleTexts?: RuleTexts;
};

/** Đường tắt: từ các lá đã rút tới danh sách nhận xét tầng 2, bằng dữ liệu đóng gói sẵn. */
export const readSpread = ({ picks, spreadId, topicId, locale = DEFAULT_LOCALE, ruleSet = RULE_SET, ruleTexts }: ReadSpreadArgs): Insight[] => {
  const bundle = getLocaleBundle(locale);
  return generateInsights({
    picks, spreadId, topicId, ruleSet,
    ruleTexts: ruleTexts ?? bundle.ruleTexts,
    ui: bundle.ui,
    cards: CARD_INDEX,
    cardName: (id) => getCardName(locale, id)
  });
};
