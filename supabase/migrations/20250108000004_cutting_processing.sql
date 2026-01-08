-- Migration: Cutting & Processing Module
-- Description: Cutting sessions, outputs, production batches
-- Date: 2025-01-08

-- ============================================================================
-- CUTTING SESSIONS
-- ============================================================================

CREATE TABLE cutting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    session_number TEXT NOT NULL, -- Auto-generated (CUT-MMDD-NN)

    -- Source (either carcass or quarter)
    carcass_id UUID NOT NULL REFERENCES carcasses(id),
    quarter_id UUID REFERENCES carcass_quarters(id), -- Optional, if cutting specific quarter

    -- Session timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_by UUID NOT NULL REFERENCES user_profiles(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Weights
    input_weight_kg NUMERIC(10, 3) NOT NULL,
    total_output_kg NUMERIC(10, 3) DEFAULT 0,
    waste_kg NUMERIC(10, 3) DEFAULT 0,
    yield_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN input_weight_kg > 0 THEN (total_output_kg / input_weight_kg) * 100 ELSE 0 END
    ) STORED,

    -- Cost allocation (proportional from carcass/quarter)
    allocated_cost NUMERIC(12, 2) NOT NULL,
    cost_per_kg_output NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN total_output_kg > 0 THEN allocated_cost / total_output_kg ELSE 0 END
    ) STORED,

    -- Destination
    destination_zone_id UUID NOT NULL REFERENCES zones(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, session_number)
);

CREATE INDEX idx_cutting_sessions_org ON cutting_sessions(organization_id);
CREATE INDEX idx_cutting_sessions_carcass ON cutting_sessions(carcass_id);
CREATE INDEX idx_cutting_sessions_quarter ON cutting_sessions(quarter_id);
CREATE INDEX idx_cutting_sessions_status ON cutting_sessions(organization_id, status);
CREATE INDEX idx_cutting_sessions_date ON cutting_sessions(organization_id, started_at DESC);
CREATE INDEX idx_cutting_sessions_blockman ON cutting_sessions(started_by, started_at DESC);

-- ============================================================================
-- CUTTING OUTPUTS
-- ============================================================================

CREATE TABLE cutting_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cutting_session_id UUID NOT NULL REFERENCES cutting_sessions(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    grade_id UUID REFERENCES grades(id),

    -- Quantity
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Cost (allocated from session)
    unit_cost NUMERIC(10, 4) DEFAULT 0,
    total_cost NUMERIC(12, 2) DEFAULT 0,

    -- Traceability
    batch_code TEXT, -- For batch-level traceability

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cutting_outputs_session ON cutting_outputs(cutting_session_id);
CREATE INDEX idx_cutting_outputs_product ON cutting_outputs(product_id);

-- ============================================================================
-- PRODUCTION BATCHES (Recipe-based processing)
-- ============================================================================

CREATE TABLE production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    batch_number TEXT NOT NULL, -- Auto-generated (PRD-MMDD-NN)
    recipe_id UUID NOT NULL REFERENCES recipes(id),

    -- Batch timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_by UUID NOT NULL REFERENCES user_profiles(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Quantities
    target_output_kg NUMERIC(10, 3) NOT NULL, -- Planned output
    actual_output_kg NUMERIC(10, 3) DEFAULT 0,
    total_input_kg NUMERIC(10, 3) DEFAULT 0,
    yield_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN total_input_kg > 0 THEN (actual_output_kg / total_input_kg) * 100 ELSE 0 END
    ) STORED,

    -- Costs
    ingredient_cost NUMERIC(12, 2) DEFAULT 0,
    labor_cost NUMERIC(12, 2) DEFAULT 0, -- Calculated from recipe labor_factor
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (ingredient_cost + labor_cost) STORED,
    cost_per_kg NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN actual_output_kg > 0 THEN (ingredient_cost + labor_cost) / actual_output_kg ELSE 0 END
    ) STORED,

    -- Destination
    destination_zone_id UUID NOT NULL REFERENCES zones(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, batch_number)
);

CREATE INDEX idx_production_batches_org ON production_batches(organization_id);
CREATE INDEX idx_production_batches_recipe ON production_batches(recipe_id);
CREATE INDEX idx_production_batches_status ON production_batches(organization_id, status);
CREATE INDEX idx_production_batches_date ON production_batches(organization_id, started_at DESC);

-- ============================================================================
-- BATCH INPUTS (Ingredients consumed)
-- ============================================================================

CREATE TABLE batch_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),

    -- Quantity consumed
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Cost (from stock)
    unit_cost NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,

    -- Source stock (for traceability)
    stock_id UUID, -- Will reference stock table

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_inputs_batch ON batch_inputs(production_batch_id);
CREATE INDEX idx_batch_inputs_product ON batch_inputs(product_id);

-- ============================================================================
-- BATCH OUTPUTS
-- ============================================================================

CREATE TABLE batch_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    grade_id UUID REFERENCES grades(id),

    -- Quantity produced
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Cost (allocated from batch)
    unit_cost NUMERIC(10, 4) DEFAULT 0,
    total_cost NUMERIC(12, 2) DEFAULT 0,

    -- Batch code for traceability
    batch_code TEXT,

    -- Expiry (calculated from recipe product shelf life)
    expires_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_outputs_batch ON batch_outputs(production_batch_id);
CREATE INDEX idx_batch_outputs_product ON batch_outputs(product_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate session number
CREATE OR REPLACE FUNCTION trigger_set_cutting_session_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_number IS NULL THEN
        NEW.session_number := get_next_document_number(
            NEW.organization_id, 'cutting_session', 'CUT'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cutting_session_number BEFORE INSERT ON cutting_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_cutting_session_number();

-- Auto-generate batch number
CREATE OR REPLACE FUNCTION trigger_set_batch_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.batch_number IS NULL THEN
        NEW.batch_number := get_next_document_number(
            NEW.organization_id, 'production_batch', 'PRD'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_batch_number BEFORE INSERT ON production_batches
    FOR EACH ROW EXECUTE FUNCTION trigger_set_batch_number();

-- Update cutting session totals when output added
CREATE OR REPLACE FUNCTION trigger_update_cutting_session_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_session RECORD;
    v_cost_per_kg NUMERIC;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update session total
        UPDATE cutting_sessions
        SET total_output_kg = total_output_kg + NEW.quantity_kg,
            updated_at = NOW()
        WHERE id = NEW.cutting_session_id;

        -- Get session details for cost allocation
        SELECT * INTO v_session FROM cutting_sessions WHERE id = NEW.cutting_session_id;

        -- Calculate and update cost per kg
        IF v_session.total_output_kg > 0 THEN
            v_cost_per_kg := v_session.allocated_cost / v_session.total_output_kg;

            -- Update all outputs with new cost per kg
            UPDATE cutting_outputs
            SET unit_cost = v_cost_per_kg,
                total_cost = quantity_kg * v_cost_per_kg
            WHERE cutting_session_id = NEW.cutting_session_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE cutting_sessions
        SET total_output_kg = total_output_kg - OLD.quantity_kg,
            updated_at = NOW()
        WHERE id = OLD.cutting_session_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cutting_session_totals AFTER INSERT OR DELETE ON cutting_outputs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_cutting_session_totals();

-- Update carcass totals when cutting session completed
CREATE OR REPLACE FUNCTION trigger_update_carcass_on_cutting_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update carcass output totals
        UPDATE carcasses
        SET total_output_kg = (
                SELECT COALESCE(SUM(total_output_kg), 0)
                FROM cutting_sessions
                WHERE carcass_id = NEW.carcass_id AND status = 'completed'
            ),
            waste_kg = (
                SELECT COALESCE(SUM(waste_kg), 0)
                FROM cutting_sessions
                WHERE carcass_id = NEW.carcass_id AND status = 'completed'
            ),
            updated_at = NOW()
        WHERE id = NEW.carcass_id;

        -- Update quarter if applicable
        IF NEW.quarter_id IS NOT NULL THEN
            UPDATE carcass_quarters
            SET total_output_kg = NEW.total_output_kg,
                status = 'completed',
                updated_at = NOW()
            WHERE id = NEW.quarter_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carcass_on_cutting_complete AFTER UPDATE ON cutting_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_carcass_on_cutting_complete();

-- Update production batch totals when input added
CREATE OR REPLACE FUNCTION trigger_update_batch_input_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE production_batches
        SET total_input_kg = total_input_kg + NEW.quantity_kg,
            ingredient_cost = ingredient_cost + NEW.total_cost,
            updated_at = NOW()
        WHERE id = NEW.production_batch_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE production_batches
        SET total_input_kg = total_input_kg - OLD.quantity_kg,
            ingredient_cost = ingredient_cost - OLD.total_cost,
            updated_at = NOW()
        WHERE id = OLD.production_batch_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_batch_input_totals AFTER INSERT OR DELETE ON batch_inputs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_batch_input_totals();

-- Update production batch totals when output added
CREATE OR REPLACE FUNCTION trigger_update_batch_output_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_batch RECORD;
    v_cost_per_kg NUMERIC;
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE production_batches
        SET actual_output_kg = actual_output_kg + NEW.quantity_kg,
            updated_at = NOW()
        WHERE id = NEW.production_batch_id;

        -- Update cost allocation
        SELECT * INTO v_batch FROM production_batches WHERE id = NEW.production_batch_id;

        IF v_batch.actual_output_kg > 0 THEN
            v_cost_per_kg := v_batch.total_cost / v_batch.actual_output_kg;

            UPDATE batch_outputs
            SET unit_cost = v_cost_per_kg,
                total_cost = quantity_kg * v_cost_per_kg
            WHERE production_batch_id = NEW.production_batch_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE production_batches
        SET actual_output_kg = actual_output_kg - OLD.quantity_kg,
            updated_at = NOW()
        WHERE id = OLD.production_batch_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_batch_output_totals AFTER INSERT OR DELETE ON batch_outputs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_batch_output_totals();

-- Calculate labor cost when batch completed
CREATE OR REPLACE FUNCTION trigger_calculate_batch_labor_cost()
RETURNS TRIGGER AS $$
DECLARE
    v_labor_factor NUMERIC;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Get labor factor from recipe
        SELECT labor_factor INTO v_labor_factor
        FROM recipes
        WHERE id = NEW.recipe_id;

        -- Calculate labor cost as (labor_factor - 1) * ingredient_cost
        -- e.g., labor_factor of 1.2 means 20% markup
        NEW.labor_cost := NEW.ingredient_cost * (COALESCE(v_labor_factor, 1) - 1);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_batch_labor_cost BEFORE UPDATE ON production_batches
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_batch_labor_cost();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cutting_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON production_batches
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
