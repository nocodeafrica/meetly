-- Migration: Stock & Inventory Module
-- Description: Stock tracking, movements, transfers, write-offs
-- Date: 2025-01-08

-- ============================================================================
-- STOCK (Current inventory levels)
-- ============================================================================

CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    zone_id UUID NOT NULL REFERENCES zones(id),
    grade_id UUID REFERENCES grades(id),

    -- Traceability references
    carcass_id UUID REFERENCES carcasses(id),
    cutting_session_id UUID REFERENCES cutting_sessions(id),
    production_batch_id UUID REFERENCES production_batches(id),

    -- Quantity and cost
    quantity_kg NUMERIC(10, 3) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,

    -- Batch tracking
    batch_code TEXT,

    -- Dates
    produced_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for stock aggregation
CREATE UNIQUE INDEX idx_stock_unique ON stock(
    organization_id,
    product_id,
    zone_id,
    COALESCE(grade_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(carcass_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(cutting_session_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(production_batch_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(batch_code, '')
);

CREATE INDEX idx_stock_org ON stock(organization_id);
CREATE INDEX idx_stock_product ON stock(product_id);
CREATE INDEX idx_stock_zone ON stock(zone_id);
CREATE INDEX idx_stock_org_product ON stock(organization_id, product_id);
CREATE INDEX idx_stock_carcass ON stock(carcass_id) WHERE carcass_id IS NOT NULL;
CREATE INDEX idx_stock_expires ON stock(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_stock_positive ON stock(organization_id, product_id) WHERE quantity_kg > 0;

-- ============================================================================
-- STOCK MOVEMENTS (Audit trail for all stock changes)
-- ============================================================================

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    stock_id UUID REFERENCES stock(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    zone_id UUID NOT NULL REFERENCES zones(id),

    -- Movement type
    movement_type TEXT NOT NULL, -- 'receive', 'cut', 'produce', 'sell', 'transfer_in', 'transfer_out', 'write_off', 'adjust'

    -- Quantity (positive = in, negative = out)
    quantity_kg NUMERIC(10, 3) NOT NULL,
    unit_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,

    -- Balance after movement
    balance_after_kg NUMERIC(10, 3),

    -- Reference to source document
    reference_type TEXT, -- 'carcass', 'cutting_session', 'production_batch', 'sale', 'transfer', 'write_off', 'adjustment'
    reference_id UUID,

    -- Traceability
    carcass_id UUID REFERENCES carcasses(id),
    grade_id UUID REFERENCES grades(id),
    batch_code TEXT,

    -- Audit
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX idx_stock_movements_stock ON stock_movements(stock_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(organization_id, created_at DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements(organization_id, movement_type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================================================
-- TRANSFERS
-- ============================================================================

CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    transfer_number TEXT NOT NULL, -- Auto-generated

    -- Zones
    from_zone_id UUID NOT NULL REFERENCES zones(id),
    to_zone_id UUID NOT NULL REFERENCES zones(id),

    -- Request
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requested_by UUID NOT NULL REFERENCES user_profiles(id),

    -- Approval (if required)
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES user_profiles(id),

    -- Completion
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled', 'rejected'

    rejection_reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, transfer_number)
);

CREATE INDEX idx_transfers_org ON transfers(organization_id);
CREATE INDEX idx_transfers_status ON transfers(organization_id, status);
CREATE INDEX idx_transfers_date ON transfers(organization_id, requested_at DESC);

-- ============================================================================
-- TRANSFER ITEMS
-- ============================================================================

CREATE TABLE transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    stock_id UUID REFERENCES stock(id), -- Source stock record
    grade_id UUID REFERENCES grades(id),

    -- Quantity
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Cost (for tracking)
    unit_cost NUMERIC(10, 4) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product ON transfer_items(product_id);

-- ============================================================================
-- WRITE-OFFS
-- ============================================================================

CREATE TABLE write_offs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    write_off_number TEXT NOT NULL, -- Auto-generated

    -- When and who
    written_off_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    written_off_by UUID NOT NULL REFERENCES user_profiles(id),

    -- Approval
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES user_profiles(id),

    -- Reason
    reason_category TEXT NOT NULL, -- 'spoilage', 'damage', 'theft', 'expired', 'trimming', 'other'
    reason_details TEXT,

    -- Totals (calculated)
    total_kg NUMERIC(10, 3) DEFAULT 0,
    total_value NUMERIC(12, 2) DEFAULT 0,

    -- Zone
    zone_id UUID NOT NULL REFERENCES zones(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, write_off_number)
);

CREATE INDEX idx_write_offs_org ON write_offs(organization_id);
CREATE INDEX idx_write_offs_date ON write_offs(organization_id, written_off_at DESC);
CREATE INDEX idx_write_offs_reason ON write_offs(organization_id, reason_category);

-- ============================================================================
-- WRITE-OFF ITEMS
-- ============================================================================

CREATE TABLE write_off_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    write_off_id UUID NOT NULL REFERENCES write_offs(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    stock_id UUID REFERENCES stock(id),
    grade_id UUID REFERENCES grades(id),

    -- Quantity
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Value at write-off
    unit_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_value NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_write_off_items_write_off ON write_off_items(write_off_id);
CREATE INDEX idx_write_off_items_product ON write_off_items(product_id);

-- ============================================================================
-- STOCK ADJUSTMENTS
-- ============================================================================

CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    adjustment_number TEXT NOT NULL, -- Auto-generated

    -- When and who
    adjusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    adjusted_by UUID NOT NULL REFERENCES user_profiles(id),

    -- Approval
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES user_profiles(id),

    -- Reason
    reason TEXT NOT NULL,

    -- Zone
    zone_id UUID NOT NULL REFERENCES zones(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'completed',

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, adjustment_number)
);

CREATE INDEX idx_stock_adjustments_org ON stock_adjustments(organization_id);

-- ============================================================================
-- STOCK ADJUSTMENT ITEMS
-- ============================================================================

CREATE TABLE stock_adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    stock_id UUID REFERENCES stock(id),
    grade_id UUID REFERENCES grades(id),

    -- Expected (from system)
    expected_kg NUMERIC(10, 3) NOT NULL,

    -- Actual (from count)
    actual_kg NUMERIC(10, 3) NOT NULL,

    -- Variance
    variance_kg NUMERIC(10, 3) GENERATED ALWAYS AS (actual_kg - expected_kg) STORED,

    -- Value
    unit_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
    variance_value NUMERIC(12, 2) GENERATED ALWAYS AS ((actual_kg - expected_kg) * unit_cost) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_adjustment_items_adjustment ON stock_adjustment_items(stock_adjustment_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update stock
CREATE OR REPLACE FUNCTION update_stock(
    p_organization_id UUID,
    p_product_id UUID,
    p_zone_id UUID,
    p_quantity_change NUMERIC,
    p_unit_cost NUMERIC,
    p_grade_id UUID DEFAULT NULL,
    p_carcass_id UUID DEFAULT NULL,
    p_cutting_session_id UUID DEFAULT NULL,
    p_production_batch_id UUID DEFAULT NULL,
    p_batch_code TEXT DEFAULT NULL,
    p_expires_at DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_stock_id UUID;
    v_current_qty NUMERIC;
    v_current_cost NUMERIC;
    v_new_cost NUMERIC;
BEGIN
    -- Try to find existing stock record
    SELECT id, quantity_kg, unit_cost INTO v_stock_id, v_current_qty, v_current_cost
    FROM stock
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND zone_id = p_zone_id
      AND COALESCE(grade_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_grade_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND COALESCE(carcass_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_carcass_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND COALESCE(cutting_session_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_cutting_session_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND COALESCE(production_batch_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_production_batch_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND COALESCE(batch_code, '') = COALESCE(p_batch_code, '')
    FOR UPDATE;

    IF v_stock_id IS NULL THEN
        -- Insert new stock record
        INSERT INTO stock (
            organization_id, product_id, zone_id, grade_id,
            carcass_id, cutting_session_id, production_batch_id,
            batch_code, quantity_kg, unit_cost, expires_at
        ) VALUES (
            p_organization_id, p_product_id, p_zone_id, p_grade_id,
            p_carcass_id, p_cutting_session_id, p_production_batch_id,
            p_batch_code, p_quantity_change, p_unit_cost, p_expires_at
        )
        RETURNING id INTO v_stock_id;
    ELSE
        -- Calculate weighted average cost for additions
        IF p_quantity_change > 0 THEN
            v_new_cost := (v_current_qty * v_current_cost + p_quantity_change * p_unit_cost) /
                          NULLIF(v_current_qty + p_quantity_change, 0);
        ELSE
            v_new_cost := v_current_cost;
        END IF;

        -- Update existing stock record
        UPDATE stock
        SET quantity_kg = quantity_kg + p_quantity_change,
            unit_cost = COALESCE(v_new_cost, p_unit_cost),
            updated_at = NOW()
        WHERE id = v_stock_id;
    END IF;

    -- Clean up zero or negative stock
    DELETE FROM stock WHERE id = v_stock_id AND quantity_kg <= 0;

    RETURN v_stock_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record stock movement
CREATE OR REPLACE FUNCTION record_stock_movement(
    p_organization_id UUID,
    p_product_id UUID,
    p_zone_id UUID,
    p_movement_type TEXT,
    p_quantity_kg NUMERIC,
    p_unit_cost NUMERIC,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_carcass_id UUID DEFAULT NULL,
    p_grade_id UUID DEFAULT NULL,
    p_batch_code TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_balance NUMERIC;
BEGIN
    -- Get current balance
    SELECT COALESCE(SUM(quantity_kg), 0) INTO v_balance
    FROM stock
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND zone_id = p_zone_id;

    -- Record movement
    INSERT INTO stock_movements (
        organization_id, product_id, zone_id, movement_type,
        quantity_kg, unit_cost, balance_after_kg,
        reference_type, reference_id, carcass_id, grade_id, batch_code,
        created_by, notes
    ) VALUES (
        p_organization_id, p_product_id, p_zone_id, p_movement_type,
        p_quantity_kg, p_unit_cost, v_balance + p_quantity_kg,
        p_reference_type, p_reference_id, p_carcass_id, p_grade_id, p_batch_code,
        auth.uid(), p_notes
    )
    RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate transfer number
CREATE OR REPLACE FUNCTION trigger_set_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transfer_number IS NULL THEN
        NEW.transfer_number := get_next_document_number(
            NEW.organization_id, 'transfer', 'TRF'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transfer_number BEFORE INSERT ON transfers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_transfer_number();

-- Auto-generate write-off number
CREATE OR REPLACE FUNCTION trigger_set_write_off_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.write_off_number IS NULL THEN
        NEW.write_off_number := get_next_document_number(
            NEW.organization_id, 'write_off', 'WOF'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_write_off_number BEFORE INSERT ON write_offs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_write_off_number();

-- Auto-generate adjustment number
CREATE OR REPLACE FUNCTION trigger_set_adjustment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_number IS NULL THEN
        NEW.adjustment_number := get_next_document_number(
            NEW.organization_id, 'stock_adjustment', 'ADJ'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_adjustment_number BEFORE INSERT ON stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_adjustment_number();

-- Update write-off totals
CREATE OR REPLACE FUNCTION trigger_update_write_off_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE write_offs
    SET total_kg = (
            SELECT COALESCE(SUM(quantity_kg), 0)
            FROM write_off_items
            WHERE write_off_id = COALESCE(NEW.write_off_id, OLD.write_off_id)
        ),
        total_value = (
            SELECT COALESCE(SUM(total_value), 0)
            FROM write_off_items
            WHERE write_off_id = COALESCE(NEW.write_off_id, OLD.write_off_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.write_off_id, OLD.write_off_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_write_off_totals AFTER INSERT OR UPDATE OR DELETE ON write_off_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_write_off_totals();

-- Process transfer on completion
CREATE OR REPLACE FUNCTION trigger_process_transfer_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Process each item
        FOR v_item IN SELECT * FROM transfer_items WHERE transfer_id = NEW.id LOOP
            -- Deduct from source zone
            PERFORM update_stock(
                NEW.organization_id,
                v_item.product_id,
                NEW.from_zone_id,
                -v_item.quantity_kg,
                v_item.unit_cost,
                v_item.grade_id
            );

            -- Record movement out
            PERFORM record_stock_movement(
                NEW.organization_id,
                v_item.product_id,
                NEW.from_zone_id,
                'transfer_out',
                -v_item.quantity_kg,
                v_item.unit_cost,
                'transfer',
                NEW.id,
                NULL,
                v_item.grade_id
            );

            -- Add to destination zone
            PERFORM update_stock(
                NEW.organization_id,
                v_item.product_id,
                NEW.to_zone_id,
                v_item.quantity_kg,
                v_item.unit_cost,
                v_item.grade_id
            );

            -- Record movement in
            PERFORM record_stock_movement(
                NEW.organization_id,
                v_item.product_id,
                NEW.to_zone_id,
                'transfer_in',
                v_item.quantity_kg,
                v_item.unit_cost,
                'transfer',
                NEW.id,
                NULL,
                v_item.grade_id
            );
        END LOOP;

        NEW.completed_at := NOW();
        NEW.completed_by := auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_transfer_completion BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION trigger_process_transfer_completion();

-- Process write-off (deduct stock)
CREATE OR REPLACE FUNCTION trigger_process_write_off_item()
RETURNS TRIGGER AS $$
DECLARE
    v_write_off RECORD;
BEGIN
    SELECT * INTO v_write_off FROM write_offs WHERE id = NEW.write_off_id;

    -- Deduct from stock
    PERFORM update_stock(
        v_write_off.organization_id,
        NEW.product_id,
        v_write_off.zone_id,
        -NEW.quantity_kg,
        NEW.unit_cost,
        NEW.grade_id
    );

    -- Record movement
    PERFORM record_stock_movement(
        v_write_off.organization_id,
        NEW.product_id,
        v_write_off.zone_id,
        'write_off',
        -NEW.quantity_kg,
        NEW.unit_cost,
        'write_off',
        NEW.write_off_id,
        NULL,
        NEW.grade_id,
        NULL,
        v_write_off.reason_category || ': ' || COALESCE(v_write_off.reason_details, '')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_write_off_item AFTER INSERT ON write_off_items
    FOR EACH ROW EXECUTE FUNCTION trigger_process_write_off_item();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON write_offs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
