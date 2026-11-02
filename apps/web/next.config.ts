import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Các gói trong monorepo xuất mã TypeScript nguồn, cần Next biên dịch giúp.
  transpilePackages: ['@miu/tarot-core', '@miu/tarot-data', '@miu/content-policy', '@miu/web-shared'],
  reactStrictMode: true,
  poweredByHeader: false,
  // Ảnh linh vật ít đổi: cho trình duyệt giữ lại 1 tuần để các lần vào sau không tải lại.
  headers: async () => [{ source: '/miu.webp', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] }],
  // Cho phép chạy thử vào thư mục khác (NEXT_DIST_DIR) mà không đè lên thư mục .next của `pnpm dev` đang chạy.
  distDir: process.env.NEXT_DIST_DIR ?? '.next'
};

export default withNextIntl(config);
