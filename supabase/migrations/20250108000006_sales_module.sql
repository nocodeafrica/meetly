-- Migration: Sales Module
-- Description: Sales, sale items, payments, held sales
-- Date: 2025-01-08

-- ============================================================================
-- SALES
-- ============================================================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    sale_number TEXT NOT NULL, -- Auto-generated (SAL-MMDD-NN)

    -- Transaction details
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cashier_id UUID NOT NULL REFERENCES user_profiles(id),

    -- Zone (where products are sold from)
    zone_id UUID NOT NULL REFERENCES zones(id),

    -- Totals (base currency - USD)
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    discount_reason TEXT,
    discount_approved_by UUID REFERENCES user_profiles(id),

    tax_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Total weight sold
    total_weight_kg NUMERIC(10, 3) DEFAULT 0,

    -- Cost (for margin calculation)
    total_cost NUMERIC(12, 2) DEFAULT 0,
    margin_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - total_cost) STORED,
    margin_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN total_amount > 0 THEN ((total_amount - total_cost) / total_amount) * 100 ELSE 0 END
    ) STORED,

    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'refunded'
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    change_given NUMERIC(12, 2) DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'voided', 'held'
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES user_profiles(id),
    void_reason TEXT,

    -- Receipt
    receipt_printed BOOLEAN DEFAULT FALSE,
    receipt_printed_at TIMESTAMPTZ,

    -- Offline support
    created_offline BOOLEAN DEFAULT FALSE,
    offline_id TEXT, -- Client-generated ID for offline sync
    synced_at TIMESTAMPTZ,

    -- Customer (optional, for future loyalty)
    customer_name TEXT,
    customer_phone TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, sale_number)
);

CREATE INDEX idx_sales_org ON sales(organization_id);
CREATE INDEX idx_sales_date ON sales(organization_id, sale_date DESC);
CREATE INDEX idx_sales_cashier ON sales(cashier_id, sold_at DESC);
CREATE INDEX idx_sales_status ON sales(organization_id, status);
CREATE INDEX idx_sales_payment ON sales(organization_id, payment_status);
CREATE INDEX idx_sales_offline ON sales(organization_id, offline_id) WHERE offline_id IS NOT NULL;

-- ============================================================================
-- SALE ITEMS
-- ============================================================================

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    stock_id UUID REFERENCES stock(id), -- Source stock for traceability
    grade_id UUID REFERENCES grades(id),

    -- Quantity
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Pricing
    unit_price NUMERIC(10, 2) NOT NULL, -- Price per kg/unit
    line_subtotal NUMERIC(12, 2) NOT NULL, -- Before discounts
    line_discount NUMERIC(12, 2) DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL, -- After discounts

    -- Tax
    tax_rate_percent NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,

    -- Cost (for margin)
    unit_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
    line_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,

    -- Traceability
    carcass_id UUID REFERENCES carcasses(id),
    batch_code TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_sale_items_carcass ON sale_items(carcass_id) WHERE carcass_id IS NOT NULL;

-- ============================================================================
-- SALE PAYMENTS
-- ============================================================================

CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    -- Payment method
    payment_method TEXT NOT NULL, -- 'cash_usd', 'cash_zwl', 'ecocash', 'onemoney', 'card', 'credit'

    -- Currency and amount
    currency_code TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL, -- Amount in payment currency
    exchange_rate NUMERIC(15, 6) DEFAULT 1, -- Rate to base currency
    amount_base NUMERIC(12, 2) NOT NULL, -- Amount in base currency (USD)

    -- Electronic payment reference
    reference TEXT,
    authorization_code TEXT,

    -- For cash payments
    tendered NUMERIC(12, 2), -- Amount given by customer
    change_amount NUMERIC(12, 2), -- Change returned

    -- Status
    status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed', 'refunded'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX idx_sale_payments_method ON sale_payments(payment_method);

-- ============================================================================
-- HELD SALES (Sales saved for later completion)
-- ============================================================================

CREATE TABLE held_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    hold_number TEXT NOT NULL, -- Auto-generated

    -- When and who
    held_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    held_by UUID NOT NULL REFERENCES user_profiles(id),

    -- Customer reference
    customer_name TEXT,
    customer_phone TEXT,

    -- Zone
    zone_id UUID NOT NULL REFERENCES zones(id),

    -- Cart data (stored as JSONB for flexibility)
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_weight_kg NUMERIC(10, 3) DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'held', -- 'held', 'recalled', 'expired', 'cancelled'
    recalled_at TIMESTAMPTZ,
    recalled_by UUID REFERENCES user_profiles(id),
    converted_sale_id UUID REFERENCES sales(id),

    -- Expiry (held sales expire at end of day)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, hold_number)
);

CREATE INDEX idx_held_sales_org ON held_sales(organization_id);
CREATE INDEX idx_held_sales_status ON held_sales(organization_id, status);
CREATE INDEX idx_held_sales_expires ON held_sales(expires_at) WHERE status = 'held';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate sale number
CREATE OR REPLACE FUNCTION trigger_set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sale_number IS NULL THEN
        NEW.sale_number := get_next_document_number(
            NEW.organization_id, 'sale', 'SAL'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sale_number BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION trigger_set_sale_number();

-- Auto-generate hold number
CREATE OR REPLACE FUNCTION trigger_set_hold_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hold_number IS NULL THEN
        NEW.hold_number := get_next_document_number(
            NEW.organization_id, 'held_sale', 'HLD'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_hold_number BEFORE INSERT ON held_sales
    FOR EACH ROW EXECUTE FUNCTION trigger_set_hold_number();

-- Update sale totals when items change
CREATE OR REPLACE FUNCTION trigger_update_sale_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_id UUID;
BEGIN
    v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

    UPDATE sales
    SET subtotal = (SELECT COALESCE(SUM(line_subtotal), 0) FROM sale_items WHERE sale_id = v_sale_id),
        total_weight_kg = (SELECT COALESCE(SUM(quantity_kg), 0) FROM sale_items WHERE sale_id = v_sale_id),
        total_cost = (SELECT COALESCE(SUM(line_cost), 0) FROM sale_items WHERE sale_id = v_sale_id),
        tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM sale_items WHERE sale_id = v_sale_id),
        total_amount = (
            SELECT COALESCE(SUM(line_subtotal), 0) FROM sale_items WHERE sale_id = v_sale_id
        ) - COALESCE(discount_amount, 0) + (
            SELECT COALESCE(SUM(tax_amount), 0) FROM sale_items WHERE sale_id = v_sale_id
        ),
        updated_at = NOW()
    WHERE id = v_sale_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sale_totals AFTER INSERT OR UPDATE OR DELETE ON sale_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_sale_totals();

-- Update payment status when payments change
CREATE OR REPLACE FUNCTION trigger_update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_id UUID;
    v_total_paid NUMERIC;
    v_sale_total NUMERIC;
BEGIN
    v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

    SELECT COALESCE(SUM(amount_base), 0) INTO v_total_paid
    FROM sale_payments
    WHERE sale_id = v_sale_id AND status = 'completed';

    SELECT total_amount INTO v_sale_total
    FROM sales
    WHERE id = v_sale_id;

    UPDATE sales
    SET amount_paid = v_total_paid,
        payment_status = CASE
            WHEN v_total_paid >= v_sale_total THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = v_sale_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_status AFTER INSERT OR UPDATE OR DELETE ON sale_payments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_payment_status();

-- Deduct stock when sale completed
CREATE OR REPLACE FUNCTION trigger_deduct_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_sale RECORD;
BEGIN
    SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;

    -- Only process if sale is completed
    IF v_sale.status = 'completed' THEN
        -- Deduct from stock
        PERFORM update_stock(
            v_sale.organization_id,
            NEW.product_id,
            v_sale.zone_id,
            -NEW.quantity_kg,
            NEW.unit_cost,
            NEW.grade_id,
            NEW.carcass_id
        );

        -- Record movement
        PERFORM record_stock_movement(
            v_sale.organization_id,
            NEW.product_id,
            v_sale.zone_id,
            'sell',
            -NEW.quantity_kg,
            NEW.unit_cost,
            'sale',
            v_sale.id,
            NEW.carcass_id,
            NEW.grade_id,
            NEW.batch_code
        );

        -- Update carcass revenue if traceable
        IF NEW.carcass_id IS NOT NULL THEN
            UPDATE carcasses
            SET total_revenue = total_revenue + NEW.line_total,
                updated_at = NOW()
            WHERE id = NEW.carcass_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deduct_stock_on_sale AFTER INSERT ON sale_items
    FOR EACH ROW EXECUTE FUNCTION trigger_deduct_stock_on_sale();

-- Handle sale void (restore stock)
CREATE OR REPLACE FUNCTION trigger_handle_sale_void()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    IF NEW.status = 'voided' AND OLD.status != 'voided' THEN
        -- Restore stock for each item
        FOR v_item IN SELECT * FROM sale_items WHERE sale_id = NEW.id LOOP
            -- Add back to stock
            PERFORM update_stock(
                NEW.organization_id,
                v_item.product_id,
                NEW.zone_id,
                v_item.quantity_kg,
                v_item.unit_cost,
                v_item.grade_id,
                v_item.carcass_id
            );

            -- Record movement
            PERFORM record_stock_movement(
                NEW.organization_id,
                v_item.product_id,
                NEW.zone_id,
                'void_restore',
                v_item.quantity_kg,
                v_item.unit_cost,
                'sale',
                NEW.id,
                v_item.carcass_id,
                v_item.grade_id,
                v_item.batch_code,
                'Sale voided: ' || COALESCE(NEW.void_reason, 'No reason provided')
            );

            -- Reverse carcass revenue if traceable
            IF v_item.carcass_id IS NOT NULL THEN
                UPDATE carcasses
                SET total_revenue = total_revenue - v_item.line_total,
                    updated_at = NOW()
                WHERE id = v_item.carcass_id;
            END IF;
        END LOOP;

        NEW.voided_at := NOW();
        NEW.voided_by := auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_sale_void BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION trigger_handle_sale_void();

-- Expire held sales
CREATE OR REPLACE FUNCTION expire_held_sales()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE held_sales
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'held'
      AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON held_sales
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
