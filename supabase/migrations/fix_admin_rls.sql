-- Fix Admin Permissions: Use 'profiles' table check instead of JWT claim
-- Previous policies relied on auth.jwt() ->> 'role' = 'admin', which might not be set.
-- This script updates the policies to explicitly check the user's role in the public.profiles table.

-- ==================== QUOTES ====================

-- 1. DELETE
DROP POLICY IF EXISTS "Only admins can delete quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON quotes;

CREATE POLICY "Admins can delete quotes"
ON quotes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. UPDATE
-- Note: 'Users can update own quotes' might exist from previous step, but we add an explicit Admin policy here.
-- Policies are combined with OR, so this adds admin capability regardless of other policies.
DROP POLICY IF EXISTS "Only admins can update quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can update quotes" ON quotes;

CREATE POLICY "Admins can update quotes"
ON quotes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ==================== RESERVATIONS ====================

-- 1. DELETE
DROP POLICY IF EXISTS "Only admins can delete reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can delete reservations" ON reservations;

CREATE POLICY "Admins can delete reservations"
ON reservations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. UPDATE
DROP POLICY IF EXISTS "Only admins can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can update reservations" ON reservations;

CREATE POLICY "Admins can update reservations"
ON reservations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
