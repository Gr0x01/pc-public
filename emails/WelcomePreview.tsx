import WelcomeEmail from "../src/lib/email/templates/WelcomeEmail";

export default function WelcomePreview() {
  return (
    <WelcomeEmail
      first_name="Ryan"
      products={[
        { id: "1", name: "Marine Collagen Powder" },
        { id: "2", name: "Elderberry Immune Gummies" },
        { id: "3", name: "Vitamin D3 5000 IU" },
      ]}
      max_products={5}
    />
  );
}
