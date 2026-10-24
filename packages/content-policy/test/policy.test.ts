import { describe, expect, it } from 'vitest';
import { detectCrisis, isCompliant, lintText, LLM_SAFETY_RULES } from '../src';

describe('lintText (vi)', () => {
  it('cho phép câu gợi mở thông thường', () => {
    expect(isCompliant('Có thể bạn đang cần nghỉ ngơi một chút; hãy chăm sóc bản thân và hỏi ý kiến người tin cậy.', 'vi')).toBe(true);
    expect(isCompliant('Hãy đầu tư thời gian cho việc học đều đặn.', 'vi')).toBe(true);
  });
  it('chặn lời khuyên y tế', () => {
    expect(lintText('Bạn nên uống thuốc và đi điều trị sớm.', 'vi').map((v) => v.category)).toContain('medical');
    expect(lintText('Lá bài cho thấy bạn sẽ mắc bệnh.', 'vi').length).toBeGreaterThan(0);
  });
  it('chặn lời khuyên tài chính và cờ bạc', () => {
    expect(lintText('Bạn nên mua cổ phiếu lúc này.', 'vi').map((v) => v.category)).toContain('financial');
    expect(lintText('Hôm nay hợp để đánh lô đề.', 'vi').length).toBeGreaterThan(0);
  });
  it('chặn khẳng định tuyệt đối', () => {
    expect(lintText('Chắc chắn bạn sẽ thành công.', 'vi').map((v) => v.category)).toContain('absolute_prediction');
    expect(lintText('Mối quan hệ này sẽ ly hôn.', 'vi').length).toBeGreaterThan(0);
  });
  it('chặn đề cập tự hại', () => {
    expect(lintText('Đừng nghĩ đến chuyện tự tử.', 'vi').map((v) => v.category)).toContain('self_harm');
  });
  it('không nhầm từ nằm trong từ khác', () => {
    expect(isCompliant('Bạn thích mật mã học (cryptography) và các câu đố.', 'vi')).toBe(true);
  });
});

describe('lintText (en)', () => {
  it('cho phép câu gợi mở', () => {
    expect(isCompliant('This may be a good moment to rest and reflect.', 'en')).toBe(true);
  });
  it('chặn y tế, tài chính, tuyệt đối', () => {
    expect(lintText('You should invest in stocks now.', 'en').map((v) => v.category)).toContain('financial');
    expect(lintText('This will cure your illness.', 'en').map((v) => v.category)).toContain('medical');
    expect(lintText('You will definitely succeed, guaranteed.', 'en').map((v) => v.category)).toContain('absolute_prediction');
  });
});

describe('detectCrisis', () => {
  it('nhận diện dấu hiệu khủng hoảng', () => {
    expect(detectCrisis('Tôi không muốn sống nữa', 'vi')).toBe(true);
    expect(detectCrisis('I want to die', 'en')).toBe(true);
    expect(detectCrisis('Mình có nên đổi việc không?', 'vi')).toBe(false);
  });
});

describe('LLM_SAFETY_RULES', () => {
  it('có đủ quy tắc cốt lõi', () => {
    expect(LLM_SAFETY_RULES.vi).toContain('Không dự đoán chắc chắn');
    expect(LLM_SAFETY_RULES.en).toContain('Never predict with certainty');
  });
});
