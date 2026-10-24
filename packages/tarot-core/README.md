# @miu/tarot-core

Bộ máy luật tầng 2 và rút bài, thuần TypeScript.

```ts
import { drawCards, CARD_IDS, readSpread } from '@miu/tarot-core';
const picks = drawCards(CARD_IDS, 3);              // truyền seed để lặp lại kết quả
const insights = readSpread({ picks, spreadId: '3', topicId: 'love', locale: 'vi' });
```

- `computeMetrics` → `evaluateCondition` → `selectRules` (nhóm loại trừ, ưu tiên, giới hạn số nhận xét) → `generateInsights`.
- `validateCondition` / `validateRuleSet` dùng cho trang admin và test.
- Test: `pnpm --filter @miu/tarot-core test` (ca vàng, mô phỏng 90.000 lượt rút, kiểm tra nội dung qua content-policy).
