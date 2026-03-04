-- Increment functions for concurrent safe updates
CREATE OR REPLACE FUNCTION increment_total_sold(prod_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET total_sold = COALESCE(total_sold, 0) + qty
  WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_total_added(prod_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET total_added = COALESCE(total_added, 0) + qty
  WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql;
