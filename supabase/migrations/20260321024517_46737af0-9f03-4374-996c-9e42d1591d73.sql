CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_color text DEFAULT '#C8B89A',
  updated_at timestamp with time zone
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can upsert their own profile"
ON public.profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());