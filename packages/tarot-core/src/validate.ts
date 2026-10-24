import { METRIC_NAMES, OPERATORS, SPREAD_IDS, TONES, TOPIC_IDS, type Condition, type RuleDef, type RuleSetDef, type RuleTexts } from './types';

export type Issue = { code: string; ruleId?: string; message: string };

export const PLACEHOLDERS = ['{dominant}', '{secondary}', '{major_names}', '{repeated_names}'] as const;
const PLACEHOLDER_RE = /\{[a-z_]+\}/g;
const MAX_DEPTH = 6;

export type ValidateOptions = { cardIds: readonly string[] };

/** Trả về thông báo lỗi (tiếng Việt) hoặc chuỗi rỗng nếu điều kiện hợp lệ. */
export const validateCondition = (node: unknown, options: ValidateOptions, depth = 0): string => {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return 'Điều kiện phải là một đối tượng JSON.';
  if (depth > MAX_DEPTH) return `Điều kiện lồng quá sâu (tối đa ${MAX_DEPTH} cấp).`;
  const record = node as Record<string, unknown>;
  const list = record.all ?? record.any;
  if (record.all !== undefined || record.any !== undefined) {
    if (!Array.isArray(list) || list.length === 0) return '"all" / "any" cần một danh sách không rỗng.';
    for (const child of list) {
      const error = validateCondition(child, options, depth + 1);
      if (error) return error;
    }
    return '';
  }
  const { metric, op, value } = record;
  if (typeof metric !== 'string' || !(METRIC_NAMES as readonly string[]).includes(metric)) return `Chỉ số "${String(metric)}" không tồn tại.`;
  if (typeof op !== 'string' || !(OPERATORS as readonly string[]).includes(op)) return `Toán tử "${String(op)}" không hợp lệ.`;
  if (!('value' in record)) return 'Thiếu "value".';
  if (op === 'contains_all') {
    if (metric !== 'cards_present') return '"contains_all" chỉ dùng với chỉ số cards_present.';
    if (!Array.isArray(value) || value.length === 0) return '"value" của contains_all cần một danh sách mã lá.';
    for (const token of value) {
      if (typeof token !== 'string') return 'Mã lá phải là chuỗi.';
      const [id, side, extra] = token.split(':');
      if (!id || !options.cardIds.includes(id) || extra !== undefined || (side !== undefined && side !== 'U' && side !== 'R')) {
        return `Mã lá "${token}" không hợp lệ. Dùng id, id:U hoặc id:R.`;
      }
    }
  } else if (metric === 'cards_present') return 'cards_present chỉ dùng với contains_all.';
  if (op === 'matches' && (metric !== 'reversal_pattern' || typeof value !== 'string' || !/^[UR?]+$/.test(value))) {
    return '"matches" chỉ dùng với reversal_pattern và mẫu gồm U, R, ?.';
  }
  if ((op === '>=' || op === '<=') && typeof value !== 'number') return `"${op}" cần một con số.`;
  return '';
};

export const placeholdersIn = (text: string): string[] => text.match(PLACEHOLDER_RE) ?? [];

const validateRule = (rule: RuleDef, texts: RuleTexts, options: ValidateOptions, seen: Set<string>): Issue[] => {
  const issues: Issue[] = [];
  const add = (code: string, message: string) => issues.push({ code, ruleId: rule.id, message });
  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(rule.id)) add('id-format', 'Mã luật chỉ dùng chữ in hoa, số và dấu gạch nối.');
  if (seen.has(rule.id)) add('id-duplicate', 'Mã luật bị trùng.');
  seen.add(rule.id);
  if (!rule.category) add('category', 'Thiếu nhóm luật.');
  if (!Array.isArray(rule.spreads) || rule.spreads.length === 0 || rule.spreads.some((s) => !(SPREAD_IDS as readonly string[]).includes(s))) add('spreads', 'Kiểu trải không hợp lệ.');
  if (!Number.isInteger(rule.priority) || rule.priority < 0 || rule.priority > 100) add('priority', 'Độ ưu tiên phải là số nguyên từ 0 đến 100.');
  if (!(TONES as readonly string[]).includes(rule.tone)) add('tone', 'Sắc thái không hợp lệ.');
  const whenError = validateCondition(rule.when as Condition, options);
  if (whenError) add('when', whenError);

  const text = texts[rule.id];
  if (!text || text.text.trim().length < 10) add('text', 'Thiếu nội dung hoặc nội dung quá ngắn (cần ít nhất 10 ký tự).');
  else {
    const bad = placeholdersIn(text.text).filter((p) => !(PLACEHOLDERS as readonly string[]).includes(p));
    if (bad.length) add('placeholder', `Biến không hợp lệ: ${bad.join(', ')}.`);
    for (const [topic, sentence] of Object.entries(text.topic_text ?? {})) {
      if (!(TOPIC_IDS as readonly string[]).includes(topic)) add('topic', `Chủ đề "${topic}" không tồn tại.`);
      if (placeholdersIn(sentence ?? '').length) add('topic-placeholder', `Câu theo chủ đề "${topic}" không được dùng biến.`);
    }
  }
  return issues;
};

/** Kiểm tra toàn bộ bảng luật cùng nội dung của một ngôn ngữ. */
export const validateRuleSet = (ruleSet: RuleSetDef, texts: RuleTexts, options: ValidateOptions): Issue[] => {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const rule of ruleSet.rules) issues.push(...validateRule(rule, texts, options, seen));
  const { min_priority: min, max_insights: caps } = ruleSet.selection;
  if (!Number.isInteger(min) || min < 0 || min > 100) issues.push({ code: 'selection', message: 'min_priority phải từ 0 đến 100.' });
  for (const spread of SPREAD_IDS) {
    const cap = caps[spread];
    if (!Number.isInteger(cap) || cap < 1 || cap > 8) issues.push({ code: 'selection', message: `max_insights["${spread}"] phải từ 1 đến 8.` });
  }
  for (const id of Object.keys(texts)) {
    if (!ruleSet.rules.some((rule) => rule.id === id)) issues.push({ code: 'orphan-text', ruleId: id, message: 'Có nội dung nhưng không có luật tương ứng.' });
  }
  return issues;
};
