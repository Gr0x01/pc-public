"use client";

import type { ProductDetailData } from "@/lib/mock/products-data";

const TYPE_LABELS: Record<string, string> = {
  supplement: "Supplement",
  food: "Food",
  cosmetic: "Cosmetic",
  drug: "Drug",
  medical_device: "Medical Device",
  biologic: "Biologic",
  tobacco: "Tobacco",
  veterinary: "Veterinary",
};

interface ProductContextPanelProps {
  detail: ProductDetailData;
  highlightedSubstanceIds: Set<string>;
  useCodes?: Record<string, string[]>;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

export default function ProductContextPanel({
  detail,
  highlightedSubstanceIds,
  useCodes = {},
  isEditing,
  onStartEdit,
  onStopEdit,
}: ProductContextPanelProps) {
  const { product } = detail;
  // Use structured ingredient rows when available for substance_id matching
  const ingredientRows = detail.ingredients ?? [];
  const ingredients = ingredientRows.length > 0
    ? ingredientRows.map((ing) => ing.name)
    : parseIngredients(product.raw_ingredients_text);

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-text-primary truncate">{product.name}</h2>
          <p className="text-[11px] font-mono text-text-secondary mt-0.5">
            {product.brand && <>{product.brand} · </>}
            {TYPE_LABELS[product.product_type] ?? product.product_type}
          </p>
        </div>
        <button
          onClick={onStartEdit}
          className="text-[12px] font-medium text-text-secondary hover:text-amber transition-colors shrink-0 ml-2"
        >
          Edit
        </button>
      </div>

      {/* Ingredients section — sticky */}
      <div className="sticky top-0 bg-white z-10 border-b border-border">
        <div className="px-5 py-4">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
            Ingredients
          </h3>
          <div className="space-y-0">
            {ingredients.map((ingredient, i) => {
              const row = ingredientRows[i];
              const substanceId = row?.substance_id ?? null;
              const isHighlighted = substanceId
                ? highlightedSubstanceIds.has(substanceId)
                : false;
              const codes = substanceId ? useCodes[substanceId] : undefined;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 py-1.5 transition-colors duration-300 ${
                    isHighlighted ? "bg-amber-muted -mx-2 px-2 rounded" : ""
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                      isHighlighted ? "bg-amber" : "bg-slate-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <span
                      className={`font-mono text-[13px] leading-snug ${
                        isHighlighted ? "text-slate-900" : "text-text-body"
                      }`}
                    >
                      {ingredient}
                    </span>
                    {codes && codes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {codes.map((code) => (
                          <span
                            key={code}
                            className="font-mono text-[9px] text-text-secondary bg-surface-muted border border-border rounded px-1.5 py-0.5 uppercase tracking-wide"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="font-mono text-[10px] text-text-secondary mt-2.5">
            {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Product metadata */}
      <div className="px-5 py-4">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
          Details
        </h3>
        <div className="space-y-2.5">
          <MetadataRow label="Category" value={TYPE_LABELS[product.product_type] ?? product.product_type} />
          {product.brand && <MetadataRow label="Brand" value={product.brand} />}
          {product.upc_barcode && <MetadataRow label="UPC" value={product.upc_barcode} />}
          {product.data_source && (
            <MetadataRow
              label="Source"
              value={
                product.external_id
                  ? `${product.data_source.toUpperCase()} (${product.external_id})`
                  : product.data_source.toUpperCase()
              }
            />
          )}
          <MetadataRow
            label="Added"
            value={new Date(product.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary w-16 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-text-body">{value}</span>
    </div>
  );
}

function parseIngredients(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
