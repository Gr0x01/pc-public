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
          Last updated: March 2026
        </p>
        <div className="prose prose-sm text-text-body space-y-6">
          <p>
            Policy Canary collects your email address when you sign up for our
            free weekly digest or paid monitoring plans. We use your email
            solely to deliver the service you signed up for.
          </p>
          <p>
            We do not sell or share your personal data with third parties for
            marketing purposes. We use Supabase for data storage and Resend for
            email delivery — both process data under their respective privacy
            policies.
          </p>
          <p>
            You can unsubscribe at any time using the link in any email we
            send. To request deletion of your data, email{" "}
            <a
              href="mailto:privacy@policycanary.io"
              className="text-amber underline"
            >
              privacy@policycanary.io
            </a>
            .
          </p>
          <p className="text-text-secondary text-xs">
            This is a summary. A full privacy policy will be published before
            paid plans launch.
          </p>
        </div>
      </div>
    </section>
  );
}
