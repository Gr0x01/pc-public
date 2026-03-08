-- =============================================================================
-- Migration 005: Harden RLS policies
--
-- Problem: users_self_only uses FOR ALL, allowing authenticated users to
-- UPDATE their own row directly from the browser (e.g., escalate access_level,
-- change max_products, tamper with Stripe IDs). All legitimate writes to
-- public.users already go through adminClient (service role, bypasses RLS).
--
-- Fix: Replace FOR ALL with FOR SELECT on users.
--
-- Secondary fix: subscriber_products FOR ALL allows UPDATE of user_id,
-- which would let a user reassign a product to another user's account.
-- Replace with explicit per-operation policies and add WITH CHECK on UPDATE.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- users: read-only via RLS (all writes go through adminClient / service role)
-- ---------------------------------------------------------------------------

DROP POLICY "users_self_only" ON users;

CREATE POLICY "users_self_read" ON users
  FOR SELECT USING (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- subscriber_products: allow INSERT/UPDATE/DELETE on own rows only.
-- WITH CHECK on UPDATE prevents user_id reassignment to another account.
-- ---------------------------------------------------------------------------

DROP POLICY "subscriber_products_owner_only" ON subscriber_products;

CREATE POLICY "subscriber_products_owner_select" ON subscriber_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriber_products_owner_insert" ON subscriber_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriber_products_owner_update" ON subscriber_products
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriber_products_owner_delete" ON subscriber_products
  FOR DELETE USING (auth.uid() = user_id);
