-- Enable RLS on community_posts
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read visible posts" ON community_posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON community_posts;

-- Anyone can read visible posts
CREATE POLICY "Anyone can read visible posts"
ON community_posts
FOR SELECT
TO public
USING (is_visible = true);

-- Authenticated users can insert their own posts
CREATE POLICY "Users can insert their own posts"
ON community_posts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON community_posts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON community_posts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());