"use client";

import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useInView,
} from "framer-motion";
import { Loader2 } from "lucide-react";

const BREAKPOINTS = [5, 25, 50, 100] as const;
const BASE_PRICE = 99;
const BASE_PRODUCTS = 5;
const PER_PRODUCT = 6;
const MAX_PRODUCTS = 100;

export default function PricingCalculator() {
  const [productCount, setProductCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const isEnterprise = productCount >= MAX_PRODUCTS;
  const extraProducts = Math.max(0, productCount - BASE_PRODUCTS);
  const monthlyPrice = BASE_PRICE + extraProducts * PER_PRODUCT;
  const percentage =
    ((productCount - BASE_PRODUCTS) / (MAX_PRODUCTS - BASE_PRODUCTS)) * 100;

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login?next=checkout";
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="soft-card p-8 md:p-10 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        {/* ── Slider section ─────────────────────────── */}
        <div className="mb-12 relative z-10">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              How many products?
            </h2>
            <span className="font-sans text-4xl font-bold text-slate-900 tabular-nums leading-none">
              {isEnterprise ? "100+" : productCount}
            </span>
          </div>

          <label htmlFor="product-slider" className="sr-only">
            Number of products to monitor
          </label>
          <div className="relative pt-2 pb-8">
            <input
              id="product-slider"
              type="range"
              min={BASE_PRODUCTS}
              max={MAX_PRODUCTS}
              step={1}
              value={productCount}
              onChange={(e) => setProductCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber"
              aria-label="Number of products to monitor"
              aria-valuenow={productCount}
              aria-valuetext={
                isEnterprise
                  ? "100 or more products, contact us"
                  : `${productCount} products at $${monthlyPrice} per month`
              }
              style={{
                background: `linear-gradient(to right, var(--color-amber) ${percentage}%, #f1f5f9 ${percentage}%)`,
              }}
            />
            {/* tick marks */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between px-1">
              {BREAKPOINTS.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  onClick={() => setProductCount(bp)}
                  className={`text-xs font-medium transition-colors ${
                    productCount === bp
                      ? "text-amber-text font-bold"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  aria-label={`Set to ${bp} products`}
                >
                  {bp === MAX_PRODUCTS ? "100+" : bp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two big numbers ────────────────────────── */}
        <div aria-live="polite" aria-atomic="true" className="min-h-[140px] relative z-10">
          <AnimatePresence mode="wait">
            {isEnterprise ? (
              <motion.div
                key="enterprise"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-center py-4"
              >
                <p className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Enterprise Portfolio
                </p>
                <p className="text-slate-500 max-w-sm mx-auto">
                  At this scale, we configure monitoring around your full portfolio structure.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="numbers"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
              >
                {/* Price */}
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Monthly Cost
                  </p>
                  <p className="text-4xl md:text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                    ${monthlyPrice}
                  </p>
                </div>

                {/* Product count */}
                <div className="p-6 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Included Products
                  </p>
                  <p className="text-4xl md:text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {productCount}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 mt-2 uppercase tracking-wide">
                    {productCount === BASE_PRODUCTS
                      ? "Base Plan"
                      : `5 included + ${extraProducts} extra`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom bar: total + CTA ────────────────── */}
        <div className="border-t border-slate-100 pt-8 mt-2 relative z-10">
          <AnimatePresence mode="wait">
            {isEnterprise ? (
              <motion.div
                key="enterprise-cta"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <p className="font-medium text-slate-600">
                  Custom configuration required
                </p>
                <a
                  href="mailto:hello@policycanary.io?subject=Portfolio%20monitoring%20(100%2B%20products)"
                  className="w-full sm:w-auto bg-slate-900 text-white font-medium py-3 px-6 rounded-lg hover:bg-slate-800 transition-colors shadow-sm hover:shadow text-center"
                >
                  Contact Sales
                </a>
              </motion.div>
            ) : (
              <motion.div
                key="standard-cta"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-900 mb-1">
                      Total: ${monthlyPrice}/mo
                    </p>
                    <p className="text-sm text-slate-500">
                      {productCount === BASE_PRODUCTS
                        ? "Includes 5 products"
                        : `$${BASE_PRICE} base + (${extraProducts} × $${PER_PRODUCT})`}
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full sm:w-auto bg-amber text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-amber/20 hover:bg-amber-action hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                  >
                    {loading ? (
                      <Loader2
                        className="h-5 w-5 animate-spin mx-auto"
                        aria-hidden="true"
                      />
                    ) : (
                      "Start 14-Day Trial"
                    )}
                  </button>
                </div>
                {error && (
                  <p
                    role="alert"
                    className="text-sm text-red-600 font-medium mt-4 text-center sm:text-left bg-red-50 p-3 rounded-lg border border-red-100"
                  >
                    {error}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-5 text-center sm:text-left">
                  Full access included. No data caps. Cancel anytime.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
