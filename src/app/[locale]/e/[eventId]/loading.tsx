// loading.tsx — Skeleton khi Next.js đang fetch data cho Event page
// Tự động hiển thị khi page.tsx đang suspend (dùng React Suspense)

export default function EventLoading() {
  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded-md w-2/3 mb-2" />
      <div className="h-4 bg-gray-100 rounded-md w-1/3 mb-8" />

      {/* Participant list skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-20 bg-gray-200 rounded-full"
          />
        ))}
      </div>

      {/* Expense list skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </main>
  );
}
