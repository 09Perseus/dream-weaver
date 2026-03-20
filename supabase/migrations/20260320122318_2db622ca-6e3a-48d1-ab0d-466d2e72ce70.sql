
-- furniture_items
create table public.furniture_items (
  id text primary key,
  name text not null,
  category text not null,
  style_tags text[] default '{}',
  file_url text,
  thumbnail_url text,
  real_width float default 0,
  real_depth float default 0,
  real_height float default 0,
  floor_offset float default 0,
  price float not null default 0,
  buy_url text,
  created_at timestamptz default now()
);

-- room_designs
create table public.room_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  description text,
  items jsonb default '[]'::jsonb,
  share_token text unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz default now()
);

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  items jsonb default '[]'::jsonb,
  total_usd float not null default 0,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- community_posts
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  room_design_id uuid references public.room_designs(id) on delete cascade not null,
  title text not null,
  description text,
  style_tags text[] default '{}',
  thumbnail_url text,
  like_count integer default 0,
  is_visible boolean default true,
  created_at timestamptz default now()
);

-- post_likes with unique constraint
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

-- RLS
alter table public.furniture_items enable row level security;
alter table public.room_designs enable row level security;
alter table public.orders enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_likes enable row level security;

-- furniture_items: readable by everyone
create policy "Anyone can read furniture" on public.furniture_items for select using (true);

-- room_designs: owners can CRUD, anyone can read via share_token
create policy "Users manage own rooms" on public.room_designs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Anyone can read rooms by share_token" on public.room_designs for select using (share_token is not null);

-- orders: owners only
create policy "Users manage own orders" on public.orders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- community_posts: visible posts readable by all, owners can manage
create policy "Anyone can read visible posts" on public.community_posts for select using (is_visible = true);
create policy "Users manage own posts" on public.community_posts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- post_likes: authenticated users can like/unlike, anyone can read
create policy "Anyone can read likes" on public.post_likes for select using (true);
create policy "Users manage own likes" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own likes" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

-- Trigger to sync like_count
create or replace function public.update_like_count() returns trigger language plpgsql security definer as $$
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

create trigger on_like_change
  after insert or delete on public.post_likes
  for each row execute function public.update_like_count();
