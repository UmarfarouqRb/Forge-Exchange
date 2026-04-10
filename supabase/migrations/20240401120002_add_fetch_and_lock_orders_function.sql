CREATE OR REPLACE FUNCTION fetch_and_lock_orders() RETURNS TABLE (LIKE orders) AS $$
BEGIN
    RETURN QUERY
    WITH locked AS (
        SELECT id FROM orders
        WHERE status IN ('pending', 'processing') AND order_type = 'limit'
        FOR UPDATE SKIP LOCKED
    )
    UPDATE orders
    SET status = 'matching'
    WHERE id IN (SELECT id FROM locked)
    RETURNING *;
END; $$ LANGUAGE plpgsql;