import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Policy Canary",
};

export default function TermsPage() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Terms of Service
        </h1>
        <p className="text-text-secondary mb-8 text-sm">
          Effective: March 2026
        </p>
        <div className="prose prose-sm text-text-body space-y-6">
          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            1. Agreement to Terms
          </h2>
          <p>
            By accessing or using Policy Canary, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not use the
            service.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            2. Service Description
          </h2>
          <p>
            Policy Canary is an AI-powered regulatory monitoring service for the
            food, supplement, and cosmetics industries. We collect publicly
            available FDA regulatory data, enrich it using artificial
            intelligence, and match it against your product profiles to deliver
            relevant intelligence alerts and summaries.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            3. Not Legal Advice
          </h2>
          <p>
            <strong>
              Policy Canary provides regulatory intelligence only. It does not
              provide legal, regulatory, or compliance advice.
            </strong>
          </p>
          <p>
            Policy Canary is not a law firm and is not a substitute for
            qualified legal or regulatory counsel. The information delivered
            through our service — including alerts, summaries, impact
            assessments, and AI-generated analysis — is intended to help you
            stay informed about regulatory activity, not to tell you what to do
            about it.
          </p>
          <p>
            <strong>
              The absence of an alert does not mean a regulatory change does not
              affect your products.
            </strong>{" "}
            Our matching algorithms and AI analysis may not capture every
            relevant regulatory action. You should always consult qualified
            regulatory and legal professionals before making compliance
            decisions.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            4. Accounts
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Each subscriber account is for a single organization or individual
            </li>
            <li>
              You are responsible for the accuracy of your product profiles —
              the quality of your intelligence depends on the data you provide
            </li>
            <li>
              Authentication is handled via magic link email — you are
              responsible for securing access to the email address associated
              with your account
            </li>
            <li>
              You must not share account credentials or access with
              unauthorized users
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            5. Subscriptions &amp; Billing
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Paid subscriptions are billed monthly through Stripe
            </li>
            <li>
              New paid subscriptions include a 14-day free trial
            </li>
            <li>
              The base Monitor plan includes monitoring for up to 5 products,
              with additional products available at $10 per product per month
            </li>
            <li>
              If your subscription lapses, your account will be downgraded to
              the free tier (1 monitored product)
            </li>
            <li>
              You can cancel your subscription at any time through the Stripe
              billing portal — cancellation takes effect at the end of your
              current billing period
            </li>
            <li>
              Refunds are not provided for partial billing periods
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            6. Intellectual Property
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Your data</strong> — you retain all rights to the product
              profile data you provide to Policy Canary
            </li>
            <li>
              <strong>Our platform</strong> — Policy Canary retains all rights
              to the platform, algorithms, AI enrichment processes, matching
              engine, and user interface
            </li>
            <li>
              <strong>Regulatory source data</strong> — the underlying FDA
              regulatory data is public domain information from the U.S.
              government
            </li>
            <li>
              <strong>Delivered intelligence</strong> — you are granted a
              non-exclusive, non-transferable license to use intelligence
              delivered to you for your internal business purposes
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            7. AI-Generated Content
          </h2>
          <p>
            Regulatory analysis, impact assessments, summaries, and product
            matching delivered through Policy Canary are generated using
            artificial intelligence. This means:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              AI-generated analysis may contain errors, omissions, or
              inaccuracies
            </li>
            <li>
              All AI output is provided &ldquo;as-is&rdquo; with no warranty of
              accuracy, completeness, or fitness for any particular purpose
            </li>
            <li>
              You must independently verify any regulatory information before
              making compliance decisions
            </li>
            <li>
              Product matching may miss relevant connections or flag items that
              are not actually relevant to your products
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            8. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Resell, redistribute, or sublicense access to Policy Canary or its
              data
            </li>
            <li>
              Use automated tools to scrape, crawl, or extract data from the
              service
            </li>
            <li>
              Reverse engineer, decompile, or attempt to extract the source code
              of the platform
            </li>
            <li>
              Represent AI-generated analysis from Policy Canary as professional
              legal, regulatory, or compliance advice
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            9. Data &amp; Termination
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Your product profiles are available for export for 60 days after
              account cancellation
            </li>
            <li>
              After the 60-day retention period, your account data and product
              profiles are permanently deleted
            </li>
            <li>
              Policy Canary may terminate or suspend your account for violation
              of these terms, including misuse of the service
            </li>
            <li>
              You may delete your account at any time by contacting us at{" "}
              <a
                href="mailto:team@policycanary.io"
                className="text-amber underline"
              >
                team@policycanary.io
              </a>
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            10. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Policy Canary&apos;s total
            liability for any claims arising from your use of the service is
            limited to the fees you paid to Policy Canary in the 12 months
            preceding the claim.
          </p>
          <p>
            Policy Canary is not liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to
            loss of profits, data, or business opportunities — regardless of
            whether we were advised of the possibility of such damages.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            11. Indemnification
          </h2>
          <p>
            You agree to indemnify and hold harmless Policy Canary from any
            claims, damages, or expenses arising from compliance decisions you
            make based on information provided through the service. Policy
            Canary provides intelligence to inform your decision-making — the
            decisions and their consequences are yours.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            12. Governing Law
          </h2>
          <p>
            These terms are governed by and construed in accordance with the
            laws of the State of Texas, without regard to conflict of law
            principles. Any disputes arising from these terms or your use of the
            service will be resolved in the courts of the State of Texas.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            13. Changes to Terms
          </h2>
          <p>
            We may update these terms from time to time. If we make material
            changes, we will notify subscribers by email before the changes take
            effect. Continued use of the service after changes take effect
            constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-10 mb-3">
            14. Contact
          </h2>
          <p>
            If you have questions about these terms, contact us:
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
