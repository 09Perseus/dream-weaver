
create or replace function public.update_like_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.community_posts set like_count = like_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
end;
$$;
