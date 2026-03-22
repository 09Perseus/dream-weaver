-- ============================================================
-- FILE: supabase/migrations/20240101_add_designer_orders.sql
-- PROJECT: E-Commerce Lovable Project
-- PURPOSE: Adds the columns needed to receive orders from the
--          3D Room Designer, and creates an RLS-safe orders table
--          if one does not already exist.
-- Run via: supabase db push  (or paste into Supabase SQL Editor)
-- ============================================================

-- ── 1. Create orders table (skip if it already exists) ────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name      TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        NUMERIC(10, 2) NOT NULL,
  total_price       NUMERIC(10, 2) NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shipping_address  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  source            TEXT DEFAULT 'ecommerce_site',   -- 'ecommerce_site' | '3d_room_designer'
  idempotency_key   TEXT UNIQUE,                      -- Prevents duplicate orders
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Add missing columns if table already exists ────────────
-- (safe to run even if columns are already there)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'orders' AND column_name = 'source') THEN
    ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'ecommerce_site';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'orders' AND column_name = 'idempotency_key') THEN
    ALTER TABLE public.orders ADD COLUMN idempotency_key TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'orders' AND column_name = 'product_name') THEN
    ALTER TABLE public.orders ADD COLUMN product_name TEXT;
  END IF;
END $$;

-- ── 3. Index for fast idempotency lookups ─────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for customer email lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_email
  ON public.orders (customer_email);

-- Index to filter orders by source
CREATE INDEX IF NOT EXISTS idx_orders_source
  ON public.orders (source);

-- ── 4. Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Row Level Security ──────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own orders
CREATE POLICY IF NOT EXISTS "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_user_id);

-- Only service role (Edge Function) can insert orders
CREATE POLICY IF NOT EXISTS "Service role can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);  -- Edge Function uses service role, bypasses RLS anyway

-- Admins can view all orders (add your admin check here)
-- CREATE POLICY "Admins can view all orders"
--   ON public.orders FOR SELECT
--   USING (auth.jwt() ->> 'role' = 'admin');

-- ── 6. Grant edge function access ─────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.orders TO service_role;
GRANT SELECT ON public.products TO service_role;