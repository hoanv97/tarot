# Phân tích chuyên sâu (dữ liệu có sẵn, không dùng AI)

Phần "Phân tích chuyên sâu" chạy hoàn toàn từ bộ dữ liệu trong `packages/tarot-data`, không gọi AI, không cần đăng nhập, không tốn phí theo lượt.
Hàm `analyzeSpread` (trong `@miu/tarot-core`) nhận: các lá **theo thứ tự rút** (kèm xuôi/ngược), kiểu trải, chủ đề và **câu hỏi**; trả về các phần để hiển thị.
Cùng đầu vào luôn cho cùng kết quả (biến thể câu được chọn bằng hạt giống tính từ đầu vào).

## Các phần của kết quả

| Phần | Lấy từ đâu | Phụ thuộc vào |
|---|---|---|
| Câu hỏi của bạn | `intents[].lead` (nếu câu hỏi khớp từ khóa), nếu không thì `lead.with_question`; không có câu hỏi thì `lead.no_question` | câu hỏi, chủ đề |
| Bức tranh chung | `overview.*` | tông các lá (nghiêng sáng / nghiêng thận trọng / cân bằng) |
| Theo thứ tự các lá | `positions.<vị trí>.<tông>` + ý nghĩa của lá | thứ tự, vị trí, chiều, chủ đề |
| Mạch chuyển | `transitions."tông>tông"`, `pairs`, hoặc `single_flow` (1 lá) | thứ tự các lá liền kề |
| Những điểm đáng chú ý | luật tầng 2 (`rules.json`) | tổ hợp các lá |
| Để bạn tự vấn | `closing.topics.<chủ đề>` + `closing.common` | chủ đề |

## Ý nghĩa của một lá được chọn theo thứ tự ưu tiên

1. `cards.<id>.positions.<vị trí>.<upright|reversed>`: riêng cho lá này ở vị trí này
2. `cards.<id>.topics.<chủ đề>.<upright|reversed>`: riêng cho lá này ở chủ đề này
3. `cards.<id>.<upright|reversed>`: riêng cho lá này
4. Nếu chưa viết: dùng kiến giải theo chủ đề có sẵn trong `locales/vi/cards.json`

Nghĩa là bạn có thể viết dần từng lá; lá nào chưa viết vẫn có nội dung mặc định.

## Các file

- `structure/analysis.json`: `card_tone` là tông của từng lá theo chiều `[xuôi, ngược]` (`positive`, `neutral`, `caution`). Tông quyết định câu dẫn, bức tranh chung và câu nối. Hãy xem lại cho đúng ý bạn.
- `locales/vi/analysis.json`: mọi chữ hiển thị. Bản `en` rỗng thì tự dùng tiếng Việt.

## Biến `{…}` được phép

| Ở đâu | Biến |
|---|---|
| `intents[].lead`, `lead.*` | `{question}`, `{topic}` |
| `overview.*` | `{topic}` |
| `positions.*` | `{card}`, `{orientation}`, `{position}`, `{prompt}`, `{meaning}` |
| `transitions.*` | `{from}`, `{to}` |
| `pairs` | `{a}`, `{b}` |
| `single_flow` | `{card}`, `{orientation}`, `{keywords}`, `{other_keywords}` |
| các chỗ còn lại | không có biến |

## Viết thêm nội dung

Lá có nội dung riêng:

```json
"cards": {
  "tower": {
    "upright": "Câu chung cho Tháp, chiều xuôi.",
    "topics": { "love": { "reversed": "Tháp ngược trong chuyện tình cảm." } },
    "positions": { "past": { "upright": "Tháp ở vị trí quá khứ." } }
  }
}
```

Cặp lá (khóa là hai mã lá viết theo thứ tự chữ cái, nối bằng `+`):

```json
"pairs": {
  "star+sun": ["Ngôi Sao đi cùng Mặt Trời gợi hy vọng đang dần thành hình."]
}
```

Ý định của câu hỏi (từ khóa dài nhất khớp được sẽ thắng; thêm ý định mới bằng cách thêm một mục vào `intents`):

```json
{ "id": "timing", "keywords": ["khi nào", "bao giờ"], "lead": ["Bạn hỏi về thời điểm: “{question}”. ..."] }
```

## Quy tắc nội dung (bắt buộc với Apple/Google)

Giữ giọng gợi mở, tham khảo và giải trí. Không khẳng định chắc chắn về tương lai; không nhắc bệnh, thuốc, điều trị; không khuyên mua/bán/vay/đầu tư/cá cược; không dự đoán bệnh tật, cái chết, ly hôn, phá sản; không nhắc tự hại. Bộ kiểm tra tự động (`@miu/content-policy`) sẽ chặn các cụm này.

## Kiểm tra

```
pnpm --filter @miu/tarot-core test
```

- `validateAnalysis` báo lỗi biến sai chỗ, thiếu biến thể, mã lá hoặc khóa cặp sai.
- Một bài test rút 300 ván ngẫu nhiên và kiểm tra toàn bộ văn bản tạo ra qua bộ lọc chính sách.
