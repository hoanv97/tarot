# @miu/tarot-data

Dữ liệu thô (JSON), không có logic. Dùng qua `@miu/tarot-core`.

- `src/structure/cards.json`: 78 lá, phần trung lập ngôn ngữ (id, chất, bậc, nguyên tố, con số).
- `src/structure/rules.json`: kiểu trải, cài đặt chọn nhận xét và các luật (điều kiện `when`, độ ưu tiên, nhóm loại trừ).
- `src/locales/<mã ngôn ngữ>/cards.json`: tên và kiến giải của từng lá.
- `src/locales/<mã ngôn ngữ>/rules.json`: câu hiển thị của luật (`text`, `topic_text`).
- `src/locales/<mã ngôn ngữ>/ui.json`: nhãn chủ đề, nguyên tố, kiểu trải, câu tuyên bố miễn trừ.

Tiếng Việt (`vi`) là ngôn ngữ gốc và đầy đủ. Tiếng Anh (`en`) hiện chỉ có tên lá bài và nhãn giao diện;
phần còn lại tự động rơi về tiếng Việt cho tới khi được dịch (xem `docs/i18n.md`).

Khi chuyển sang Supabase, các file này là nguồn để nạp (`supabase/seed.sql`).
