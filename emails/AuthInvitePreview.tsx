import AuthEmail from "../src/lib/email/templates/AuthEmail";

export default function AuthInvitePreview() {
  return (
    <AuthEmail
      variant="invite"
      action_url="https://policycanary.io/auth/callback?code=abc123"
    />
  );
}
