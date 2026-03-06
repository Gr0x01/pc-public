import AlertEmail from "../src/lib/email/templates/AlertEmail";

export default function AlertPreview() {
  return (
    <AlertEmail
      product_name="Daily Probiotic Capsules"
      title="Class II Recall: Probiotic Products with Undeclared Milk Allergen"
      summary="BioFlora Inc. has initiated a voluntary Class II recall affecting 12 lot numbers of probiotic capsule products after FDA testing confirmed the presence of undeclared milk protein. Products were distributed nationally through major retailers and direct-to-consumer channels between January and March 2026."
      action_type="recall"
      source_url="https://www.fda.gov/safety/recalls/example"
      deadline={null}
      matched_substances={["Lactobacillus acidophilus", "Bifidobacterium lactis"]}
      app_url="https://policycanary.io/app/items/item-123?highlight=p2"
    />
  );
}
