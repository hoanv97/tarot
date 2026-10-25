import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { getMessageOverrides } from '@/lib/content';
import { deepMerge } from '@/lib/content-patch';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  // Chữ trang chủ, câu hỏi gợi ý và thông tin bộ bài có thể được admin chỉnh; thiếu thì giữ messages gốc.
  return { locale, messages: deepMerge(messages, await getMessageOverrides(locale)) };
});
