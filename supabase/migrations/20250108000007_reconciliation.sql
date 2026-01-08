-- Migration: Reconciliation Module
-- Description: Daily closings, stock counts, cash counts, variance tracking
-- Date: 2025-01-08

-- ============================================================================
-- DAILY CLOSINGS
-- ============================================================================

CREATE TABLE daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    closing_date DATE NOT NULL,

    -- Process tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_by UUID NOT NULL REFERENCES user_profiles(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Sales summary
    total_sales NUMERIC(12, 2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    total_weight_sold_kg NUMERIC(10, 3) DEFAULT 0,

    -- Stock variance
    expected_stock_kg NUMERIC(12, 3) DEFAULT 0,
    actual_stock_kg NUMERIC(12, 3) DEFAULT 0,
    stock_variance_kg NUMERIC(12, 3) GENERATED ALWAYS AS (actual_stock_kg - expected_stock_kg) STORED,
    stock_variance_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN expected_stock_kg > 0 THEN ((actual_stock_kg - expected_stock_kg) / expected_stock_kg) * 100 ELSE 0 END
    ) STORED,
    stock_variance_value NUMERIC(12, 2) DEFAULT 0,

    -- Cash variance (base currency)
    expected_cash_usd NUMERIC(12, 2) DEFAULT 0,
    actual_cash_usd NUMERIC(12, 2) DEFAULT 0,
    cash_variance_usd NUMERIC(12, 2) GENERATED ALWAYS AS (actual_cash_usd - expected_cash_usd) STORED,

    -- ZWL cash (separate tracking)
    expected_cash_zwl NUMERIC(12, 2) DEFAULT 0,
    actual_cash_zwl NUMERIC(12, 2) DEFAULT 0,
    cash_variance_zwl NUMERIC(12, 2) GENERATED ALWAYS AS (actual_cash_zwl - expected_cash_zwl) STORED,

    -- Electronic payments verification
    electronic_payments_verified BOOLEAN DEFAULT FALSE,
    electronic_payments_total NUMERIC(12, 2) DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'reopened'

    -- Approval (for high variance)
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES user_profiles(id),
    approval_notes TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, closing_date)
);

CREATE INDEX idx_daily_closings_org ON daily_closings(organization_id);
CREATE INDEX idx_daily_closings_date ON daily_closings(organization_id, closing_date DESC);
CREATE INDEX idx_daily_closings_status ON daily_closings(organization_id, status);

-- ============================================================================
-- STOCK COUNTS (Per zone during closing)
-- ============================================================================

CREATE TABLE stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_closing_id UUID NOT NULL REFERENCES daily_closings(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id),

    -- Count progress
    started_at TIMESTAMPTZ,
    started_by UUID REFERENCES user_profiles(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Totals
    expected_total_kg NUMERIC(12, 3) DEFAULT 0,
    actual_total_kg NUMERIC(12, 3) DEFAULT 0,
    variance_kg NUMERIC(12, 3) GENERATED ALWAYS AS (actual_total_kg - expected_total_kg) STORED,
    variance_value NUMERIC(12, 2) DEFAULT 0,

    -- Item count
    total_items INTEGER DEFAULT 0,
    items_counted INTEGER DEFAULT 0,
    items_with_variance INTEGER DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(daily_closing_id, zone_id)
);

CREATE INDEX idx_stock_counts_closing ON stock_counts(daily_closing_id);
CREATE INDEX idx_stock_counts_zone ON stock_counts(zone_id);

-- ============================================================================
-- STOCK COUNT ITEMS (Individual product counts)
-- ============================================================================

CREATE TABLE stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    grade_id UUID REFERENCES grades(id),
    stock_id UUID REFERENCES stock(id), -- Link to specific stock record if needed

    -- Expected (from system)
    expected_kg NUMERIC(10, 3) NOT NULL,
    expected_value NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Actual (from count)
    actual_kg NUMERIC(10, 3),
    is_counted BOOLEAN DEFAULT FALSE,
    counted_at TIMESTAMPTZ,
    counted_by UUID REFERENCES user_profiles(id),

    -- Variance
    variance_kg NUMERIC(10, 3) GENERATED ALWAYS AS (
        CASE WHEN actual_kg IS NOT NULL THEN actual_kg - expected_kg ELSE NULL END
    ) STORED,
    variance_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN actual_kg IS NOT NULL AND expected_kg > 0
        THEN ((actual_kg - expected_kg) / expected_kg) * 100
        ELSE NULL END
    ) STORED,
    variance_value NUMERIC(12, 2) GENERATED ALWAYS AS (
        CASE WHEN actual_kg IS NOT NULL
        THEN (actual_kg - expected_kg) * (expected_value / NULLIF(expected_kg, 0))
        ELSE NULL END
    ) STORED,

    -- Variance reason (required if variance exists)
    variance_reason TEXT, -- 'trimming', 'spoilage', 'weighing_error', 'theft', 'other'
    variance_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_count_items_count ON stock_count_items(stock_count_id);
CREATE INDEX idx_stock_count_items_product ON stock_count_items(product_id);
CREATE INDEX idx_stock_count_items_uncounted ON stock_count_items(stock_count_id, is_counted) WHERE is_counted = FALSE;

-- ============================================================================
-- CASH COUNTS
-- ============================================================================

CREATE TABLE cash_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_closing_id UUID NOT NULL REFERENCES daily_closings(id) ON DELETE CASCADE,

    currency_code TEXT NOT NULL,

    -- Expected
    opening_float NUMERIC(12, 2) DEFAULT 0,
    cash_sales NUMERIC(12, 2) DEFAULT 0,
    expected_total NUMERIC(12, 2) GENERATED ALWAYS AS (opening_float + cash_sales) STORED,

    -- Actual count
    counted_total NUMERIC(12, 2) DEFAULT 0,

    -- Variance
    variance NUMERIC(12, 2) GENERATED ALWAYS AS (counted_total - (opening_float + cash_sales)) STORED,

    -- Counted by
    counted_at TIMESTAMPTZ,
    counted_by UUID REFERENCES user_profiles(id),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(daily_closing_id, currency_code)
);

CREATE INDEX idx_cash_counts_closing ON cash_counts(daily_closing_id);

-- ============================================================================
-- CASH COUNT DENOMINATIONS (Detailed denomination breakdown)
-- ============================================================================

CREATE TABLE cash_count_denominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_count_id UUID NOT NULL REFERENCES cash_counts(id) ON DELETE CASCADE,

    denomination NUMERIC(10, 2) NOT NULL, -- e.g., 100, 50, 20, 10, 5, 1, 0.50
    count INTEGER NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) GENERATED ALWAYS AS (denomination * count) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_count_denominations_count ON cash_count_denominations(cash_count_id);

-- ============================================================================
-- VARIANCE REASONS (Reference table for categorizing variances)
-- ============================================================================

CREATE TABLE variance_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'stock', 'cash'

    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, code)
);

-- Insert default variance reasons
INSERT INTO variance_reasons (organization_id, code, name, description, category)
SELECT o.id, v.code, v.name, v.description, v.category
FROM organizations o
CROSS JOIN (VALUES
    ('trimming', 'Trimming/Cutting Loss', 'Weight lost during normal cutting and trimming', 'stock'),
    ('spoilage', 'Spoilage', 'Product spoiled or expired', 'stock'),
    ('weighing_error', 'Weighing Error', 'Discrepancy due to scale inaccuracy or error', 'stock'),
    ('theft', 'Theft/Shrinkage', 'Suspected theft or unexplained shrinkage', 'stock'),
    ('damage', 'Damage', 'Product damaged and unsellable', 'stock'),
    ('sampling', 'Sampling/Tasting', 'Product used for customer sampling', 'stock'),
    ('giveaway', 'Promotional Giveaway', 'Product given away for promotion', 'stock'),
    ('other_stock', 'Other (Stock)', 'Other stock-related variance', 'stock'),
    ('counting_error', 'Counting Error', 'Error in counting cash', 'cash'),
    ('short_change', 'Short Change', 'Gave incorrect change to customer', 'cash'),
    ('over_change', 'Over Change', 'Gave too much change', 'cash'),
    ('theft_cash', 'Cash Theft', 'Suspected cash theft', 'cash'),
    ('other_cash', 'Other (Cash)', 'Other cash-related variance', 'cash')
) AS v(code, name, description, category);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update stock count totals
CREATE OR REPLACE FUNCTION trigger_update_stock_count_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stock_counts
    SET expected_total_kg = (
            SELECT COALESCE(SUM(expected_kg), 0)
            FROM stock_count_items
            WHERE stock_count_id = COALESCE(NEW.stock_count_id, OLD.stock_count_id)
        ),
        actual_total_kg = (
            SELECT COALESCE(SUM(actual_kg), 0)
            FROM stock_count_items
            WHERE stock_count_id = COALESCE(NEW.stock_count_id, OLD.stock_count_id)
              AND is_counted = TRUE
        ),
        variance_value = (
            SELECT COALESCE(SUM(variance_value), 0)
            FROM stock_count_items
            WHERE stock_count_id = COALESCE(NEW.stock_count_id, OLD.stock_count_id)
              AND is_counted = TRUE
              AND variance_value IS NOT NULL
        ),
        total_items = (
            SELECT COUNT(*)
            FROM stock_count_items
            WHERE stock_count_id = COALESCE(NEW.stock_count_id, OLD.stock_count_id)
        ),
        items_counted = (
            SELECT COUNT(*)
            FROM stock_count_items
            WHERE stock_count_id = COALESCE(NEW.stock_count_id, OLD.stock_count_id)
              AND is_counted = TRUE
        ),
        items_with_variance = (
            SELECT COUNT(*)
            FROM stock_count_items
            WHERE stock_count_id = COALESCE(NEW.stock_count_id, OLD.stock_count_id)
              AND is_counted = TRUE
              AND variance_kg != 0
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.stock_count_id, OLD.stock_count_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_count_totals AFTER INSERT OR UPDATE OR DELETE ON stock_count_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_stock_count_totals();

-- Update cash count totals from denominations
CREATE OR REPLACE FUNCTION trigger_update_cash_count_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cash_counts
    SET counted_total = (
            SELECT COALESCE(SUM(total), 0)
            FROM cash_count_denominations
            WHERE cash_count_id = COALESCE(NEW.cash_count_id, OLD.cash_count_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.cash_count_id, OLD.cash_count_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cash_count_total AFTER INSERT OR UPDATE OR DELETE ON cash_count_denominations
    FOR EACH ROW EXECUTE FUNCTION trigger_update_cash_count_total();

-- Update daily closing totals
CREATE OR REPLACE FUNCTION trigger_update_daily_closing_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_closing_id UUID;
BEGIN
    v_closing_id := COALESCE(NEW.daily_closing_id, OLD.daily_closing_id);

    UPDATE daily_closings
    SET expected_stock_kg = (
            SELECT COALESCE(SUM(expected_total_kg), 0)
            FROM stock_counts
            WHERE daily_closing_id = v_closing_id
        ),
        actual_stock_kg = (
            SELECT COALESCE(SUM(actual_total_kg), 0)
            FROM stock_counts
            WHERE daily_closing_id = v_closing_id
        ),
        stock_variance_value = (
            SELECT COALESCE(SUM(variance_value), 0)
            FROM stock_counts
            WHERE daily_closing_id = v_closing_id
        ),
        updated_at = NOW()
    WHERE id = v_closing_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_closing_stock_totals AFTER INSERT OR UPDATE OR DELETE ON stock_counts
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_closing_totals();

-- Update daily closing cash totals
CREATE OR REPLACE FUNCTION trigger_update_daily_closing_cash()
RETURNS TRIGGER AS $$
DECLARE
    v_closing_id UUID;
BEGIN
    v_closing_id := COALESCE(NEW.daily_closing_id, OLD.daily_closing_id);

    UPDATE daily_closings
    SET expected_cash_usd = (
            SELECT COALESCE(expected_total, 0)
            FROM cash_counts
            WHERE daily_closing_id = v_closing_id AND currency_code = 'USD'
        ),
        actual_cash_usd = (
            SELECT COALESCE(counted_total, 0)
            FROM cash_counts
            WHERE daily_closing_id = v_closing_id AND currency_code = 'USD'
        ),
        expected_cash_zwl = (
            SELECT COALESCE(expected_total, 0)
            FROM cash_counts
            WHERE daily_closing_id = v_closing_id AND currency_code = 'ZWL'
        ),
        actual_cash_zwl = (
            SELECT COALESCE(counted_total, 0)
            FROM cash_counts
            WHERE daily_closing_id = v_closing_id AND currency_code = 'ZWL'
        ),
        updated_at = NOW()
    WHERE id = v_closing_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_closing_cash AFTER INSERT OR UPDATE OR DELETE ON cash_counts
    FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_closing_cash();

-- Check if approval required on completion
CREATE OR REPLACE FUNCTION trigger_check_closing_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_variance_threshold NUMERIC;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get threshold from organization settings
        SELECT (settings->>'variance_critical_threshold')::NUMERIC INTO v_variance_threshold
        FROM organizations
        WHERE id = NEW.organization_id;

        v_variance_threshold := COALESCE(v_variance_threshold, 2.0);

        -- Check if variance exceeds threshold
        IF ABS(NEW.stock_variance_percent) > v_variance_threshold THEN
            NEW.requires_approval := TRUE;
        END IF;

        NEW.completed_at := NOW();
        NEW.completed_by := auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_closing_approval BEFORE UPDATE ON daily_closings
    FOR EACH ROW EXECUTE FUNCTION trigger_check_closing_approval();

-- Initialize daily closing with sales data
CREATE OR REPLACE FUNCTION initialize_daily_closing(
    p_organization_id UUID,
    p_closing_date DATE,
    p_started_by UUID
) RETURNS UUID AS $$
DECLARE
    v_closing_id UUID;
    v_zone RECORD;
    v_stock_count_id UUID;
    v_stock RECORD;
BEGIN
    -- Create daily closing record
    INSERT INTO daily_closings (organization_id, closing_date, started_by)
    VALUES (p_organization_id, p_closing_date, p_started_by)
    RETURNING id INTO v_closing_id;

    -- Calculate sales totals for the day
    UPDATE daily_closings
    SET total_sales = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM sales
            WHERE organization_id = p_organization_id
              AND sale_date = p_closing_date
              AND status = 'completed'
        ),
        transaction_count = (
            SELECT COUNT(*)
            FROM sales
            WHERE organization_id = p_organization_id
              AND sale_date = p_closing_date
              AND status = 'completed'
        ),
        total_weight_sold_kg = (
            SELECT COALESCE(SUM(total_weight_kg), 0)
            FROM sales
            WHERE organization_id = p_organization_id
              AND sale_date = p_closing_date
              AND status = 'completed'
        ),
        electronic_payments_total = (
            SELECT COALESCE(SUM(sp.amount_base), 0)
            FROM sale_payments sp
            JOIN sales s ON s.id = sp.sale_id
            WHERE s.organization_id = p_organization_id
              AND s.sale_date = p_closing_date
              AND s.status = 'completed'
              AND sp.payment_method NOT IN ('cash_usd', 'cash_zwl')
        )
    WHERE id = v_closing_id;

    -- Create stock count records for each zone
    FOR v_zone IN SELECT * FROM zones WHERE organization_id = p_organization_id AND is_active = TRUE LOOP
        INSERT INTO stock_counts (daily_closing_id, zone_id)
        VALUES (v_closing_id, v_zone.id)
        RETURNING id INTO v_stock_count_id;

        -- Populate with current stock items
        INSERT INTO stock_count_items (stock_count_id, product_id, grade_id, stock_id, expected_kg, expected_value)
        SELECT
            v_stock_count_id,
            s.product_id,
            s.grade_id,
            s.id,
            s.quantity_kg,
            s.total_cost
        FROM stock s
        WHERE s.organization_id = p_organization_id
          AND s.zone_id = v_zone.id
          AND s.quantity_kg > 0;
    END LOOP;

    -- Create cash count records
    INSERT INTO cash_counts (daily_closing_id, currency_code, opening_float, cash_sales)
    VALUES
        (v_closing_id, 'USD', 200, ( -- Default USD float
            SELECT COALESCE(SUM(sp.amount_base), 0)
            FROM sale_payments sp
            JOIN sales s ON s.id = sp.sale_id
            WHERE s.organization_id = p_organization_id
              AND s.sale_date = p_closing_date
              AND s.status = 'completed'
              AND sp.payment_method = 'cash_usd'
        )),
        (v_closing_id, 'ZWL', 0, ( -- ZWL float
            SELECT COALESCE(SUM(sp.amount), 0)
            FROM sale_payments sp
            JOIN sales s ON s.id = sp.sale_id
            WHERE s.organization_id = p_organization_id
              AND s.sale_date = p_closing_date
              AND s.status = 'completed'
              AND sp.payment_method = 'cash_zwl'
        ));

    RETURN v_closing_id;
END;
$$ LANGUAGE plpgsql;

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON daily_closings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON stock_counts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON stock_count_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON cash_counts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
