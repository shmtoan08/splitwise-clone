// Root layout — toàn bộ UI được xử lý bởi src/app/[locale]/layout.tsx
// File này chỉ cần export RootLayout tối thiểu để Next.js không báo lỗi
// next-intl middleware sẽ redirect từ / → /{defaultLocale}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
