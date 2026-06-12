# Policy Canary

**FDA regulatory monitoring for product companies.** Policy Canary watches every change across the FDA's regulated sectors — recalls, warning letters, rule changes, import alerts, guidance — and tells a company which of *their specific products* are affected, down to the ingredient, with the deadlines that matter.

Live: **[policycanary.io](https://policycanary.io)**

This is a **public, sanitized mirror** of the private production repository, published as a code sample. It preserves the real commit history and the full application architecture. See [What's redacted](#whats-redacted) below for what was removed.

---

## What it does

1. **Ingest** — fetchers pull from FDA sources (Federal Register, enforcement reports / recalls, warning letters, RSS) on a schedule.
2. **Enrich** — each regulatory item runs through a multi-model LLM pipeline that extracts a structured signal: affected ingredients, affected product categories (controlled vocabulary across food, supplements, cosmetics, pharma, devices, biologics, tobacco, veterinary), action type, deadlines, citations, and a confidence score — all validated against a Zod schema.
3. **Cross-reference** — enriched signals are matched against a substance database and a company's own product list to decide who is actually affected.
4. **Notify** — affected customers get a tailored briefing email; the dashboard surfaces the live feed and per-product impact.

A programmatic-SEO surface (ingredient / enforcement / regulation intelligence pages) and a blog sit in front of the product.

## Architecture

| Layer | Tech |
|-------|------|
| App | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 |
| Data | Supabase (Postgres + RLS), pgvector embeddings |
| LLM | Vercel AI SDK — Google Gemini (enrichment + cross-reference), Anthropic Claude (email/editorial writing + AI search), OpenAI (embeddings) |
| Background jobs | Inngest (scheduled ingest, enrichment, weekly sends) |
| Payments | Stripe (checkout, webhooks, billing portal) |
| Email | Resend + React Email templates |
| Monitoring | Sentry |
| Hosting | Vercel |

### Repo layout

```
src/
├── app/                  # Next.js routes — marketing, dashboard, API
├── components/           # UI (marketing, app, intelligence, shared)
├── lib/                  # ai/ supabase/ stripe/ email/ inngest/ products/ intelligence/
├── pipeline/
│   ├── fetchers/         # FDA source fetchers
│   └── enrichment/       # LLM enrichment: processor, cross-reference, embeddings, prompts
└── types/
scripts/
├── pipeline/             # CLI entry points for fetch / enrich / classify / snapshot
└── bootstrap/            # one-time substance-DB loaders (DSLD, GSRS)
supabase/migrations/      # schema
emails/                   # React Email previews
```

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # fill in real values
npm run dev
```

Pipeline tasks are exposed as npm scripts, e.g.:

```bash
npm run pipeline:enrich-test       # enrich a handful of items
npm run pipeline:rss-poll          # poll FDA RSS
npm run email:dev                  # preview email templates
```

Requires Supabase, and API keys for Google / OpenAI / Anthropic, Stripe, Resend, and Inngest. See `.env.local.example` for the full list.

## What's redacted

This mirror is sanitized for public release. Removed from the entire history:

- **The enrichment system prompt** — the production regulatory-analyst instructions, anti-hallucination rules, and confidence-scoring rubric in `src/pipeline/enrichment/prompts.ts` are redacted. The output schema, controlled vocabularies, and prompt-assembly scaffolding remain so the pipeline is fully readable.
- **Internal docs & tooling** — the project memory bank, research notes, and AI-assistant configuration.
- **Growth & ops scripts** — outreach, content-agent, and CRM/analytics tooling.

No secrets are, or ever were, committed — only `.env.local.example` placeholders.

## Author

Built solo by **Rashaad Baten** — design, product, and engineering. [rbaten.com](https://rbaten.com)
