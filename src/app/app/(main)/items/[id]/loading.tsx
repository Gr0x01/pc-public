export default function ItemDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-14 bg-slate-200 rounded mb-6" />

      {/* Header: type tag + relevance badge */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-24 bg-slate-100 rounded" />
          <div className="h-5 w-28 bg-slate-50 rounded" />
        </div>
        {/* Title */}
        <div className="space-y-2 mb-2">
          <div className="h-7 w-full bg-slate-200 rounded" />
          <div className="h-7 w-2/3 bg-slate-200 rounded" />
        </div>
        {/* Date + issuing office */}
        <div className="flex items-center gap-3">
          <div className="h-3 w-24 bg-slate-100 rounded" />
          <div className="h-3 w-px bg-slate-200" />
          <div className="h-3 w-36 bg-slate-100 rounded" />
        </div>
        {/* Source link */}
        <div className="h-3 w-28 bg-slate-50 rounded mt-3" />
      </div>

      {/* What Happened section */}
      <div className="mb-6">
        <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-4/5 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Action Items section */}
      <div className="mb-6">
        <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
        <div className="border-t border-slate-100 pt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-3 w-4 bg-slate-200 rounded shrink-0" />
              <div className="h-3 bg-slate-100 rounded" style={{ width: `${90 - i * 12}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Your Products Affected */}
      <div className="mb-6">
        <div className="h-3 w-36 bg-slate-200 rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-8 w-36 bg-slate-50 rounded" />
          <div className="h-8 w-28 bg-slate-50 rounded" />
        </div>
      </div>

      {/* Substances */}
      <div className="mb-6">
        <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          {[80, 96, 72, 88].map((w, i) => (
            <div key={i} className="h-7 bg-slate-50 rounded" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Source footer */}
      <div className="border-t border-slate-100 pt-4 mt-8">
        <div className="h-3 w-2/3 bg-slate-50 rounded" />
      </div>
    </div>
  );
}
