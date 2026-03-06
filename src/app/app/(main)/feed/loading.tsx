export default function FeedLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
          {/* Title + filter bar */}
          <div className="mb-2.5">
            <div className="h-[22px] w-36 bg-slate-200 rounded" />
          </div>
          <div className="flex gap-2 mb-6">
            {[72, 56, 64, 80].map((w, i) => (
              <div key={i} className="h-7 rounded-full bg-slate-100" style={{ width: w }} />
            ))}
          </div>

          {/* Date group 1 */}
          <div className="flex items-center gap-3 pt-3 pb-2">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <span className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="space-y-1.5 pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 bg-slate-100 rounded" />
                  <div className="h-4 w-3/5 bg-slate-200/70 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-100/60 rounded" />
                <div className="flex items-center gap-3">
                  <div className="h-3 w-20 bg-slate-100/60 rounded" />
                  <div className="h-3 w-24 bg-slate-100/60 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Date group 2 */}
          <div className="flex items-center gap-3 pt-3 pb-2">
            <div className="h-3 w-24 bg-slate-200/70 rounded" />
            <span className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="space-y-1.5 pb-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-slate-100 rounded" />
                  <div className="h-4 w-2/3 bg-slate-200/70 rounded" />
                </div>
                <div className="h-3 w-4/5 bg-slate-100/60 rounded" />
                <div className="flex items-center gap-3">
                  <div className="h-3 w-20 bg-slate-100/60 rounded" />
                  <div className="h-3 w-28 bg-slate-100/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
