import AuthEmail from "../src/lib/email/templates/AuthEmail";

export default function AuthConfirmSignupPreview() {
  return (
    <AuthEmail
      variant="confirm-signup"
      action_url="https://policycanary.io/auth/callback?code=abc123"
    />
  );
}
