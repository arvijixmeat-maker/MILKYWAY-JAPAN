-- Allow users to update their own quotes (e.g. status)
-- Previously, only admins could update quotes. This prevented the automatic status update 
-- from 'answered' to 'converted' when a user made a reservation.

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Only admins can update quotes" ON quotes;

-- Create a new permissive policy
CREATE POLICY "Users can update own quotes"
ON quotes FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'admin' 
  OR 
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);
