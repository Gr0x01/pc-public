import WelcomeEmail from "../src/lib/email/templates/WelcomeEmail";

export default function WelcomeNoProductsPreview() {
  return (
    <WelcomeEmail
      first_name="Ryan"
      products={[]}
      max_products={5}
    />
  );
}
