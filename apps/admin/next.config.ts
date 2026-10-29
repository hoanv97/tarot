import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Các gói trong monorepo xuất mã TypeScript nguồn, cần Next biên dịch giúp.
  transpilePackages: ['@miu/tarot-core', '@miu/tarot-data', '@miu/content-policy', '@miu/web-shared'],
  reactStrictMode: true,
  poweredByHeader: false,
  // Cho phép build thử vào thư mục khác (NEXT_DIST_DIR) mà không đè lên thư mục .next của `pnpm dev` đang chạy.
  distDir: process.env.NEXT_DIST_DIR ?? '.next'
};

export default withNextIntl(config);
