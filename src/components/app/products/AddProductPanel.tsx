"use client";

import { useState, useCallback } from "react";
import type { DSLDSearchResult, DSLDProductDetail } from "@/lib/products/types";
import DSLDAutocomplete from "./DSLDAutocomplete";

type Step = "search" | "preview" | "submitting";

interface AddProductPanelProps {
  onCancel: () => void;
  onProductAdded: (product: { id: string; name: string; brand?: string | null }) => void;
}

export default function AddProductPanel({ onCancel, onProductAdded }: AddProductPanelProps) {
  const [step, setStep] = useState<Step>("search");
  const [selected, setSelected] = useState<DSLDSearchResult | null>(null);
  const [detail, setDetail] = useState<DSLDProductDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback(async (result: DSLDSearchResult) => {
    setSelected(result);
    setError(null);
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/dsld/${result.dsld_id}`);
      if (!res.ok) throw new Error("Failed to load product details");
      const { data } = (await res.json()) as { data: DSLDProductDetail };
      setDetail(data);
      setStep("preview");
    } catch {
      setError("Failed to load product details. Please try again.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setStep("search");
    setSelected(null);
    setDetail(null);
    setError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selected || !detail) return;
    setStep("submitting");
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detail.product_name,
          brand: detail.brand_name,
          product_type: "supplement",
          data_source: "dsld",
          external_id: String(detail.dsld_id),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const code = json.error?.code;
        if (code === "PLAN_LIMIT") {
          setError("You've reached your product limit. Upgrade your plan to add more products.");
        } else if (code === "DUPLICATE") {
          setError("This product has already been added to your account.");
        } else {
          setError(json.error?.message ?? "Failed to add product.");
        }
        setStep("preview");
        return;
      }

      onProductAdded({
        id: json.data.id,
        name: detail.product_name,
        brand: detail.brand_name,
      });
    } catch {
      setError("Network error. Please try again.");
      setStep("preview");
    }
  }, [selected, detail, onProductAdded]);

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-bold text-text-primary">Add Product</h2>
        <button
          onClick={onCancel}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          {error.includes("limit") && (
            <a
              href="/pricing"
              className="text-sm text-amber font-medium hover:underline mt-1 inline-block"
            >
              View plans
            </a>
          )}
        </div>
      )}

      {/* Step 1: Search */}
      {step === "search" && (
        <div>
          <DSLDAutocomplete onSelect={handleSelect} />
          {loadingDetail && (
            <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading product details...
            </div>
          )}
          <p className="text-xs text-text-secondary mt-4">
            Searching the NIH Dietary Supplement Label Database (DSLD).{" "}
            <span className="text-text-secondary/70">Other product types coming soon.</span>
          </p>
        </div>
      )}

      {/* Step 2: Preview */}
      {(step === "preview" || step === "submitting") && detail && (
        <div>
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Product header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-border">
              <p className="text-sm font-semibold text-text-primary">{detail.product_name}</p>
              {detail.brand_name && (
                <p className="text-xs text-text-secondary mt-0.5">{detail.brand_name}</p>
              )}
              <div className="flex gap-3 mt-1.5 text-[11px] text-text-secondary">
                {detail.supplement_form && <span>{detail.supplement_form}</span>}
                {detail.serving_size && <span>Serving: {detail.serving_size}</span>}
              </div>
            </div>

            {/* Ingredients */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Ingredients ({detail.ingredients.length})
              </p>
              {detail.ingredients.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {detail.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-baseline justify-between text-sm">
                      <span className="text-text-body truncate mr-2">{ing.ingredient_name}</span>
                      {ing.amount && (
                        <span className="text-xs text-text-secondary shrink-0 font-mono">
                          {ing.amount} {ing.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No ingredient data available</p>
              )}

              {detail.other_ingredients && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Other Ingredients
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {detail.other_ingredients}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleBack}
              disabled={step === "submitting"}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === "submitting"}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber rounded hover:bg-amber-action transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {step === "submitting" ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </>
              ) : (
                "Add to Monitored Products"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
