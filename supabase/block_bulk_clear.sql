-- ============================================================
-- DATABASE GUARD: Block bulk zeroing of lots
-- ============================================================
-- This trigger prevents any SINGLE STATEMENT that zeroes out
-- more than 5 rows at once (i.e. a bulk clear). Individual
-- lot deletes/resets via the UI (one row at a time) are allowed.
-- ============================================================

-- Use a statement-level trigger with a transition table to count
-- how many rows are being zeroed in a single UPDATE statement.
CREATE OR REPLACE FUNCTION prevent_bulk_clear()
RETURNS TRIGGER AS $$
DECLARE
  zeroed_count INTEGER;
BEGIN
  -- Count how many rows in this UPDATE statement are being set to all-zero
  SELECT COUNT(*) INTO zeroed_count
  FROM new_table nt
  JOIN old_table ot ON nt.id = ot.id
  WHERE nt.gcv = 0
    AND nt.quantity = 0
    AND nt.original_gcv = 0
    AND nt.original_quantity = 0
    AND (ot.gcv != 0 OR ot.quantity != 0 OR ot.original_gcv != 0 OR ot.original_quantity != 0);

  -- If more than 5 rows are being zeroed in one statement, block it
  IF zeroed_count > 5 THEN
    RAISE EXCEPTION 'Bulk clear operation blocked. Cannot zero out more than 5 lots in a single operation. Use individual lot reset instead.';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop old row-level trigger if it exists
DROP TRIGGER IF EXISTS guard_bulk_clear ON lots;

-- Create statement-level trigger with transition tables
CREATE TRIGGER guard_bulk_clear
  AFTER UPDATE ON lots
  REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_bulk_clear();
