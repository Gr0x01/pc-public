import AuthEmail from "../src/lib/email/templates/AuthEmail";

export default function AuthChangeEmailPreview() {
  return (
    <AuthEmail
      variant="change-email"
      action_url="https://policycanary.io/auth/callback?code=abc123"
      new_email="newemail@company.com"
    />
  );
}
