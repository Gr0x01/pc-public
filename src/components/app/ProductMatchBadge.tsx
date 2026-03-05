interface ProductMatchBadgeProps {
  products: Array<{ id: string; name: string }>;
}

export default function ProductMatchBadge({ products }: ProductMatchBadgeProps) {
  if (products.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="text-amber shrink-0">
        <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12.2 3.8 14.5l.8-4.7L1.2 6.5l4.7-.7z"/>
      </svg>
      {products.length === 1 ? (
        <span>
          <span className="text-text-secondary">Matches </span>
          <span className="font-semibold text-amber">{products[0].name}</span>
        </span>
      ) : (
        <span>
          <span className="text-text-secondary">Matches </span>
          <span className="font-semibold text-amber">{products[0].name}</span>
          <span className="text-text-secondary"> +{products.length - 1} more</span>
        </span>
      )}
    </span>
  );
}
