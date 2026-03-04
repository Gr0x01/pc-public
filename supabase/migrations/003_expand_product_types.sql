-- Migration to expand product types in subscriber_products table
-- to support full FDA regulated product spectrum (Drugs, Devices, Tobacco, Veterinary, Biologics)

BEGIN;

-- 1. Drop the old constraint
ALTER TABLE subscriber_products 
DROP CONSTRAINT IF EXISTS subscriber_products_product_type_check;

-- 2. Add the new expanded constraint
ALTER TABLE subscriber_products 
ADD CONSTRAINT subscriber_products_product_type_check 
CHECK (product_type IN (
  'supplement', 
  'food', 
  'cosmetic', 
  'drug', 
  'medical_device', 
  'biologic', 
  'tobacco', 
  'veterinary'
));

COMMIT;
