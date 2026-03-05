"use client";

import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import type { ParsedLabel } from "@/lib/products/types";
import Spinner from "@/components/ui/Spinner";

// Re-export so AddProductPanel can import from here or types.ts
export type { ParsedLabel };

interface LabelUploadProps {
  onParsed: (result: ParsedLabel) => void;
  onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LabelUpload({ onParsed, onError }: LabelUploadProps) {
  const [tab, setTab] = useState<"upload" | "manual">("upload");

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-0.5 bg-slate-100 rounded-lg">
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            tab === "upload"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Upload Photos
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            tab === "manual"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Type Manually
        </button>
      </div>

      {tab === "upload" ? (
        <UploadTab onParsed={onParsed} onError={onError} />
      ) : (
        <ManualTab onParsed={onParsed} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Tab — drag-and-drop + file picker + vision parsing (multi-image)
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

function UploadTab({
  onParsed,
  onError,
}: {
  onParsed: (result: ParsedLabel) => void;
  onError: (message: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback((newFiles: File[]) => {
    const validated: File[] = [];
    for (const f of newFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        onError("Please upload JPEG, PNG, or WebP images.");
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        onError("File too large. Maximum size is 5MB per image.");
        return;
      }
      validated.push(f);
    }

    setFiles((prev) => {
      const combined = [...prev, ...validated].slice(0, MAX_IMAGES);
      return combined;
    });
    setPreviews((prev) => {
      const newPreviews = validated.map((f) => URL.createObjectURL(f));
      return [...prev, ...newPreviews].slice(0, MAX_IMAGES);
    });
  }, [onError]);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) addFiles(dropped);
    },
    [addFiles]
  );

  const handleRemove = useCallback((index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleScan = useCallback(async () => {
    if (files.length === 0) return;
    setScanning(true);

    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append("images", f);
      }

      const res = await fetch("/api/products/parse-label", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        onError(json.error?.message ?? "Failed to scan labels.");
        return;
      }

      onParsed(json.data as ParsedLabel);
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [files, onParsed, onError]);

  const handleClearAll = useCallback(() => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = "";
  }, [previews]);

  const canAddMore = files.length < MAX_IMAGES;

  return (
    <div>
      {files.length === 0 ? (
        /* Empty state — full drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-amber bg-amber/5" : "border-border hover:border-amber/40 hover:bg-slate-50"}`}
        >
          <div className="text-text-secondary">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            <p className="text-sm font-medium">
              Drop photos of the product label
            </p>
            <p className="text-xs mt-1">Front, back, ingredient panel — up to {MAX_IMAGES} images (JPEG, PNG, WebP)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (selected.length > 0) addFiles(selected);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview grid */}
          <div className="grid grid-cols-3 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Label photo ${i + 1}`}
                  className="w-full h-full object-cover bg-slate-50"
                />
                <button
                  onClick={() => handleRemove(i)}
                  disabled={scanning}
                  className="absolute top-1 right-1 p-0.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors disabled:opacity-50"
                  title="Remove image"
                >
                  <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add more button */}
            {canAddMore && (
              <button
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                disabled={scanning}
                className={`border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center text-text-secondary transition-colors disabled:opacity-50 ${dragOver ? "border-amber bg-amber/5" : "border-border hover:border-amber/40 hover:bg-slate-50"}`}
              >
                <svg className="w-5 h-5 mb-0.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-[10px]">Add photo</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-text-secondary">
            {files.length} of {MAX_IMAGES} photos added
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (selected.length > 0) addFiles(selected);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              disabled={scanning}
              className="px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Clear all
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber rounded-lg hover:bg-amber-action transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <Spinner />
                  Scanning {files.length > 1 ? "labels" : "label"}...
                </>
              ) : (
                `Scan ${files.length > 1 ? "Labels" : "Label"}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual Tab — name, brand, ingredients textarea
// ---------------------------------------------------------------------------

function ManualTab({ onParsed }: { onParsed: (result: ParsedLabel) => void }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [ingredients, setIngredients] = useState("");

  const handleSubmit = useCallback(() => {
    // Parse comma-separated ingredients into structured format
    const parsed = ingredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ name: s }));

    onParsed({
      imageUrls: [],
      imagePaths: [],
      isLabelScan: false,
      ingredients: parsed,
      productName: name.trim() || null,
      brand: brand.trim() || null,
    });
  }, [name, brand, ingredients, onParsed]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Product Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marine Collagen Powder"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Brand
        </label>
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="e.g. OceanPure"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Ingredients
        </label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Paste your ingredient list here, separated by commas..."
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60 resize-none"
        />
        <p className="text-[11px] text-text-secondary mt-1">
          We&apos;ll match these against FDA substance databases for monitoring.
        </p>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-amber rounded-lg hover:bg-amber-action transition-colors disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
