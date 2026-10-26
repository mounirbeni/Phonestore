/** Instant skeleton shown while a page's data loads, so navigation feels immediate. */
export default function Loading() {
  return (
    <div className="container-x pt-6 sm:pt-12" aria-busy="true" aria-live="polite">
      <div className="skeleton h-8 w-48 rounded-xl sm:h-10 sm:w-72" />
      <div className="skeleton mt-3 h-4 w-28 rounded-lg" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="skeleton aspect-square" />
            <div className="space-y-2.5 p-3 sm:p-4">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
