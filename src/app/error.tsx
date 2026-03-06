"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-sm text-text-secondary mb-4">An unexpected error occurred.</p>
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
