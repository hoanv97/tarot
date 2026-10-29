import { describe, expect, it } from 'vitest';
import { lintText } from '@miu/content-policy';
import { CARD_IDS, RULE_SET, getLocaleBundle, readSpread, type TopicId } from '../src';

const describeViolations = (where: string, text: string) =>
  lintText(text, 'vi').map((v) => `${where}: [${v.category}] "${v.match}"`);

describe('nội dung tiếng Việt đóng gói sẵn tuân thủ chính sách (không y tế, tài chính cụ thể, khẳng định tuyệt đối)', () => {
  const vi = getLocaleBundle('vi');
  it('kiến giải của 78 lá bài', () => {
    const problems: string[] = [];
    for (const id of CARD_IDS) {
      const card = vi.cards[id];
      if (!card) { problems.push(`${id}: thiếu`); continue; }
      const fields: [string, string][] = [
        ['meaning_upright', card.meaning_upright], ['meaning_reversed', card.meaning_reversed], ['symbolism', card.symbolism],
        ...(card.advice ? [['advice.upright', card.advice.upright], ['advice.reversed', card.advice.reversed]] as [string, string][] : []),
        ...(card.questions ? [...card.questions.upright, ...card.questions.reversed].map((q, i) => [`questions.${i}`, q] as [string, string]) : []),
        ...Object.entries(card.topics).flatMap(([t, v]) => [[`${t}.upright`, v.upright], [`${t}.reversed`, v.reversed]] as [string, string][])
      ];
      for (const [field, text] of fields) problems.push(...describeViolations(`${id}.${field}`, text));
    }
    expect(problems).toEqual([]);
  });
  it('câu của các luật tầng 2', () => {
    const problems: string[] = [];
    for (const rule of RULE_SET.rules) {
      const t = vi.ruleTexts[rule.id];
      if (!t) continue;
      problems.push(...describeViolations(`${rule.id}.text`, t.text));
      for (const [topic, sentence] of Object.entries(t.topic_text ?? {})) problems.push(...describeViolations(`${rule.id}.${topic}`, sentence ?? ''));
    }
    expect(problems).toEqual([]);
  });
  it('mọi nhận xét tạo ra từ bảng luật đều tuân thủ', () => {
    const topics: TopicId[] = ['love', 'career', 'study', 'finance', 'mind'];
    const problems: string[] = [];
    for (const topic of topics) {
      for (const [a, b, c] of [['death', 'tower', 'devil'], ['sun', 'star', 'world'], ['wands-5', 'swords-5', 'pentacles-5'], ['wands-king', 'cups-king', 'swords-ace']] as const) {
        for (const reversed of [false, true]) {
          const out = readSpread({ picks: [a, b, c].map((id) => ({ id, reversed })), spreadId: '3', topicId: topic });
          for (const i of out) problems.push(...describeViolations(i.id, i.text));
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
