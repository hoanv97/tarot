import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Các gói trong monorepo xuất mã TypeScript nguồn, cần Next biên dịch giúp.
  transpilePackages: ['@miu/tarot-core', '@miu/tarot-data', '@miu/content-policy'],
  reactStrictMode: true,
  poweredByHeader: false
};

export default withNextIntl(config);
