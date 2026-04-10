ALTER TABLE orders
ADD COLUMN retry_count integer DEFAULT 0,
ADD COLUMN last_error text,
ADD COLUMN last_attempt_at timestamp with time zone;