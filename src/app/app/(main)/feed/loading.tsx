export default function FeedLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-border-default p-4 space-y-2">
            <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
