/**
 * Chính sách nội dung cho Miu Tarot: tarot là giải trí và tham khảo.
 *
 * Nội dung hiển thị (kiến giải, nhận xét, câu do AI viết) không được:
 *  - đưa lời khuyên hoặc chẩn đoán y tế, tâm lý;
 *  - đưa lời khuyên tài chính cụ thể (mua, bán, vay, đầu tư vào một thứ gì đó);
 *  - khẳng định tuyệt đối về tương lai hoặc dự đoán điều xấu (bệnh, chết, phá sản…);
 *  - đề cập đến tự hại.
 *
 * Bộ lọc này là LỚP KIỂM TRA TỰ ĐỘNG, không thay thế việc người đọc duyệt nội dung.
 */
export type Locale = 'vi' | 'en';
export type PolicyCategory = 'medical' | 'financial' | 'absolute_prediction' | 'self_harm';

export type PolicyRule = { id: string; category: PolicyCategory; pattern: RegExp; reason: string };
export type PolicyViolation = { ruleId: string; category: PolicyCategory; reason: string; match: string };

/* JS không có \b cho chữ có dấu, nên dùng lookaround theo Unicode. */
const word = (body: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu');

const VI_RULES: PolicyRule[] = [
  { id: 'vi-medical-diagnosis', category: 'medical', pattern: word('chẩn đoán|điều trị|chữa (?:khỏi|bệnh|trị)|đơn thuốc|uống thuốc|dùng thuốc|liều (?:dùng|lượng)|phẫu thuật|xét nghiệm|ung thư|tiểu đường|trầm cảm lâm sàng|rối loạn (?:lo âu|trầm cảm|ăn uống)'), reason: 'Không đưa lời khuyên hoặc chẩn đoán y tế, tâm lý.' },
  { id: 'vi-medical-prediction', category: 'medical', pattern: word('(?:bạn )?(?:sẽ|có thể sẽ) (?:mắc|bị) (?:bệnh|ung thư|tai nạn)|(?:sắp|sẽ) (?:ốm nặng|qua đời|chết)'), reason: 'Không dự đoán bệnh tật hay cái chết.' },
  { id: 'vi-financial-advice', category: 'financial', pattern: word('nên (?:mua|bán|đầu tư|vay|gửi|đặt cược)|hãy (?:mua|bán|vay|đặt cược)(?! thêm)|cổ phiếu|chứng khoán|tiền (?:điện tử|ảo)|bitcoin|crypto|forex|ngoại hối|cá cược|xổ số|lô đề|vay nặng lãi'), reason: 'Không đưa lời khuyên tài chính hay cờ bạc cụ thể.' },
  { id: 'vi-absolute', category: 'absolute_prediction', pattern: word('chắc chắn (?:sẽ|bạn sẽ)|nhất định (?:sẽ|phải)|không thể tránh khỏi|định mệnh đã an bài|100%|đảm bảo (?:sẽ|rằng)|sẽ (?:ly hôn|ly thân|phá sản|thất bại hoàn toàn)'), reason: 'Không khẳng định tuyệt đối về tương lai.' },
  { id: 'vi-self-harm', category: 'self_harm', pattern: word('tự (?:tử|sát|hại|làm đau)|kết thúc cuộc đời|không muốn sống'), reason: 'Không đề cập hay gợi ý tự hại.' }
];

const EN_RULES: PolicyRule[] = [
  { id: 'en-medical-diagnosis', category: 'medical', pattern: word('diagnos(?:e|is|ed)|treatment|cure[sd]?|prescription|medication|dosage|surgery|cancer|diabetes|clinical depression'), reason: 'No medical or psychological advice or diagnosis.' },
  { id: 'en-medical-prediction', category: 'medical', pattern: word('you (?:will|are going to) (?:get sick|fall ill|die|have cancer)|will die'), reason: 'No predictions of illness or death.' },
  { id: 'en-financial-advice', category: 'financial', pattern: word('you should (?:buy|sell|invest|borrow)|buy (?:stocks?|shares)|sell (?:stocks?|shares)|stocks?|crypto(?:currency)?|bitcoin|forex|gambl(?:e|ing)|lottery|betting'), reason: 'No specific financial or gambling advice.' },
  { id: 'en-absolute', category: 'absolute_prediction', pattern: word('you will definitely|definitely will|guaranteed|100%|inevitabl[ey]|destined to|will (?:divorce|go bankrupt|fail completely)'), reason: 'No absolute claims about the future.' },
  { id: 'en-self-harm', category: 'self_harm', pattern: word('suicide|self[- ]harm|kill yourself|end your life|do not want to live'), reason: 'No mention or suggestion of self-harm.' }
];

export const POLICY_RULES: Record<Locale, PolicyRule[]> = { vi: VI_RULES, en: EN_RULES };

export const lintText = (text: string, locale: Locale): PolicyViolation[] => {
  const normalized = text.normalize('NFC');
  const found: PolicyViolation[] = [];
  for (const rule of POLICY_RULES[locale]) {
    const m = rule.pattern.exec(normalized);
    if (m) found.push({ ruleId: rule.id, category: rule.category, reason: rule.reason, match: m[0] });
  }
  return found;
};

export const isCompliant = (text: string, locale: Locale): boolean => lintText(text, locale).length === 0;

export type Disclaimer = { short: string; full: string; mind_note: string };

/**
 * Quy tắc an toàn gửi kèm mọi lời nhắn gửi tới mô hình AI (tầng 3).
 * Giữ cùng tinh thần với bộ lọc ở trên; kết quả từ AI vẫn phải qua lintText trước khi hiển thị.
 */
export const LLM_SAFETY_RULES: Record<Locale, string> = {
  vi: [
    'Bạn là Miu, một người bạn đồng hành nhẹ nhàng đọc bài Tarot như một công cụ suy ngẫm và giải trí.',
    'Quy tắc bắt buộc:',
    '- Không dự đoán chắc chắn. Dùng từ gợi ý như "có thể", "dường như", "gợi ý rằng".',
    '- Không đưa lời khuyên hay chẩn đoán y tế, tâm lý. Không nhắc đến bệnh cụ thể, thuốc hay điều trị.',
    '- Không đưa lời khuyên tài chính cụ thể: không bảo mua, bán, vay, đầu tư hay đặt cược vào bất cứ thứ gì.',
    '- Không dự đoán cái chết, bệnh tật, tai nạn, ly hôn hay phá sản. Lá bài "đáng sợ" được diễn giải theo hướng chuyển hóa.',
    '- Nếu người dùng nhắc đến ý định tự hại hoặc khủng hoảng, nhẹ nhàng khuyên họ trò chuyện với người thân, chuyên gia hoặc liên hệ dịch vụ khẩn cấp tại địa phương; không đọc bài cho tình huống đó.',
    '- Nhắc rằng quyết định cuối cùng thuộc về người dùng.',
    '- Chỉ dựa vào các lá bài và nhận xét được cung cấp; không bịa thêm lá. Viết tiếng Việt, 120–220 từ, giọng ấm áp, trực tiếp với "bạn".'
  ].join('\n'),
  en: [
    'You are Miu, a gentle companion who reads Tarot as a tool for reflection and entertainment.',
    'Mandatory rules:',
    '- Never predict with certainty. Use soft language such as "may", "seems", "suggests".',
    '- Give no medical or psychological advice or diagnosis. Do not mention specific illnesses, medication or treatment.',
    '- Give no specific financial advice: never tell the user to buy, sell, borrow, invest or bet on anything.',
    '- Never predict death, illness, accidents, divorce or bankruptcy. Frightening cards are framed as transformation.',
    '- If the user mentions self-harm or a crisis, gently suggest talking to someone they trust, a professional, or local emergency services; do not give a reading for that situation.',
    '- Remind the user that the final decision is theirs.',
    '- Rely only on the cards and insights provided; do not invent cards. Write in English, 120-220 words, warm and direct ("you").'
  ].join('\n')
};

/** Dấu hiệu khủng hoảng trong câu hỏi của người dùng; khi gặp thì không gọi AI mà trả về lời nhắn hỗ trợ. */
const CRISIS_PATTERNS: Record<Locale, RegExp> = {
  vi: word('tự (?:tử|sát|hại)|muốn chết|không muốn sống|kết thúc cuộc đời|tự làm đau'),
  en: word('suicide|kill myself|want to die|end my life|self[- ]harm|hurt myself')
};
export const detectCrisis = (text: string, locale: Locale): boolean => CRISIS_PATTERNS[locale].test(text.normalize('NFC'));
