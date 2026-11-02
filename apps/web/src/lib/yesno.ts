export type Verdict = 'yes' | 'no' | 'maybe' | 'later';
type Base = 'yes' | 'no' | 'maybe';

/**
 * Quy ước Có / Không / Có thể cho 78 lá. Đây là một quy ước tham khảo theo truyền thống phổ biến, không phải chuẩn duy nhất.
 * - Lá xuôi: theo bảng dưới (Ẩn Chính theo từng lá; Ẩn Phụ theo bộ và số).
 * - Lá ngược: lá "Có" thành "Chưa phải lúc" (năng lượng đang bị chặn hoặc chậm lại); lá "Có thể" vẫn là "Có thể"; lá "Không" vẫn là "Không".
 */
const MAJOR: Record<string, Base> = {
  fool: 'yes', magician: 'yes', priestess: 'maybe', empress: 'yes', emperor: 'yes', hierophant: 'yes', lovers: 'yes', chariot: 'yes',
  strength: 'yes', hermit: 'maybe', wheel: 'yes', justice: 'maybe', hanged: 'maybe', death: 'no', temperance: 'maybe', devil: 'no',
  tower: 'no', star: 'yes', moon: 'maybe', sun: 'yes', judgement: 'yes', world: 'yes'
};

/** Thứ tự cột: gậy, cốc, kiếm, tiền. */
const MINOR: Record<string, readonly [Base, Base, Base, Base]> = {
  ace: ['yes', 'yes', 'yes', 'yes'],
  '2': ['maybe', 'yes', 'maybe', 'maybe'],
  '3': ['yes', 'yes', 'no', 'yes'],
  '4': ['yes', 'maybe', 'maybe', 'maybe'],
  '5': ['no', 'no', 'no', 'no'],
  '6': ['yes', 'yes', 'maybe', 'yes'],
  '7': ['maybe', 'maybe', 'no', 'maybe'],
  '8': ['yes', 'no', 'no', 'yes'],
  '9': ['maybe', 'yes', 'no', 'yes'],
  '10': ['no', 'yes', 'no', 'yes'],
  page: ['yes', 'yes', 'maybe', 'yes'],
  knight: ['yes', 'yes', 'maybe', 'maybe'],
  queen: ['yes', 'yes', 'maybe', 'yes'],
  king: ['yes', 'yes', 'maybe', 'yes']
};
const SUIT_COL: Record<string, 0 | 1 | 2 | 3> = { wands: 0, cups: 1, swords: 2, pentacles: 3 };

export const isMajor = (id: string): boolean => id in MAJOR;

const baseOf = (id: string): Base => {
  const major = MAJOR[id];
  if (major) return major;
  const [suit = '', rank = ''] = id.split('-');
  const col = SUIT_COL[suit];
  const row = MINOR[rank];
  return col === undefined || !row ? 'maybe' : row[col];
};

export const verdictOf = (id: string, reversed: boolean): Verdict => {
  const base = baseOf(id);
  if (!reversed) return base;
  return base === 'yes' ? 'later' : base;
};

/** Gộp nhiều lá: lấy kết quả chiếm đa số; không có đa số thì là "Có thể". */
export const combineVerdicts = (verdicts: readonly Verdict[]): Verdict => {
  if (verdicts.length === 1) return verdicts[0] ?? 'maybe';
  const count = (v: Verdict): number => verdicts.filter((x) => x === v).length;
  const need = Math.floor(verdicts.length / 2) + 1;
  return (['yes', 'no', 'later'] as const).find((v) => count(v) >= need) ?? 'maybe';
};

/** Chủ đề nhạy cảm (sức khỏe, tiền bạc, pháp lý): vẫn trả lời nhưng nhắc rằng Tarot không thay chuyên gia. */
export const SENSITIVE_PATTERN: Record<'vi' | 'en', RegExp> = {
  vi: /(thuốc|bệnh|ung thư|điều trị|phẫu thuật|mang thai|đầu tư|cổ phiếu|chứng khoán|tiền ảo|vay (tiền|nợ)|ly hôn|kiện|tòa án|luật sư)/iu,
  en: /\b(medicine|medication|disease|cancer|treatment|surgery|pregnan\w*|invest\w*|stocks?|crypto\w*|loan|divorce|lawsuit|court|lawyer)\b/iu
};

/** Biểu tượng SVG (phần bên trong thẻ svg) cho từng kết quả. */
export const VERDICT_ICON: Record<Verdict, string> = {
  yes: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  no: '<path d="M6 6l12 12M18 6L6 18"/>',
  maybe: '<path d="M9.5 9a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1 1-1.1 1.8"/><path d="M12 17.3v.2"/>',
  later: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.3l2.7 1.7"/>'
};
