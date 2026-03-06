export default function ProductsLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden animate-pulse">
      {/* Portfolio summary header */}
      <div className="hidden lg:flex items-center justify-center gap-6 border-b border-border px-6 py-2 bg-white shrink-0">
        <div className="h-3 w-14 bg-slate-200 rounded" />
        <div className="h-3 w-24 bg-slate-100 rounded" />
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-slate-200" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-slate-200" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden lg:flex flex-col flex-shrink-0 w-[280px] border-r border-border bg-surface-muted p-3 gap-1.5">
          {/* Add product button */}
          <div className="h-9 w-full bg-slate-100 rounded-lg mb-2" />
          {/* Product items */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3 bg-white border border-slate-100">
              <div className="h-2 w-2 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Center panel */}
        <div className="flex-1 min-w-0 p-6 space-y-4">
          {/* Product name + status */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
          </div>
          <div className="h-4 w-32 bg-slate-100 rounded" />
          {/* Intelligence cards */}
          <div className="mt-8 space-y-3">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-slate-100 rounded" />
                  <div className="h-4 w-2/3 bg-slate-200 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-50 rounded" />
                <div className="h-3 w-3/4 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right context panel (3col breakpoint) */}
        <div className="hidden 3col:flex flex-col flex-shrink-0 w-[360px] border-l border-border bg-white p-5 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="space-y-2">
            {[85, 72, 91, 78, 83, 69].map((w, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
