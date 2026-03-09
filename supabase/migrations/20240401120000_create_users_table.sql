-- supabase/migrations/20240401120000_create_users_table.sql
CREATE TABLE public.users (
  id uuid NOT NULL,
  wallet_address text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_wallet_address_key UNIQUE (wallet_address),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.users IS 'Stores public user data, linked to Supabase auth.';

-- Add a trigger to update the updated_at column on the users table
CREATE TRIGGER set_users_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
