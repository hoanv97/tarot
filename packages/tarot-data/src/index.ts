/**
 * Dữ liệu thô của Miu Tarot. Gói này chỉ chứa JSON và không có logic.
 * Kiểu dữ liệu và việc nạp theo ngôn ngữ nằm trong @miu/tarot-core.
 *
 * structure/  : phần trung lập ngôn ngữ (cấu trúc lá bài, điều kiện luật)
 * locales/<l> : toàn bộ chữ theo ngôn ngữ (tên, kiến giải, câu của luật, nhãn giao diện)
 */
import cardsStructure from './structure/cards.json';
import rulesStructure from './structure/rules.json';
import viCards from './locales/vi/cards.json';
import viRules from './locales/vi/rules.json';
import viUi from './locales/vi/ui.json';
import enCards from './locales/en/cards.json';
import enRules from './locales/en/rules.json';
import enUi from './locales/en/ui.json';

export const rawStructure = { cards: cardsStructure, rules: rulesStructure } as const;

export const rawLocales = {
  vi: { cards: viCards, rules: viRules, ui: viUi },
  en: { cards: enCards, rules: enRules, ui: enUi }
} as const;
