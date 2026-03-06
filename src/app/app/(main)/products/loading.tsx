export default function ProductsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-border-default p-4 space-y-2">
            <div className="h-5 w-1/3 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-1/4 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
