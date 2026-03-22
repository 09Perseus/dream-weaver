ALTER TABLE public.community_posts
DROP CONSTRAINT community_posts_user_id_fkey;

ALTER TABLE public.community_posts
ADD CONSTRAINT community_posts_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;