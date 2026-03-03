interface ProductMatchBadgeProps {
  products: Array<{ id: string; name: string }>;
}

export default function ProductMatchBadge({ products }: ProductMatchBadgeProps) {
  if (products.length === 0) return null;

  const label =
    products.length === 1
      ? `Matches: ${products[0].name}`
      : `Matches ${products.length} of your products`;

  return (
    <span className="inline-flex items-center gap-1 bg-canary/10 text-canary border border-canary/30 rounded px-2 py-0.5 font-mono text-[10px]">
      <span aria-hidden="true">&#9733;</span>
      {label}
    </span>
  );
}
