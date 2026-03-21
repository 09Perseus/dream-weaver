-- Drop and recreate all policies to ensure correct setup
DROP POLICY IF EXISTS "Anyone can read shared rooms" ON room_designs;

-- Recreate it to ensure correct definition
CREATE POLICY "Anyone can read shared rooms"
ON room_designs
FOR SELECT
TO public
USING (is_shared = true);