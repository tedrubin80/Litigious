-- Advanced Database Features for Legal Estate Management System

-- Create extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_cases_fulltext ON cases USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_clients_fulltext ON clients USING GIN (to_tsvector('english', "firstName" || ' ' || "lastName" || ' ' || COALESCE(email, '')));
CREATE INDEX IF NOT EXISTS idx_documents_fulltext ON documents USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(description, '')));

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON clients USING GIN (("firstName" || ' ' || "lastName") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_title_trgm ON cases USING GIN (title gin_trgm_ops);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_active ON cases (id, "caseNumber") WHERE status IN ('INTAKE', 'INVESTIGATION', 'ACTIVE', 'SETTLEMENT_NEGOTIATION');
CREATE INDEX IF NOT EXISTS idx_users_active ON "User" (id, email) WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON invoices (id, "invoiceNumber", "dueDate") WHERE status IN ('DRAFT', 'SENT', 'OVERDUE');
CREATE INDEX IF NOT EXISTS idx_settlements_pending ON settlements (id, "caseId", amount) WHERE status IN ('DRAFT', 'PROPOSED', 'NEGOTIATING');

-- Materialized view for case statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS case_statistics AS
SELECT 
    c.type as case_type,
    c.status as case_status,
    COUNT(*) as case_count,
    AVG(EXTRACT(DAYS FROM COALESCE(c."dateClosed", CURRENT_DATE) - c."dateOpened")) as avg_case_duration_days,
    SUM(c."settlementAmount") as total_settlement_amount,
    AVG(c."settlementAmount") as avg_settlement_amount
FROM cases c
GROUP BY c.type, c.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_statistics_unique ON case_statistics (case_type, case_status);

-- View for attorney workload
CREATE OR REPLACE VIEW attorney_workload AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT c.id) as active_cases,
    COUNT(DISTINCT t.id) as pending_tasks,
    COALESCE(SUM(te.hours), 0) as total_hours_current_month,
    COALESCE(SUM(te.amount), 0) as total_billable_current_month
FROM "User" u
LEFT JOIN cases c ON u.id = c."attorneyId" AND c.status IN ('ACTIVE', 'SETTLEMENT_NEGOTIATION')
LEFT JOIN "Task" t ON u.id = t."assignedToId" AND t.status = 'PENDING'
LEFT JOIN "TimeEntry" te ON u.id = te."userId" 
    AND te.date >= date_trunc('month', CURRENT_DATE)
    AND te.billable = true
WHERE u.role IN ('ATTORNEY', 'PARALEGAL')
    AND u."isActive" = true
GROUP BY u.id, u.name, u.email;

-- View for client case summary
CREATE OR REPLACE VIEW client_case_summary AS
SELECT 
    cl.id as client_id,
    cl."firstName" || ' ' || cl."lastName" as client_name,
    cl.email,
    cl.phone,
    COUNT(c.id) as total_cases,
    COUNT(CASE WHEN c.status IN ('ACTIVE', 'SETTLEMENT_NEGOTIATION') THEN 1 END) as active_cases,
    COALESCE(SUM(c."settlementAmount"), 0) as total_settlements,
    MAX(c."createdAt") as last_case_date
FROM clients cl
LEFT JOIN cases c ON cl.id = c."clientId"
GROUP BY cl.id, cl."firstName", cl."lastName", cl.email, cl.phone;

-- Function to update case settlement amounts automatically
CREATE OR REPLACE FUNCTION update_case_settlement_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cases 
    SET 
        "settlementAmount" = NEW.amount,
        "attorneyFees" = NEW."attorneyFees",
        "costs" = NEW.costs,
        "netToClient" = NEW."netToClient"
    WHERE id = NEW."caseId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update case totals when settlement changes
DROP TRIGGER IF EXISTS trigger_update_case_settlement ON settlements;
CREATE TRIGGER trigger_update_case_settlement
    AFTER INSERT OR UPDATE ON settlements
    FOR EACH ROW
    EXECUTE FUNCTION update_case_settlement_totals();

-- Function to calculate invoice balance due
CREATE OR REPLACE FUNCTION calculate_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW."balanceDue" = NEW."totalAmount" - COALESCE(NEW."paidAmount", 0);
    
    -- Update status based on payment
    IF NEW."balanceDue" <= 0 THEN
        NEW.status = 'PAID';
    ELSIF NEW."paidAmount" > 0 THEN
        NEW.status = 'PARTIAL_PAYMENT';
    ELSIF NEW."dueDate" < CURRENT_DATE AND NEW.status = 'SENT' THEN
        NEW.status = 'OVERDUE';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate balance due on invoice changes
DROP TRIGGER IF EXISTS trigger_calculate_invoice_balance ON invoices;
CREATE TRIGGER trigger_calculate_invoice_balance
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_balance();

-- Function to prevent deletion of cases with related data
CREATE OR REPLACE FUNCTION prevent_case_deletion_with_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if case has settlements, invoices, or documents
    IF EXISTS (
        SELECT 1 FROM settlements WHERE "caseId" = OLD.id
        UNION ALL
        SELECT 1 FROM invoices WHERE "caseId" = OLD.id
        UNION ALL
        SELECT 1 FROM documents WHERE "caseId" = OLD.id
    ) THEN
        RAISE EXCEPTION 'Cannot delete case with existing settlements, invoices, or documents. Archive the case instead.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent case deletion if related data exists
DROP TRIGGER IF EXISTS trigger_prevent_case_deletion ON cases;
CREATE TRIGGER trigger_prevent_case_deletion
    BEFORE DELETE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION prevent_case_deletion_with_data();

-- Function to auto-generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix TEXT;
    case_count INTEGER;
    new_case_number TEXT;
BEGIN
    IF NEW."caseNumber" IS NULL OR NEW."caseNumber" = '' THEN
        year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
        
        -- Get count of cases for this year
        SELECT COUNT(*) + 1 
        INTO case_count
        FROM cases 
        WHERE "caseNumber" LIKE 'CASE-' || year_suffix || '-%';
        
        new_case_number := 'CASE-' || year_suffix || '-' || LPAD(case_count::TEXT, 3, '0');
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM cases WHERE "caseNumber" = new_case_number) LOOP
            case_count := case_count + 1;
            new_case_number := 'CASE-' || year_suffix || '-' || LPAD(case_count::TEXT, 3, '0');
        END LOOP;
        
        NEW."caseNumber" = new_case_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate case numbers
DROP TRIGGER IF EXISTS trigger_generate_case_number ON cases;
CREATE TRIGGER trigger_generate_case_number
    BEFORE INSERT ON cases
    FOR EACH ROW
    EXECUTE FUNCTION generate_case_number();

-- Function to log user activities
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    entity_name TEXT;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
    END IF;
    
    -- Get table name for entity type
    entity_name := UPPER(TG_TABLE_NAME);
    
    -- Log the activity (you would need to pass user_id through application context)
    -- This is a placeholder - in practice, you'd get current_user_id from session
    INSERT INTO "Activity" (
        id,
        action,
        description,
        "entityType",
        "entityId",
        "userId",
        "createdAt"
    ) VALUES (
        gen_random_uuid(),
        action_type,
        action_type || ' ' || entity_name,
        entity_name,
        COALESCE(NEW.id, OLD.id),
        COALESCE(current_setting('app.current_user_id', true), 'system'),
        CURRENT_TIMESTAMP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply activity logging to key tables
DROP TRIGGER IF EXISTS trigger_log_case_activity ON cases;
CREATE TRIGGER trigger_log_case_activity
    AFTER INSERT OR UPDATE OR DELETE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

DROP TRIGGER IF EXISTS trigger_log_settlement_activity ON settlements;
CREATE TRIGGER trigger_log_settlement_activity
    AFTER INSERT OR UPDATE OR DELETE ON settlements
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- Refresh materialized views function
CREATE OR REPLACE FUNCTION refresh_case_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY case_statistics;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to refresh statistics (requires pg_cron extension)
-- This would need to be set up separately with proper permissions