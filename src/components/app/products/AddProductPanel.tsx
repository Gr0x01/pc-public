"use client";

import { useState, useCallback } from "react";
import type { DSLDSearchResult, DSLDProductDetail } from "@/lib/products/types";
import DSLDAutocomplete from "./DSLDAutocomplete";

type ProductType = "supplement" | "food" | "cosmetic" | "drug" | "medical_device" | "biologic" | "tobacco" | "veterinary";
type Step = "pick_type" | "dsld_search" | "manual" | "preview" | "submitting";

const PRODUCT_TYPES: { value: ProductType; label: string; sub: string }[] = [
  { value: "supplement", label: "Supplement", sub: "Dietary Supplement" },
  { value: "food", label: "Food", sub: "Food & Beverage" },
  { value: "cosmetic", label: "Cosmetic", sub: "Cosmetics & Personal Care" },
  { value: "drug", label: "Drug", sub: "Pharmaceutical" },
  { value: "medical_device", label: "Medical Device", sub: "" },
  { value: "biologic", label: "Biologic", sub: "" },
  { value: "tobacco", label: "Tobacco", sub: "" },
  { value: "veterinary", label: "Veterinary", sub: "" },
];

interface AddProductPanelProps {
  onCancel: () => void;
  onProductAdded: (product: { id: string; name: string; brand?: string | null; productType: ProductType }) => void;
}

export default function AddProductPanel({ onCancel, onProductAdded }: AddProductPanelProps) {
  const [step, setStep] = useState<Step>("pick_type");
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [selected, setSelected] = useState<DSLDSearchResult | null>(null);
  const [detail, setDetail] = useState<DSLDProductDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual entry state
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");

  const handlePickType = useCallback((type: ProductType) => {
    setProductType(type);
    setError(null);
    if (type === "supplement") {
      setStep("dsld_search");
    } else {
      setStep("manual");
    }
  }, []);

  const handleBackToType = useCallback(() => {
    setStep("pick_type");
    setProductType(null);
    setSelected(null);
    setDetail(null);
    setManualName("");
    setManualBrand("");
    setManualIngredients("");
    setError(null);
  }, []);

  // DSLD flow
  const handleDSLDSelect = useCallback(async (result: DSLDSearchResult) => {
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

  const handleBackFromPreview = useCallback(() => {
    setStep("dsld_search");
    setSelected(null);
    setDetail(null);
    setError(null);
  }, []);

  // Submit (both DSLD and manual)
  const handleSubmit = useCallback(async () => {
    if (!productType) return;
    setStep("submitting");
    setError(null);

    const body = detail
      ? {
          name: detail.product_name,
          brand: detail.brand_name,
          product_type: productType,
          data_source: "dsld",
          external_id: String(detail.dsld_id),
        }
      : {
          name: manualName.trim(),
          brand: manualBrand.trim() || null,
          product_type: productType,
          data_source: "manual",
          raw_ingredients_text: manualIngredients.trim() || null,
        };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        setStep(detail ? "preview" : "manual");
        return;
      }

      onProductAdded({
        id: json.data.id,
        name: body.name,
        brand: body.brand,
        productType,
      });
    } catch {
      setError("Network error. Please try again.");
      setStep(detail ? "preview" : "manual");
    }
  }, [productType, detail, manualName, manualBrand, manualIngredients, onProductAdded]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-bold text-text-primary">
          {step === "pick_type" ? "What type of product are you adding?" : "Add Product"}
        </h2>
        <button
          onClick={step === "pick_type" ? onCancel : handleBackToType}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {step === "pick_type" ? "Cancel" : "Change type"}
        </button>
      </div>

      {step === "pick_type" && (
        <>
          <p className="text-sm text-text-secondary mb-5">
            This determines how we monitor FDA regulatory changes for this product.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {PRODUCT_TYPES.map((t, i) => (
              <button
                key={t.value}
                onClick={() => handlePickType(t.value)}
                className="text-left px-4 py-3.5 border border-border rounded-lg hover:border-amber/50 hover:bg-amber/[0.02] transition-colors group"
              >
                <span className="text-sm font-medium text-text-primary group-hover:text-amber transition-colors">
                  {t.label}
                </span>
                {t.sub && (
                  <p className="text-xs text-text-secondary mt-0.5">{t.sub}</p>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {error && step !== "pick_type" && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          {error.includes("limit") && (
            <a href="/pricing" className="text-sm text-amber font-medium hover:underline mt-1 inline-block">
              View plans
            </a>
          )}
        </div>
      )}

      {/* DSLD search step */}
      {step === "dsld_search" && (
        <div>
          <DSLDAutocomplete onSelect={handleDSLDSelect} />
          {loadingDetail && (
            <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <Spinner />
              Loading product details...
            </div>
          )}
          <p className="text-xs text-text-secondary mt-4">
            Searching the NIH Dietary Supplement Label Database (DSLD).
          </p>
        </div>
      )}

      {/* Manual entry step */}
      {step === "manual" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Product Name *</label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Marine Collagen Powder"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Brand</label>
            <input
              type="text"
              value={manualBrand}
              onChange={(e) => setManualBrand(e.target.value)}
              placeholder="e.g. OceanPure"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Ingredients (optional)</label>
            <textarea
              value={manualIngredients}
              onChange={(e) => setManualIngredients(e.target.value)}
              placeholder="Paste your ingredient list here, separated by commas..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60 resize-none"
            />
            <p className="text-[11px] text-text-secondary mt-1">
              We&apos;ll match these against FDA substance databases for monitoring.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBackToType}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!manualName.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber rounded hover:bg-amber-action transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Add to Monitored Products
            </button>
          </div>
        </div>
      )}

      {/* DSLD preview step */}
      {(step === "preview" || step === "submitting") && detail && (
        <div>
          <div className="border border-border rounded-lg overflow-hidden">
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
            <PreviewIngredients detail={detail} />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleBackFromPreview}
              disabled={step === "submitting"}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={step === "submitting"}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber rounded hover:bg-amber-action transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {step === "submitting" ? (
                <>
                  <Spinner />
                  Adding...
                </>
              ) : (
                "Add to Monitored Products"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Submitting state for manual entry */}
      {step === "submitting" && !detail && (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-text-secondary">
          <Spinner />
          Adding product...
        </div>
      )}
    </div>
  );
}

/** Parse semicolon/comma-separated other_ingredients into individual names */
function parseOtherIngredients(raw: string): string[] {
  const sep = raw.includes(";") ? ";" : ",";
  return raw.split(sep).map((s) => s.trim()).filter(Boolean);
}

/** Merge structured ingredients + other_ingredients into one flat list */
function PreviewIngredients({ detail }: { detail: DSLDProductDetail }) {
  const otherNames = detail.other_ingredients ? parseOtherIngredients(detail.other_ingredients) : [];
  const totalCount = detail.ingredients.length + otherNames.length;

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
        Ingredients ({totalCount})
      </p>
      {totalCount > 0 ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {detail.ingredients.map((ing, i) => (
            <div key={`s-${i}`} className="flex items-baseline justify-between text-sm">
              <span className="text-text-body truncate mr-2">{ing.ingredient_name}</span>
              {ing.amount && (
                <span className="text-xs text-text-secondary shrink-0 font-mono">
                  {ing.amount} {ing.unit}
                </span>
              )}
            </div>
          ))}
          {otherNames.map((name, i) => (
            <div key={`o-${i}`} className="text-sm text-text-body truncate">{name}</div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">No ingredient data available</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
