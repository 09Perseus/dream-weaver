CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO public
USING (true);