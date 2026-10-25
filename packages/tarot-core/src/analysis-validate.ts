import { TONES, TOPIC_IDS, type AnalysisText, type CardTones, type SpreadDef } from './types';
import type { Issue } from './validate';

/** Biến được phép trong từng phần của dữ liệu Phân tích chuyên sâu. */
export const ANALYSIS_PLACEHOLDERS = {
  lead: ['question', 'topic'],
  overview: ['topic'],
  position: ['card', 'orientation', 'position', 'prompt', 'meaning'],
  transition: ['from', 'to'],
  pair: ['a', 'b'],
  single: ['card', 'orientation', 'keywords', 'other_keywords'],
  none: []
} as const;

type Scope = keyof typeof ANALYSIS_PLACEHOLDERS;
const PLACEHOLDER_RE = /\{([a-z_]+)\}/g;

export type ValidateAnalysisOptions = { cardIds: readonly string[]; spreads: readonly SpreadDef[]; cardTones: CardTones };

export const validateAnalysis = (data: AnalysisText, options: ValidateAnalysisOptions): Issue[] => {
  const issues: Issue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });

  const checkText = (where: string, text: unknown, scope: Scope) => {
    if (typeof text !== 'string' || text.trim().length < 10) { add('text', `${where}: thiếu nội dung hoặc quá ngắn (cần ít nhất 10 ký tự).`); return; }
    const allowed: readonly string[] = ANALYSIS_PLACEHOLDERS[scope];
    for (const m of text.matchAll(PLACEHOLDER_RE)) {
      if (!allowed.includes(m[1] ?? '')) add('placeholder', `${where}: biến {${m[1]}} không dùng được ở đây (cho phép: ${allowed.map((a) => `{${a}}`).join(', ') || 'không có'}).`);
    }
  };
  const checkList = (where: string, variants: unknown, scope: Scope, required = true) => {
    if (!Array.isArray(variants) || (required && variants.length === 0)) { add('list', `${where}: cần một danh sách ít nhất 1 câu.`); return; }
    variants.forEach((text, i) => checkText(`${where}[${i}]`, text, scope));
  };

  for (const key of ['title', 'lead', 'overview', 'cards', 'flow', 'insights', 'reflect', 'upright', 'reversed'] as const) {
    if (!data.labels[key]) add('labels', `labels.${key}: thiếu nhãn.`);
  }
  checkText('safety', data.safety, 'none');
  checkText('closing.note', data.closing.note, 'none');

  const seenIntent = new Set<string>();
  data.intents.forEach((intent, i) => {
    if (!intent.id || seenIntent.has(intent.id)) add('intent', `intents[${i}]: id thiếu hoặc trùng.`);
    seenIntent.add(intent.id);
    if (!intent.keywords.length || intent.keywords.some((k) => k.trim().length < 2)) add('intent', `intents[${i}] (${intent.id}): từ khóa phải có và dài ít nhất 2 ký tự.`);
    checkList(`intents[${intent.id}].lead`, intent.lead, 'lead');
  });

  checkList('lead.with_question', data.lead.with_question, 'lead');
  checkList('lead.no_question', data.lead.no_question, 'lead');
  for (const k of ['positive_lean', 'caution_lean', 'balanced'] as const) checkList(`overview.${k}`, data.overview[k], 'overview');

  const neededPositions = new Set(options.spreads.flatMap((s) => s.positions));
  for (const position of neededPositions) {
    for (const tone of TONES) checkList(`positions.${position}.${tone}`, data.positions[position]?.[tone], 'position');
  }
  for (const position of Object.keys(data.positions)) {
    if (!neededPositions.has(position)) add('position', `positions.${position}: không có kiểu trải nào dùng vị trí này.`);
  }

  for (const from of TONES) for (const to of TONES) checkList(`transitions.${from}>${to}`, data.transitions[`${from}>${to}`], 'transition');
  checkList('single_flow', data.single_flow, 'single');
  checkList('closing.common', data.closing.common, 'none');
  for (const topic of TOPIC_IDS) checkList(`closing.topics.${topic}`, data.closing.topics[topic], 'none');

  for (const id of options.cardIds) {
    const tone = options.cardTones[id];
    if (!tone || !TONES.includes(tone[0]) || !TONES.includes(tone[1])) add('card-tone', `card_tone.${id}: thiếu hoặc sai tông [xuôi, ngược].`);
  }

  for (const [id, card] of Object.entries(data.cards)) {
    if (!options.cardIds.includes(id)) { add('card', `cards.${id}: mã lá không tồn tại.`); continue; }
    const side = (where: string, s: { upright?: string; reversed?: string } | undefined) => {
      for (const k of ['upright', 'reversed'] as const) if (s?.[k] !== undefined) checkText(`${where}.${k}`, s[k], 'none');
    };
    side(`cards.${id}`, card);
    for (const [topic, s] of Object.entries(card.topics ?? {})) {
      if (!(TOPIC_IDS as readonly string[]).includes(topic)) add('card', `cards.${id}.topics.${topic}: chủ đề không tồn tại.`);
      side(`cards.${id}.topics.${topic}`, s);
    }
    for (const [position, s] of Object.entries(card.positions ?? {})) {
      if (!neededPositions.has(position)) add('card', `cards.${id}.positions.${position}: vị trí không tồn tại.`);
      side(`cards.${id}.positions.${position}`, s);
    }
  }

  for (const [key, value] of Object.entries(data.pairs)) {
    const ids = key.split('+');
    if (ids.length !== 2 || ids[0] === ids[1] || ids.some((id) => !options.cardIds.includes(id))) { add('pair', `pairs["${key}"]: khóa phải có dạng "idA+idB" với hai lá khác nhau và có thật.`); continue; }
    if (key !== [...ids].sort().join('+')) add('pair', `pairs["${key}"]: hãy viết hai mã theo thứ tự chữ cái (${[...ids].sort().join('+')}) để khỏi trùng.`);
    checkList(`pairs["${key}"]`, Array.isArray(value) ? value : [value], 'pair');
  }

  return issues;
};
