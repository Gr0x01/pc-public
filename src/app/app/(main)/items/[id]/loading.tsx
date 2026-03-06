export default function ItemDetailLoading() {
  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
      <div className="h-8 w-2/3 bg-slate-200 rounded animate-pulse" />
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
        <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="space-y-2 pt-4">
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
