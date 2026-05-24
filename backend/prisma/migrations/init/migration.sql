-- Performance indexes applied AFTER schema tables are created by Prisma
-- This migration runs on top of `prisma db push` or a schema-creating migration.
-- Tables (cases, clients, users, etc.) must already exist before this runs.

-- Extensions for full-text and fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_cases_fulltext
  ON cases USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_clients_fulltext
  ON clients USING GIN (
    to_tsvector('english', "firstName" || ' ' || "lastName" || ' ' || COALESCE(email, ''))
  );

CREATE INDEX IF NOT EXISTS idx_documents_fulltext
  ON documents USING GIN (
    to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(description, ''))
  );

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON clients USING GIN (("firstName" || ' ' || "lastName") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_title_trgm
  ON cases USING GIN (title gin_trgm_ops);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_cases_active
  ON cases (id, "caseNumber")
  WHERE status IN ('INTAKE', 'INVESTIGATION', 'ACTIVE', 'SETTLEMENT_NEGOTIATION');

CREATE INDEX IF NOT EXISTS idx_users_active
  ON "User" (id, email)
  WHERE "isActive" = true;

-- Function: auto-generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  case_count  INTEGER;
  new_number  TEXT;
BEGIN
  IF NEW."caseNumber" IS NULL OR NEW."caseNumber" = '' THEN
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    SELECT COUNT(*) + 1 INTO case_count
    FROM cases WHERE "caseNumber" LIKE 'CASE-' || year_suffix || '-%';
    new_number := 'CASE-' || year_suffix || '-' || LPAD(case_count::TEXT, 3, '0');
    WHILE EXISTS (SELECT 1 FROM cases WHERE "caseNumber" = new_number) LOOP
      case_count := case_count + 1;
      new_number := 'CASE-' || year_suffix || '-' || LPAD(case_count::TEXT, 3, '0');
    END LOOP;
    NEW."caseNumber" = new_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_case_number ON cases;
CREATE TRIGGER trigger_generate_case_number
  BEFORE INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Function: sync settlement amounts back to case row
CREATE OR REPLACE FUNCTION update_case_settlement_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cases SET
    "settlementAmount" = NEW.amount,
    "attorneyFees"     = NEW."attorneyFees",
    costs              = NEW.costs,
    "netToClient"      = NEW."netToClient"
  WHERE id = NEW."caseId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_case_settlement ON settlements;
CREATE TRIGGER trigger_update_case_settlement
  AFTER INSERT OR UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION update_case_settlement_totals();
