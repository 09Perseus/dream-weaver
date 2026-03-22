CREATE OR REPLACE FUNCTION increment_room_generation_count(
  user_id_input uuid
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET total_rooms_generated = COALESCE(total_rooms_generated, 0) + 1
  WHERE id = user_id_input;

  IF NOT FOUND THEN
    INSERT INTO profiles (id, total_rooms_generated)
    VALUES (user_id_input, 1)
    ON CONFLICT (id) DO UPDATE
    SET total_rooms_generated = COALESCE(profiles.total_rooms_generated, 0) + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;