-- supabase/migrations/20240401120001_create_add_points_function.sql
CREATE OR REPLACE FUNCTION add_points(user_id_in uuid, points_to_add integer)
RETURNS void AS $$
BEGIN
  INSERT INTO points (user_id, total_points, level)
  VALUES (user_id_in, points_to_add, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET total_points = points.total_points + points_to_add;
END;
$$ LANGUAGE plpgsql;
