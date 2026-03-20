
-- Add is_shared column to room_designs
ALTER TABLE public.room_designs ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read rooms by share_token" ON public.room_designs;

-- Create a new policy that only exposes explicitly shared rooms
CREATE POLICY "Anyone can read shared rooms"
  ON public.room_designs FOR SELECT
  TO public
  USING (is_shared = true);
