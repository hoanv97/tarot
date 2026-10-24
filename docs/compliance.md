# Tuân thủ nội dung (Apple / Google)

Mục tiêu: giữ Miu Tarot ở mức giải trí / tham khảo, không đưa lời khuyên y tế, tài chính, pháp lý.

## Đã làm trong mã

| Lớp | Nơi | Việc |
|---|---|---|
| Nhãn | `ui.disclaimer`, `Disclaimer.tsx`, footer, `/legal` | "Mang tính tham khảo, giải trí" kèm mỗi lượt rút; chủ đề `mind` có thêm lưu ý sức khỏe tinh thần |
| Linter | `packages/content-policy` | Chặn chẩn đoán/điều trị/thuốc, mua bán đầu tư/vay nợ, tiên đoán tuyệt đối ("chắc chắn sẽ"), nội dung tự hại; vi + en |
| Test nội dung | `tarot-core/test/policy.test.ts` | Toàn bộ nội dung tiếng Việt đi kèm phải qua linter |
| Prompt AI | `LLM_SAFETY_RULES` | Quy tắc an toàn theo ngôn ngữ; câu hỏi người dùng bọc trong `<question>` và coi là dữ liệu |
| Đầu ra AI | `apps/api/src/interpret.ts` | Chạy linter lên kết quả; vi phạm hoặc lỗi LLM thì trả về nhận xét theo luật (`source: 'rules'`) |
| Khủng hoảng | `detectCrisis` | Câu hỏi có dấu hiệu tự hại: không gọi AI, trả lời hỗ trợ (`source: 'safety'`) |
| Nhãn AI | `DrawClient` | Bản đọc do AI viết luôn có nhãn |
| Quản trị | `RuleEditor` | Nội dung luật sửa trong admin cũng phải qua linter trước khi lưu |

## Giới hạn, cần bạn xác minh

- Linter là lớp hỗ trợ dựa trên mẫu từ, **không đảm bảo** qua kiểm duyệt; vẫn cần đọc lại nội dung.
- Tôi **không tải được** bản chính thức của App Store Review Guidelines nên chưa đối chiếu từng điều khoản; hãy đọc trực tiếp trước khi nộp. Chính sách nội dung sức khỏe của Google Play đã đọc, nhưng hãy kiểm tra lại bản hiện hành.
- Cần soạn: chính sách quyền riêng tư (email, lịch sử rút bài, câu hỏi gửi cho AI/Anthropic), điều khoản, xác nhận độ tuổi, trả lời bảng câu hỏi xếp hạng nội dung và khai báo dữ liệu (Data safety / App Privacy).
- Tính năng trả phí (nếu có) trên di động phải theo quy tắc thanh toán trong ứng dụng của từng cửa hàng.
