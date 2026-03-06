import AuthEmail from "../src/lib/email/templates/AuthEmail";

export default function AuthMagicLinkPreview() {
  return (
    <AuthEmail
      variant="magic-link"
      action_url="https://policycanary.io/auth/callback?code=abc123"
    />
  );
}
