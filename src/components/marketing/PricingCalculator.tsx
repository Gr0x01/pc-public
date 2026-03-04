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
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="brutalist-card p-6 md:p-8 bg-surface">
        {/* ── Slider section ─────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-end justify-between mb-4 border-b-4 border-text-primary pb-2">
            <h2 className="text-xl font-bold font-mono text-text-primary uppercase">
              Product Volume
            </h2>
            <span className="font-serif text-3xl font-bold text-text-primary tabular-nums leading-none">
              {isEnterprise ? "100+" : productCount}
            </span>
          </div>

          <label htmlFor="product-slider" className="sr-only">
            Number of products to monitor
          </label>
          <div className="relative pt-2 pb-6">
            <input
              id="product-slider"
              type="range"
              min={BASE_PRODUCTS}
              max={MAX_PRODUCTS}
              step={1}
              value={productCount}
              onChange={(e) => setProductCount(Number(e.target.value))}
              className="brutalist-slider"
              aria-label="Number of products to monitor"
              aria-valuenow={productCount}
              aria-valuetext={
                isEnterprise
                  ? "100 or more products, contact us"
                  : `${productCount} products at $${monthlyPrice} per month`
              }
              style={{
                background: `linear-gradient(to right, var(--color-text-primary) ${percentage}%, transparent ${percentage}%)`,
              }}
            />
            {/* tick marks */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between px-2">
              {BREAKPOINTS.map((bp) => (
                <div key={bp} className="flex flex-col items-center group">
                  <div className="w-1 h-2 bg-text-primary mb-1"></div>
                  <button
                    type="button"
                    onClick={() => setProductCount(bp)}
                    className={`text-xs font-mono font-bold ${
                      productCount === bp
                        ? "text-amber-action bg-amber-muted px-1"
                        : "text-text-primary"
                    }`}
                    aria-label={`Set to ${bp} products`}
                  >
                    {bp === MAX_PRODUCTS ? "100+" : bp}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two big numbers ────────────────────────── */}
        <div aria-live="polite" aria-atomic="true" className="min-h-[160px]">
          <AnimatePresence mode="wait">
            {isEnterprise ? (
              <motion.div
                key="enterprise"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="brutalist-terminal text-center mb-6"
              >
                <p className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  100+ PRODUCTS
                </p>
                <p className="text-sm opacity-80 max-w-sm mx-auto">
                  AT THIS SCALE, WE CONFIGURE MONITORING AROUND YOUR FULL PORTFOLIO.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="numbers"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
              >
                {/* Price */}
                <div className="border-4 border-text-primary p-4 flex flex-col justify-center items-center bg-amber text-text-primary">
                  <p className="font-mono text-sm uppercase tracking-widest mb-2 font-bold border-b-2 border-text-primary/30 pb-1">
                    System Cost
                  </p>
                  <p className="text-5xl md:text-6xl font-serif font-bold tracking-tight tabular-nums">
                    ${monthlyPrice}
                  </p>
                  <p className="text-xs font-mono font-bold mt-2">PER MONTH</p>
                </div>

                {/* Product count */}
                <div className="border-4 border-text-primary p-4 flex flex-col justify-center items-center bg-surface">
                  <p className="font-mono text-sm uppercase tracking-widest mb-2 font-bold border-b-2 border-border-strong pb-1">
                    Active Monitors
                  </p>
                  <p className="text-5xl md:text-6xl font-serif font-bold tracking-tight tabular-nums">
                    {productCount}
                  </p>
                  <p className="text-xs font-mono font-bold mt-2 text-text-secondary">
                    {productCount === BASE_PRODUCTS
                      ? "BASE TIER"
                      : `${BASE_PRODUCTS} INCLUDED + ${extraProducts} EXTRA`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom bar: total + CTA ────────────────── */}
        <div className="border-t-4 border-text-primary pt-6">
          <AnimatePresence mode="wait">
            {isEnterprise ? (
              <motion.div
                key="enterprise-cta"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <p className="font-mono text-sm font-bold">
                  CUSTOM CONFIGURATION REQUIRED
                </p>
                <a
                  href="mailto:hello@policycanary.io?subject=Portfolio%20monitoring%20(100%2B%20products)"
                  className="w-full sm:w-auto bg-text-primary text-surface font-mono font-bold py-4 px-8 border-4 border-transparent hover:bg-surface hover:text-text-primary hover:border-text-primary transition-colors"
                >
                  INITIALIZE CONTACT
                </a>
              </motion.div>
            ) : (
              <motion.div
                key="standard-cta"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="font-mono text-sm font-bold">
                    <p className="mb-1 text-lg">
                      TOTAL: ${monthlyPrice}/MO
                    </p>
                    <p className="text-text-secondary">
                      {productCount === BASE_PRODUCTS
                        ? "5 PRODUCTS INCLUDED"
                        : `$${BASE_PRICE} BASE + (${extraProducts} × $${PER_PRODUCT})`}
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full sm:w-auto bg-amber-action text-white font-mono font-bold py-4 px-8 border-4 border-text-primary shadow-[4px_4px_0px_var(--color-text-primary)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_var(--color-text-primary)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2
                        className="h-5 w-5 animate-spin mx-auto"
                        aria-hidden="true"
                      />
                    ) : (
                      "START 14-DAY TRIAL //"
                    )}
                  </button>
                </div>
                {error && (
                  <p
                    role="alert"
                    className="text-sm font-mono font-bold text-urgent mt-4 text-center sm:text-left bg-urgent-muted p-2 border-2 border-urgent"
                  >
                    ERR: {error}
                  </p>
                )}
                <p className="text-xs font-mono font-bold text-text-secondary mt-4 text-center sm:text-left">
                  {">"} FULL ACCESS INCLUDED. NO DATA CAPS. CANCEL ANYTIME.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
