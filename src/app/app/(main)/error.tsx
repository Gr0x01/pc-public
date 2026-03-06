"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-sm text-text-secondary mb-4">We couldn&apos;t load this page.</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
