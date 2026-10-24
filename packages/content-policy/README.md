# @miu/content-policy

Bộ lọc nội dung tự động và quy tắc an toàn cho AI. Xem `docs/compliance.md`.

- `lintText(text, locale)`: trả về các vi phạm (y tế, tài chính, khẳng định tuyệt đối, tự hại).
- `detectCrisis(text, locale)`: phát hiện dấu hiệu khủng hoảng trong câu hỏi người dùng.
- `LLM_SAFETY_RULES`: quy tắc đưa vào lời nhắn hệ thống khi gọi AI.
