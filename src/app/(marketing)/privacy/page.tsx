import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Policy Canary",
};

export default function PrivacyPage() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Privacy Policy
        </h1>
        <p className="text-text-secondary mb-8 text-sm">
          Effective: March 2026
        </p>
        <div className="prose prose-sm text-text-body space-y-6">
          <p>
            Policy Canary provides AI-powered regulatory intelligence for the
            food, supplement, and cosmetics industries. This policy explains what
            data we collect, how we use it, and your rights.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            1. What We Collect
          </h2>
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account information</strong> — your email address and name
              when you create an account
            </li>
            <li>
              <strong>Product profiles</strong> — the products you add for
              monitoring, including product names, types, ingredients, and
              categories
            </li>
            <li>
              <strong>Regulatory intelligence preferences</strong> — the
              sectors, topics, and product categories you choose to monitor
            </li>
            <li>
              <strong>Payment information</strong> — processed and stored
              entirely by Stripe; we do not store your card number or bank
              details
            </li>
            <li>
              <strong>Usage data</strong> — pages viewed, features used, and
              session information collected via server-side logging
            </li>
            <li>
              <strong>Email subscriber information</strong> — your email address
              when you sign up for the free weekly digest
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            2. How We Use Your Data
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Regulatory monitoring</strong> — matching FDA regulatory
              changes against your product profiles
            </li>
            <li>
              <strong>Personalized intelligence emails</strong> — delivering
              alerts and summaries tailored to your monitored products
            </li>
            <li>
              <strong>AI enrichment</strong> — analyzing regulatory documents
              using AI to extract relevance, affected product types, and impact
              assessments
            </li>
            <li>
              <strong>AI-powered search</strong> — enabling natural-language
              search across the regulatory intelligence database
            </li>
            <li>
              <strong>Weekly updates</strong> — sending digest emails
              summarizing the week&apos;s regulatory activity
            </li>
            <li>
              <strong>Analytics</strong> — understanding how the product is used
              so we can improve it
            </li>
            <li>
              <strong>Payment processing</strong> — managing subscriptions and
              billing through Stripe
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            3. Third-Party Service Providers
          </h2>
          <p>
            We use the following service providers to operate Policy Canary.
            Each processes data under their own privacy policies:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 pr-4 font-semibold">
                    Provider
                  </th>
                  <th className="text-left py-2 pr-4 font-semibold">
                    Purpose
                  </th>
                  <th className="text-left py-2 font-semibold">
                    Data Processed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                <tr>
                  <td className="py-2 pr-4">Supabase</td>
                  <td className="py-2 pr-4">Database & authentication</td>
                  <td className="py-2">
                    Account data, product profiles, regulatory data
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vercel</td>
                  <td className="py-2 pr-4">Hosting & deployment</td>
                  <td className="py-2">Request logs, IP addresses</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Google (Gemini)</td>
                  <td className="py-2 pr-4">
                    AI enrichment of regulatory documents
                  </td>
                  <td className="py-2">
                    Regulatory document text (public FDA data)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">OpenAI</td>
                  <td className="py-2 pr-4">
                    AI search &amp; embeddings
                  </td>
                  <td className="py-2">Search queries, regulatory text</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Anthropic</td>
                  <td className="py-2 pr-4">
                    AI-powered email personalization
                  </td>
                  <td className="py-2">
                    Subscriber product context, regulatory text
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Stripe</td>
                  <td className="py-2 pr-4">Payment processing</td>
                  <td className="py-2">
                    Payment details, billing information
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Resend</td>
                  <td className="py-2 pr-4">Email delivery</td>
                  <td className="py-2">Email addresses, email content</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Vultr</td>
                  <td className="py-2 pr-4">
                    Content automation server
                  </td>
                  <td className="py-2">Regulatory data for content generation</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>We do not sell your personal data to third parties.</strong>
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            4. Artificial Intelligence Disclosure
          </h2>
          <p>
            Policy Canary uses three AI providers to analyze and deliver
            regulatory intelligence:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google Gemini</strong> — processes publicly available FDA
              regulatory documents to extract structured data, impact
              assessments, and cross-references. No subscriber data is sent to
              Google.
            </li>
            <li>
              <strong>OpenAI</strong> — powers semantic search and generates
              embeddings for the regulatory intelligence database. Search
              queries are processed but not used for model training (API data
              usage policy).
            </li>
            <li>
              <strong>Anthropic (Claude)</strong> — personalizes intelligence
              emails based on subscriber product context. This means your
              product names, types, and categories may be sent to Anthropic to
              generate relevant summaries. Anthropic does not use API inputs to
              train models.
            </li>
          </ul>
          <p>
            All AI providers are used via their API services with data
            processing agreements. None of the providers use your data to train
            their models.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            5. Data Security
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All data is transmitted over HTTPS (TLS encryption in transit)</li>
            <li>Database encryption at rest via Supabase</li>
            <li>
              Row-level security (RLS) policies ensure subscribers can only
              access their own data
            </li>
            <li>
              Tenant isolation — your product profiles and preferences are not
              visible to other subscribers
            </li>
            <li>
              Payment data is handled entirely by Stripe, which is PCI DSS
              Level 1 certified
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            6. Data Retention
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Active accounts</strong> — your data is retained for as
              long as your account is active
            </li>
            <li>
              <strong>After cancellation</strong> — product profiles and account
              data are retained for 60 days after cancellation, then permanently
              deleted
            </li>
            <li>
              <strong>Email subscribers</strong> — your email address is
              retained until you unsubscribe
            </li>
            <li>
              <strong>Regulatory data</strong> — publicly sourced regulatory
              information is retained indefinitely as part of the intelligence
              database
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            7. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Access</strong> — request a copy of the personal data we
              hold about you
            </li>
            <li>
              <strong>Deletion</strong> — request deletion of your account and
              associated data
            </li>
            <li>
              <strong>Export</strong> — export your product profiles and account
              data
            </li>
            <li>
              <strong>Correction</strong> — update or correct your personal
              information
            </li>
            <li>
              <strong>Unsubscribe</strong> — opt out of marketing and digest
              emails at any time using the unsubscribe link in any email
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:team@policycanary.io"
              className="text-amber underline"
            >
              team@policycanary.io
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            8. California Privacy Rights (CCPA)
          </h2>
          <p>
            If you are a California resident, you have additional rights under
            the California Consumer Privacy Act (CCPA):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Right to know</strong> — you can request what personal
              information we collect, use, and disclose
            </li>
            <li>
              <strong>Right to delete</strong> — you can request deletion of
              your personal information
            </li>
            <li>
              <strong>Right to opt out of sale</strong> — we do not sell your
              personal information. There is nothing to opt out of.
            </li>
            <li>
              <strong>Non-discrimination</strong> — we will not discriminate
              against you for exercising your CCPA rights
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            9. Children&apos;s Privacy
          </h2>
          <p>
            Policy Canary is a business service not directed at children under
            13. We do not knowingly collect personal information from children.
            If you believe a child has provided us with personal data, contact
            us at{" "}
            <a
              href="mailto:team@policycanary.io"
              className="text-amber underline"
            >
              team@policycanary.io
            </a>{" "}
            and we will delete it.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            10. Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. If we make
            material changes, we will notify subscribers by email before the
            changes take effect. The &ldquo;Effective&rdquo; date at the top of
            this page indicates when the policy was last revised.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            11. Contact
          </h2>
          <p>
            If you have questions about this privacy policy or your data,
            contact us:
          </p>
          <ul className="list-none pl-0 space-y-1">
            <li>
              Email:{" "}
              <a
                href="mailto:team@policycanary.io"
                className="text-amber underline"
              >
                team@policycanary.io
              </a>
            </li>
            <li>
              Mail: Policy Canary, 9901 Brodie Lane Ste 160 #1323, Austin, TX
              78748
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
