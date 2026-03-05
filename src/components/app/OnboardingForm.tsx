"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const ROLE_OPTIONS = [
  "Regulatory Affairs",
  "Quality Assurance",
  "R&D / Product Development",
  "Operations / Manufacturing",
  "Executive / Founder",
  "Legal / Compliance",
  "Other",
] as const;

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber/50 placeholder:text-text-secondary/60 disabled:opacity-60";

export default function OnboardingForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [feiNumber, setFeiNumber] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Close role dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0 && companyName.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
          role: role || null,
          fei_number: feiNumber.replace(/\D/g, "") || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Something went wrong.");
        return;
      }

      router.push("/app/products");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center flex-1 px-4 py-12">
      <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-text-primary">
            Let&apos;s set up your regulatory watch.
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
            Once we know your company, you&apos;ll add your products — and
            we&apos;ll start monitoring every FDA change that affects them.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-border rounded p-6 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className={inputClass}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className={inputClass}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Supplements Inc."
              className={inputClass}
              disabled={submitting}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Role
            </label>
            <div ref={roleRef} className="relative">
              <button
                type="button"
                onClick={() => !submitting && setRoleOpen((p) => !p)}
                disabled={submitting}
                className={`${inputClass} text-left flex items-center justify-between ${
                  role ? "text-text-primary" : "text-text-secondary/60"
                }`}
              >
                <span className="truncate">{role || "Select your role (optional)"}</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  className={`shrink-0 ml-2 transition-transform duration-150 ${roleOpen ? "rotate-180" : ""}`}
                >
                  <path
                    d="M2.5 3.75L5 6.25L7.5 3.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {roleOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-20 py-1">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setRoleOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        role === r
                          ? "text-text-primary font-semibold bg-surface-muted"
                          : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FEI Number */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              FEI Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={feiNumber}
              onChange={(e) => setFeiNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="3014821"
              maxLength={10}
              className={inputClass}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-text-secondary">
              7-10 digit FDA Facility Establishment Identifier. Found on your
              FDA registration confirmation. Optional — you can add this later.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full py-2.5 px-4 text-sm font-medium rounded bg-amber text-white hover:bg-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Continue to Add Products"}
          </button>
        </form>
      </div>
    </div>
  );
}
