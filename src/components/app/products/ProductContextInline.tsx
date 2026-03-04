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

/**
 * Inline product details shown below intelligence matches at <1440px
 * (when the right context panel is hidden).
 */
export default function ProductContextInline({ detail }: { detail: ProductDetailData }) {
  const { product } = detail;
  const ingredients = product.raw_ingredients_text
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  return (
    <section className="mb-8 border border-border rounded bg-white p-5">
      <h2 className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-3">
        Product Details
      </h2>

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="mb-4">
          <p className="font-mono text-[13px] text-text-body leading-relaxed">
            {ingredients.join(", ")}
          </p>
          <p className="font-mono text-[10px] text-text-secondary mt-1">
            {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        <MetaItem label="Category" value={TYPE_LABELS[product.product_type] ?? product.product_type} />
        {product.brand && <MetaItem label="Brand" value={product.brand} />}
        {product.upc_barcode && <MetaItem label="UPC" value={product.upc_barcode} />}
        {product.data_source && (
          <MetaItem
            label="Source"
            value={product.external_id ? `${product.data_source.toUpperCase()} (${product.external_id})` : product.data_source.toUpperCase()}
          />
        )}
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">{label}</span>
      <p className="text-sm text-text-body">{value}</p>
    </div>
  );
}
