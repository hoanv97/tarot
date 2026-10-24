# Kiến giải chuyên sâu · Tầng 2: Bảng luật đọc cả trải bài

Tầng 2 đọc **cả trải bài như một câu chuyện**, thay vì từng lá riêng lẻ. Nó không cần AI: engine tính vài chỉ số từ các lá đã rút, đối chiếu với bảng luật, rồi chọn ra 2–4 nhận xét ngắn. Kết quả có cấu trúc này cũng là đầu vào tốt cho tầng 3 (AI viết bản tổng hợp).

Hai file dữ liệu đi kèm tài liệu này (không có script nào được thêm vào dự án):

| File | Nội dung |
|---|---|
| `data/cards.json` | 78 lá, nguồn để sau này nhập vào database |
| `data/spread-rules.json` | kiểu trải, vị trí, từ vựng và **78 luật** |

## 1. Luồng xử lý

```
các lá đã rút (id, xuôi/ngược, vị trí)
        │
        ▼
 tính METRIC  ──►  đối chiếu `when` của từng luật  ──►  lọc theo kiểu trải
        │                                                    │
        │                                       mỗi exclusive_group giữ 1 luật (priority cao nhất)
        │                                                    │
        │                                       sắp theo priority, lấy tối đa max_insights
        ▼                                                    ▼
  signals (cho tầng 3)                      insights = text + topic_text của chủ đề hiện tại
```

## 2. Dữ liệu lá bài (`cards.json`)

So với file Excel, các thay đổi sau nhằm khớp với `tarot.html` và phục vụ luật:

- **`id` đổi sang đúng ID của trang**: `fool`, `priestess`, `wands-ace`, `wands-2`… `wands-page`, `cups-queen`. Nhờ vậy lịch sử trải bài đang lưu bằng ID cũ vẫn khớp khi chuyển sang database.
- **`name_vi` theo tên trang đang dùng** (Hoàng Hậu, Tiết Độ, Tiểu Đồng Gậy…), không theo tên trong Excel.
- **Thêm 2 cột** cho luật:
  - `element`: `fire` / `water` / `air` / `earth`. Lá Ẩn Phụ lấy theo chất (Gậy = lửa, Cốc = nước, Kiếm = khí, Tiền = đất). Lá Ẩn Chính lấy theo tương ứng chiêm tinh của hệ Rider–Waite–Smith.
  - `numerology`: tổng chữ số rút gọn về 0–9 (ví dụ Vòng Quay May Mắn 10 → 1, Cái Chết 13 → 4). Lá cung đình để `null`.
- `keywords_upright` / `keywords_reversed` chuyển từ chuỗi phân cách bằng dấu phẩy thành **mảng**.
- Các cột còn lại giữ nguyên tên và nội dung như file Excel.

**Chủ đề Học vấn:** `cards.json` đã có thêm `study_upright` và `study_reversed` cho cả 78 lá, nên đủ 5 chủ đề của trang (`love`, `career`, `study`, `finance`, `mind`). Chủ đề `mind` dùng cột `health_*`.

## 3. Bảng luật tổng quan (78 luật)

| Nhóm (`category`) | Số luật | Ưu tiên | Ý tưởng |
|---|---|---|---|
| `pair` | 22 | 90 | Cặp lá kinh điển (Cái Chết + Ngôi Sao, Tòa Tháp + Mặt Trời…), có mặt ở bất kỳ vị trí nào |
| `element` | 16 | 50–80 | 3 lá cùng nguyên tố (4), một nguyên tố chiếm ưu thế (4, có câu riêng theo chủ đề), thiếu một nguyên tố (4), lá đơn (4) |
| `element_relation` | 3 | 60 | Quan hệ giữa hai nguyên tố: hỗ trợ, đối lập, trung tính |
| `reversal` | 15 | 40–78 | Mẫu xuôi/ngược: 8 mẫu cho trải Quá khứ–Hiện tại–Tương lai, 5 mẫu cho Bản thân–Hoàn cảnh–Thử thách, 2 cho lá đơn |
| `arcana` | 5 | 45–65 | Số lá Ẩn Chính: 0, 1, từ 2 (có câu theo chủ đề); lá đơn là Ẩn Chính hay Ẩn Phụ |
| `rank` | 7 | 58–68 | Có lá Át, nhiều lá cung đình, trùng bậc Tiểu Đồng / Hiệp Sĩ / Hoàng Hậu / Vua |
| `number` | 10 | 71–72 | Con số 1–9 lặp lại, thêm nhận xét riêng khi cả ba lá cùng số |

Nguyên tắc chung của các câu: nói trực tiếp với "bạn", dùng từ gợi ý ("có thể", "dường như"), không khẳng định tuyệt đối, không đưa lời khuyên y tế hay tài chính cụ thể. Lá "đáng sợ" như Cái Chết hay Tòa Tháp luôn được diễn giải theo hướng chuyển hóa.

Quan hệ nguyên tố dùng cách phân loại cổ điển: **Lửa + Khí** và **Nước + Đất** hỗ trợ nhau; **Lửa + Nước** và **Khí + Đất** đối lập; **Lửa + Đất** và **Khí + Nước** trung tính.

## 4. Cú pháp một luật

```jsonc
{
  "id": "EL-DOM-WATER",           // duy nhất
  "category": "element",
  "spreads": ["3", "3s"],         // áp dụng cho kiểu trải nào: "1", "3", "3s"
  "priority": 70,                 // 0–100, cao thì được xếp trước
  "exclusive_group": "element_main", // cùng nhóm chỉ giữ 1 luật; null nếu không giới hạn
  "tone": "neutral",              // positive | neutral | caution (để UI chọn màu hoặc biểu tượng)
  "when": { ... },                // điều kiện, xem bên dưới
  "text": "…",                    // câu chính, có thể chứa {placeholder}
  "topic_text": { "love": "…" }   // tùy chọn: câu nối thêm theo chủ đề hiện tại
}
```

**Điều kiện (`when`)** là một cây đơn giản:
- Lá: `{ "metric": "major_count", "op": ">=", "value": 2 }`
- Kết hợp: `{ "all": [ … ] }` hoặc `{ "any": [ … ] }`
- Toán tử: `==`, `!=`, `>=`, `<=`, `contains_all` (cho tập lá), `matches` (cho mẫu xuôi/ngược, `?` là ký tự bất kỳ, ví dụ `U?R`)

**Metric** (đầy đủ trong `spread-rules.json`, mục `metrics`): `card_count`, `major_count`, `court_count`, `ace_count`, `reversal_pattern`, `element_profile`, `dominant_element`, `secondary_element`, `element_relation`, `missing_element`, `repeated_numerology`, `repeated_numerology_size`, `repeated_rank`, `cards_present`.

`cards_present` dùng token: `death` (có mặt, hướng nào cũng được), `death:U` (chỉ xuôi), `death:R` (chỉ ngược). Cặp "Cái Chết ngược + Ngôi Sao" chỉ cần viết `["death:R", "star"]`.

**Placeholder**: `{dominant}`, `{secondary}`, `{major_names}`, `{repeated_names}`.

## 5. Thuật toán chọn nhận xét

1. Tính metric từ các lá đã rút.
2. Giữ các luật có kiểu trải hiện tại trong `spreads` và `when` đúng, bỏ luật có `priority` dưới `min_priority` (30).
3. Trong mỗi `exclusive_group`, giữ **một** luật có `priority` cao nhất (bằng nhau thì lấy luật đứng trước). Ví dụ các luật `reversal` giành nhau một chỗ, nên luật cụ thể hơn (tất cả ngược, priority 78) thắng luật chung (priority 75).
4. Sắp xếp giảm dần theo `priority`, lấy tối đa `max_insights` (lá đơn 2, trải 3 lá 4).
5. Nội dung = `text` (thay placeholder), nối thêm `topic_text[chủ đề]` nếu có.

Điểm quan trọng khi đưa vào database: **thứ tự dòng trong file là tiebreaker**, nên thêm cột `sort_order`.

## 6. Kết quả chạy thử (do engine tham chiếu chạy trên dữ liệu thật)

**Trải 3 lá, chủ đề Sự nghiệp:** Cái Chết, Ngôi Sao, Át Cốc (đều xuôi)

- *(cặp)* Cái Chết và Ngôi Sao đi cùng nhau: một sự kết thúc mở đường cho hy vọng. Sau khi buông điều cũ, sự chữa lành có thể đến chậm mà chắc.
- *(mẫu xuôi/ngược)* Cả ba lá đều xuôi: dòng chảy từ quá khứ đến tương lai khá thông suốt. Hãy tận dụng đà này và đừng chủ quan với những chi tiết nhỏ.
- *(nguyên tố)* Nguyên tố Nước chiếm ưu thế: cảm xúc và trực giác đang dẫn dắt câu chuyện này. Trong công việc, sự thấu cảm là lợi thế khi làm việc với người khác, nhưng hãy giữ ranh giới để không bị cuốn theo bầu không khí chung.
- *(Ẩn Chính)* Có từ hai lá Ẩn Chính trở lên (Cái Chết, Ngôi Sao): trải bài này gợi một giai đoạn có ý nghĩa lớn hơn thường lệ… Trong công việc, các quyết định lúc này có thể ảnh hưởng lâu dài; hãy cân nhắc kỹ và đừng ngại hỏi ý kiến người từng trải.

**Trải Bản thân–Hoàn cảnh–Thử thách, chủ đề Tình yêu:** Tình Nhân (ngược), Hoàng Hậu Cốc (xuôi), Ba Kiếm (ngược)

- Lá Bản thân và lá Thử thách đều ngược: câu chuyện nằm nhiều ở nội tâm. Hãy chăm sóc bản thân trước, rồi mới giải quyết thử thách.
- Nguyên tố Khí chiếm ưu thế… Trong tình cảm, giao tiếp là chìa khóa; hãy nói rõ điều mình mong muốn và lắng nghe đủ trước khi suy diễn.
- Chỉ có một lá Ẩn Chính (Tình Nhân), nên đây có thể là bài học hoặc chủ đề trung tâm…
- Khí và Nước không hỗ trợ cũng không đối đầu nhau: hai năng lượng này có thể cùng tồn tại…

**Trải 3 lá, chủ đề Tài chính:** Năm Gậy (xuôi), Năm Kiếm (ngược), Năm Tiền (ngược)

- Năm Gậy và Năm Kiếm: xung đột và cạnh tranh. Hãy chọn trận đáng đánh…
- Quá khứ thông suốt, nhưng hiện tại và tương lai ngược… Đây là lời mời điều chỉnh, không phải một bản án.
- Con số 5 lặp lại (Năm Gậy, Năm Kiếm, Năm Tiền): chủ đề của thay đổi và thử thách…
- Ba lá cùng chung một con số là sự trùng khớp khá hiếm; thông điệp về con số này đáng được xem là trọng tâm của cả trải bài.

**Kiểm thử mô phỏng** (90.000 lượt rút ngẫu nhiên, 30% lá ngược):
- Cả 78 luật đều kích hoạt được; không có placeholder nào còn sót.
- Mỗi lượt rút 3 lá luôn ra 3–4 nhận xét (trung bình 3,7); lá đơn luôn ra đủ 2.
- Các cặp lá kinh điển hiếm gặp: mỗi cặp khoảng 0,08% số lần rút, cả 22 cặp cộng lại khoảng 1,7%. Như vậy chúng là "điểm nhấn bất ngờ", không phải thứ người dùng thấy mỗi lần.

## 7. Gợi ý bảng database

```
cards            (id PK, name_en, name_vi, arcana, suit, number, numerology, element, keywords_upright, keywords_reversed,
                  meaning_*, love_*, career_*, study_*, finance_*, health_*, symbolism)
topics           (id PK, label)
spreads          (id PK, label, card_count)
spread_positions (spread_id FK, idx, id, label, prompt)
rules            (id PK, sort_order, category, priority, exclusive_group, tone, when_json, text, enabled)
rule_spreads     (rule_id FK, spread_id FK)
rule_topic_texts (rule_id FK, topic_id FK, text)
```

`when_json` nên lưu nguyên khối JSON (cột JSON/JSONB) để trang quản trị có thể bật/tắt luật, sửa câu và `priority` mà không cần sửa code. Thêm luật mới chỉ là thêm một dòng; chỉ khi cần **metric mới** mới phải sửa engine.

## 8. Đầu ra cho tầng 3 (AI)

Engine nên trả về cả chỉ số lẫn nhận xét, để tầng AI viết bản tổng hợp liền mạch dựa trên chúng thay vì tự đoán lại:

```json
{
  "spread": "3", "topic": "career", "question": "…",
  "cards": [ { "id": "death", "reversed": false, "position": "past" } ],
  "signals": { "element_profile": "dominant_pair", "dominant_element": "water", "major_count": 2, "reversal_pattern": "UUU" },
  "insights": [ { "id": "PAIR-DEATH-STAR", "category": "pair", "tone": "positive", "text": "…" } ]
}
```

## 9. Giới hạn và hướng mở rộng

- Tương ứng nguyên tố của lá Ẩn Chính có vài biến thể giữa các truyền thống; bảng này theo cách phổ biến của hệ Rider–Waite–Smith. Lá cung đình hiện chỉ dùng nguyên tố của chất, chưa dùng nguyên tố "kép" (ví dụ Hiệp Sĩ Cốc = Lửa của Nước).
- Quy tắc `numerology` rút gọn nên Át, Mười, Ma Thuật, Vòng Quay May Mắn và Mặt Trời cùng thuộc "số 1". Nếu thấy quá rộng, có thể chỉ tính Ẩn Phụ 1–9 hoặc tách Mười ra thành số riêng.
- Chưa có luật cho trải 5–10 lá hay các hướng đọc phức tạp hơn (Celtic Cross); khi cần chỉ thêm kiểu trải vào `spreads` và các luật mới.
- Nên có người đọc lại toàn bộ câu chữ trước khi phát hành, nhất là nhóm `caution` và cặp lá liên quan đến lo âu, tổn thương.

## 10. Tích hợp trong `tarot.html`

- Engine nằm trong `tarot.html` (đối tượng `SpreadInsights`, ngay trước `renderReading`), hiển thị khối **Kiến giải chuyên sâu** dưới các lá bài ở màn hình kết quả.
- Nguồn luật: khi trang chạy qua máy chủ (http/https), engine đọc `data/spread-rules.json` nên chỉnh file này là đủ. Khi mở trực tiếp bằng file://, trình duyệt không cho `fetch`, nên engine dùng bản sao nhúng trong thẻ `<script type="application/json" id="miu-rules">`. **Sau khi sửa luật, cần dán lại bản sao nhúng** (hoặc bỏ nó đi khi đã có máy chủ).
- Nguyên tố và con số của từng lá được suy ra từ id (bảng nguyên tố 22 lá Ẩn Chính nằm trong engine), nên không cần thêm trường vào `CARDS`.
- Đã kiểm thử: engine JS cho kết quả **trùng khớp 100%** với engine tham chiếu Python trên 12.000 lượt rút ngẫu nhiên; chạy thật trên trình duyệt ở giao diện sáng, tối và màn hình 390px, không lỗi console.
