ALTER TABLE public.room_designs
  ADD COLUMN IF NOT EXISTS floor_texture text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wall_texture text DEFAULT NULL;