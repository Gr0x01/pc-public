"use client";

import { useState, useCallback } from "react";
import type { DSLDSearchResult, DSLDProductDetail, ParsedLabel } from "@/lib/products/types";
import DSLDAutocomplete from "./DSLDAutocomplete";
import LabelUpload from "./LabelUpload";
import Spinner from "@/components/ui/Spinner";

type ProductType = "supplement" | "food" | "cosmetic" | "drug" | "medical_device" | "biologic" | "tobacco" | "veterinary";
type Step = "pick_type" | "dsld_search" | "label_entry" | "ingredient_preview" | "preview" | "submitting";

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

  // Vision / manual parsed data
  const [parsedLabel, setParsedLabel] = useState<ParsedLabel | null>(null);
  const [editableIngredients, setEditableIngredients] = useState<{ name: string; amount?: string; unit?: string }[]>([]);
  const [editableName, setEditableName] = useState("");
  const [editableBrand, setEditableBrand] = useState("");

  const handlePickType = useCallback((type: ProductType) => {
    setProductType(type);
    setError(null);
    if (type === "supplement") {
      setStep("dsld_search");
    } else {
      setStep("label_entry");
    }
  }, []);

  const handleBackToType = useCallback(() => {
    setStep("pick_type");
    setProductType(null);
    setSelected(null);
    setDetail(null);
    setParsedLabel(null);
    setEditableIngredients([]);
    setEditableName("");
    setEditableBrand("");
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

  // Label parsed (from vision or manual entry in LabelUpload)
  const handleLabelParsed = useCallback((result: ParsedLabel) => {
    setParsedLabel(result);
    setEditableIngredients(result.ingredients);
    setEditableName(result.productName ?? "");
    setEditableBrand(result.brand ?? "");
    setError(null);
    setStep("ingredient_preview");
  }, []);

  // DSLD fallback → switch to label entry
  const handleDSLDFallback = useCallback(() => {
    setStep("label_entry");
    setSelected(null);
    setError(null);
  }, []);

  const handleBackFromPreview = useCallback(() => {
    if (detail) {
      // DSLD preview → back to search
      setStep("dsld_search");
      setSelected(null);
      setDetail(null);
    } else {
      // Ingredient preview → back to label entry
      setStep("label_entry");
      setParsedLabel(null);
    }
    setError(null);
  }, [detail]);

  // Remove ingredient from editable list
  const handleRemoveIngredient = useCallback((index: number) => {
    setEditableIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Submit (DSLD, label_scan, or manual)
  const handleSubmit = useCallback(async () => {
    if (!productType) return;
    setStep("submitting");
    setError(null);

    let body: Record<string, unknown>;

    if (detail) {
      // DSLD path
      body = {
        name: detail.product_name,
        brand: detail.brand_name,
        product_type: productType,
        data_source: "dsld",
        external_id: String(detail.dsld_id),
      };
    } else if (parsedLabel?.isLabelScan) {
      // Vision scan path — store storage paths (not signed URLs) for persistence
      const paths = parsedLabel.imagePaths.filter(Boolean);
      body = {
        name: editableName.trim(),
        brand: editableBrand.trim() || null,
        product_type: productType,
        data_source: "label_scan",
        image_paths: paths.length > 0 ? paths : null,
        parsed_ingredients: editableIngredients,
      };
    } else {
      // Manual path (from LabelUpload manual tab)
      body = {
        name: editableName.trim(),
        brand: editableBrand.trim() || null,
        product_type: productType,
        data_source: "manual",
        parsed_ingredients: editableIngredients.length > 0 ? editableIngredients : undefined,
        raw_ingredients_text: editableIngredients.length > 0
          ? editableIngredients.map((i) => i.name).join(", ")
          : null,
      };
    }

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
        setStep(detail ? "preview" : "ingredient_preview");
        return;
      }

      onProductAdded({
        id: json.data.id,
        name: body.name as string,
        brand: body.brand as string | null | undefined,
        productType,
      });
    } catch {
      setError("Network error. Please try again.");
      setStep(detail ? "preview" : "ingredient_preview");
    }
  }, [productType, detail, parsedLabel, editableName, editableBrand, editableIngredients, onProductAdded]);

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
            {PRODUCT_TYPES.map((t) => (
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

      {/* DSLD search step (supplements) */}
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
          <button
            onClick={handleDSLDFallback}
            className="mt-3 text-sm text-amber hover:text-amber-action transition-colors font-medium"
          >
            Can&apos;t find your product? Add manually
          </button>
        </div>
      )}

      {/* Label entry step (upload or type) — for non-DSLD products and DSLD fallback */}
      {step === "label_entry" && (
        <LabelUpload
          onParsed={handleLabelParsed}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* Ingredient preview + edit step (from vision or manual parse) */}
      {(step === "ingredient_preview" || (step === "submitting" && !detail)) && !detail && (
        <div>
          {/* Name + Brand (editable) */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Product Name *</label>
              <input
                type="text"
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                placeholder="Product name"
                disabled={step === "submitting"}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Brand</label>
              <input
                type="text"
                value={editableBrand}
                onChange={(e) => setEditableBrand(e.target.value)}
                placeholder="Brand name"
                disabled={step === "submitting"}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Ingredient list */}
          {editableIngredients.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden mb-4">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-border">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Ingredients ({editableIngredients.length})
                </p>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {editableIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 text-sm group">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-text-body truncate">{ing.name}</span>
                      {ing.amount && (
                        <span className="text-xs text-text-secondary shrink-0 font-mono">
                          {ing.amount} {ing.unit}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveIngredient(i)}
                      disabled={step === "submitting"}
                      className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-red-500 transition-all disabled:opacity-0"
                      title="Remove ingredient"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedLabel?.isLabelScan && (
            <p className="text-[11px] text-text-secondary mb-4">
              Extracted via label scan. Review and remove any incorrect ingredients before saving.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBackFromPreview}
              disabled={step === "submitting"}
              className="px-4 py-2 text-sm text-text-secondary border border-border rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={step === "submitting" || !editableName.trim()}
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

      {/* DSLD preview step */}
      {(step === "preview" || (step === "submitting" && detail)) && detail && (
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
