ALTER TABLE room_designs ADD COLUMN IF NOT EXISTS source_room_id uuid REFERENCES room_designs(id) ON DELETE SET NULL;
ALTER TABLE room_designs ADD COLUMN IF NOT EXISTS is_copy boolean DEFAULT false;