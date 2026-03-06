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

interface SettingsFormProps {
  initialData: {
    first_name: string;
    last_name: string;
    company_name: string;
    role: string;
    fei_number: string;
    email_opted_out: boolean;
  };
}

export default function SettingsForm({ initialData }: SettingsFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialData.first_name);
  const [lastName, setLastName] = useState(initialData.last_name);
  const [companyName, setCompanyName] = useState(initialData.company_name);
  const [role, setRole] = useState(initialData.role);
  const [feiNumber, setFeiNumber] = useState(initialData.fei_number);
  const [emailOptedOut, setEmailOptedOut] = useState(initialData.email_opted_out);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const canSave =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    companyName.trim().length > 0;

  const hasChanges =
    firstName !== initialData.first_name ||
    lastName !== initialData.last_name ||
    companyName !== initialData.company_name ||
    role !== initialData.role ||
    feiNumber !== initialData.fei_number;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving || !hasChanges) return;

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
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

      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteText !== "DELETE" || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/settings", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error?.message ?? "Failed to delete account.");
        return;
      }

      window.location.href = "/";
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Profile form */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-border rounded p-5 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-6"
      >
        <h2 className="text-sm font-medium text-text-primary">Profile</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              disabled={saving}
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
              className={inputClass}
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Role
          </label>
          <div ref={roleRef} className="relative">
            <button
              type="button"
              onClick={() => !saving && setRoleOpen((p) => !p)}
              disabled={saving}
              className={`${inputClass} text-left flex items-center justify-between ${
                role ? "text-text-primary" : "text-text-secondary/60"
              }`}
            >
              <span className="truncate">
                {role || "Select your role (optional)"}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
                className={`shrink-0 ml-2 transition-transform duration-150 ${
                  roleOpen ? "rotate-180" : ""
                }`}
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

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            FEI Number
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={feiNumber}
            onChange={(e) => setFeiNumber(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
            className={inputClass}
            disabled={saving}
          />
          <p className="mt-1 text-xs text-text-secondary">
            7-10 digit FDA Facility Establishment Identifier.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSave || saving || !hasChanges}
          className="w-full py-2.5 px-4 text-sm font-medium rounded bg-amber text-white hover:bg-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
      </form>

      {/* Notifications */}
      <div className="bg-white border border-border rounded p-5 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-medium text-text-primary mb-3">Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Email notifications</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {emailOptedOut
                ? "You've unsubscribed from product briefings and alerts."
                : "Receive weekly briefings and urgent regulatory alerts."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!emailOptedOut}
            disabled={togglingEmail}
            onClick={async () => {
              setTogglingEmail(true);
              try {
                const res = await fetch("/api/settings", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email_opted_out: !emailOptedOut }),
                });
                if (res.ok) {
                  setEmailOptedOut(!emailOptedOut);
                  router.refresh();
                }
              } catch {
                // silent — toggle stays in current state
              } finally {
                setTogglingEmail(false);
              }
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber/30 disabled:opacity-50 ${
              !emailOptedOut ? "bg-amber" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                !emailOptedOut ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white border border-red-200 rounded p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-medium text-red-600 mb-1">Danger Zone</h2>
        <p className="text-xs text-text-secondary mb-4">
          Permanently delete your account, all monitored products, and match
          history. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm text-text-primary">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm:
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className={`${inputClass} border-red-300 focus:ring-red-200 focus:border-red-400`}
              disabled={deleting}
              autoFocus
            />
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteText !== "DELETE" || deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Permanently Delete Account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText("");
                  setDeleteError("");
                }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
