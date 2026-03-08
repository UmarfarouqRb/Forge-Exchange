-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the UserPoints table
CREATE TABLE public.user_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_points_pkey PRIMARY KEY (id),
  CONSTRAINT user_points_user_id_key UNIQUE (user_id)
);

-- Add comments to the table
COMMENT ON TABLE public.user_points IS 'Stores the total points and level for each user in the Forge Points program.';

-- Add a trigger to update the updated_at column on UserPoints table
CREATE TRIGGER set_user_points_timestamp
BEFORE UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create the PointEvent table
CREATE TABLE public.point_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL,
  points_awarded integer NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT point_events_pkey PRIMARY KEY (id)
);

-- Add comments to the table
COMMENT ON TABLE public.point_events IS 'Logs every point transaction for auditing purposes.';

-- Create the InviteCode table
CREATE TABLE public.invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_by_user_id text,
  CONSTRAINT invite_codes_pkey PRIMARY KEY (id),
  CONSTRAINT invite_codes_code_key UNIQUE (code)
);

-- Add comments to the table
COMMENT ON TABLE public.invite_codes IS 'Stores invite codes for the beta program.';
