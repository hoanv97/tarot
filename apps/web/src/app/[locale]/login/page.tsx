import { redirect } from '@/i18n/navigation';

/** Đăng nhập nằm chung trang Lịch sử (giống bản mẫu); giữ đường dẫn /login cho liên kết cũ. */
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/history', locale });
}
