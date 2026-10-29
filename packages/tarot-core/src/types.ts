export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'vi';
export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

export const SPREAD_IDS = ['1', '3', '3s'] as const;
export type SpreadId = (typeof SPREAD_IDS)[number];
export const isSpreadId = (value: unknown): value is SpreadId => typeof value === 'string' && (SPREAD_IDS as readonly string[]).includes(value);

export const TOPIC_IDS = ['love', 'career', 'study', 'finance', 'mind'] as const;
export type TopicId = (typeof TOPIC_IDS)[number];
export const isTopicId = (value: unknown): value is TopicId => typeof value === 'string' && (TOPIC_IDS as readonly string[]).includes(value);

export const ELEMENTS = ['fire', 'water', 'air', 'earth'] as const;
export type Element = (typeof ELEMENTS)[number];

export const TONES = ['positive', 'neutral', 'caution'] as const;
export type Tone = (typeof TONES)[number];

export type Arcana = 'major' | 'minor';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
export const COURT_RANKS = ['page', 'knight', 'queen', 'king'] as const;
export type CourtRank = (typeof COURT_RANKS)[number];

/** Phần trung lập ngôn ngữ của một lá bài. */
export type CardStructure = {
  id: string;
  arcana: Arcana;
  suit: Suit | null;
  /** 'ace', '2'…'10', 'page'…'king' cho Ẩn Phụ; null cho Ẩn Chính */
  rank: string | null;
  number: number;
  /** Tổng chữ số rút gọn (0–9); null cho lá cung đình */
  numerology: number | null;
  element: Element;
  sort_order: number;
  /** Số La Mã hiển thị trên lá bài ('0', 'I'…'XXI' cho Ẩn Chính; hạng cho Ẩn Phụ) */
  numeral: string;
};

export type TopicText = { upright: string; reversed: string };
/** Phần chữ của một lá bài theo ngôn ngữ. */
export type CardText = {
  name: string;
  keywords_upright: string[];
  keywords_reversed: string[];
  meaning_upright: string;
  meaning_reversed: string;
  topics: Record<TopicId, TopicText>;
  symbolism: string;
  /** Lời khuyên ngắn theo chiều lá (tùy chọn, thiếu thì không hiện) */
  advice?: { upright: string; reversed: string };
  /** Câu hỏi tự vấn theo chiều lá (tùy chọn) */
  questions?: { upright: string[]; reversed: string[] };
  /** Lời bình của mèo phù thủy Miu (giọng vui, không đưa lời khuyên) */
  miu: string;
};

/** Một lá đã rút: id và chiều. */
export type DrawnCard = { id: string; reversed: boolean };

/* ---------- Luật tầng 2 ---------- */
export const METRIC_NAMES = [
  'card_count', 'major_count', 'court_count', 'ace_count', 'reversal_pattern', 'element_profile',
  'dominant_element', 'secondary_element', 'element_relation', 'missing_element',
  'repeated_numerology', 'repeated_numerology_size', 'repeated_rank', 'cards_present'
] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export const OPERATORS = ['==', '!=', '>=', '<=', 'contains_all', 'matches'] as const;
export type Operator = (typeof OPERATORS)[number];

export type ConditionLeaf = { metric: MetricName; op: Operator; value: string | number | string[] | null };
export type Condition = { all: Condition[] } | { any: Condition[] } | ConditionLeaf;

export type ElementProfile = 'single' | 'all_same' | 'dominant_pair' | 'mixed';
export type ElementRelation = 'friendly' | 'opposed' | 'neutral';

export type Metrics = {
  card_count: number;
  major_count: number;
  court_count: number;
  ace_count: number;
  reversal_pattern: string;
  element_profile: ElementProfile;
  dominant_element: Element | null;
  secondary_element: Element | null;
  element_relation: ElementRelation | null;
  missing_element: Element | null;
  repeated_numerology: number | null;
  repeated_numerology_size: number;
  repeated_rank: CourtRank | null;
  cards_present: ReadonlySet<string>;
};

export type RuleDef = {
  id: string;
  category: string;
  spreads: SpreadId[];
  priority: number;
  exclusive_group: string | null;
  tone: Tone;
  /** Mặc định bật; chỉ ghi `false` khi tắt luật */
  enabled?: boolean;
  when: Condition;
};

export type SpreadDef = { id: SpreadId; card_count: number; positions: string[] };

export type RuleSetDef = {
  version: number;
  element_relations: Record<string, ElementRelation>;
  spreads: SpreadDef[];
  selection: { min_priority: number; max_insights: Record<SpreadId, number> };
  rules: RuleDef[];
};

export type RuleText = { text: string; topic_text?: Partial<Record<TopicId, string>> };
export type RuleTexts = Record<string, RuleText>;

export type UiText = {
  topics: Record<TopicId, string>;
  elements: Record<Element, { name: string; theme: string }>;
  tones: Record<Tone, string>;
  ranks: Record<CourtRank, string>;
  spreads: Record<SpreadId, { label: string; positions: Record<string, { label: string; prompt: string }> }>;
  metrics: Record<string, string>;
  placeholders: Record<string, string>;
  disclaimer: { short: string; full: string; mind_note: string };
};

export type Insight = { id: string; category: string; tone: Tone; text: string };

/* ---------- Phân tích chuyên sâu (dữ liệu có sẵn, không dùng AI) ---------- */
export type SideText = { upright?: string; reversed?: string };

/** Nội dung riêng cho một lá; mọi trường đều tùy chọn, thiếu thì rơi về kiến giải theo chủ đề trong cards.json. */
export type AnalysisCardText = SideText & {
  topics?: Partial<Record<TopicId, SideText>>;
  /** Khóa là mã vị trí: today, past, present, future, self, situation, challenge */
  positions?: Partial<Record<string, SideText>>;
};

export type AnalysisIntent = { id: string; keywords: string[]; lead: string[] };

export type AnalysisText = {
  version: number;
  labels: Record<'title' | 'lead' | 'overview' | 'cards' | 'flow' | 'insights' | 'reflect' | 'upright' | 'reversed', string>;
  safety: string;
  intents: AnalysisIntent[];
  lead: { with_question: string[]; no_question: string[] };
  overview: Record<'positive_lean' | 'caution_lean' | 'balanced', string[]>;
  /** vị trí -> tông -> các biến thể câu dẫn cho lá ở vị trí đó */
  positions: Record<string, Record<Tone, string[]>>;
  cards: Record<string, AnalysisCardText>;
  /** "from>to" theo tông, ví dụ "positive>caution" */
  transitions: Record<string, string[]>;
  /** Khóa "idA+idB" (thứ tự tùy ý); giá trị là một câu hoặc danh sách biến thể */
  pairs: Record<string, string | string[]>;
  single_flow: string[];
  closing: { common: string[]; topics: Record<TopicId, string[]>; note: string };
};

/** Tông từng lá theo chiều [xuôi, ngược]. */
export type CardTones = Record<string, [Tone, Tone]>;

export type AnalysisSectionId = 'lead' | 'overview' | 'cards' | 'flow' | 'insights' | 'reflect';
/** Một ý trong phần phân tích: văn bản, sắc thái (để tô màu) và nhãn nhỏ (nếu có, ví dụ tên vị trí của lá). */
export type AnalysisItem = { text: string; tone: Tone; tag?: string };
export type AnalysisSection = { id: AnalysisSectionId; title: string; items: AnalysisItem[]; /** Chỉ phần chữ của items, tiện cho kiểm thử và xuất văn bản */ paragraphs: string[] };
export type AnalysisResult = {
  /** 'analysis': phân tích từ dữ liệu có sẵn · 'safety': lời nhắn hỗ trợ, không đọc bài */
  source: 'analysis' | 'safety';
  intent: string | null;
  sections: AnalysisSection[];
  note: string;
};
