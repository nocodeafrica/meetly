-- Migration: Receiving Module
-- Description: Animals, carcasses, slaughter events, quarters
-- Date: 2025-01-08

-- ============================================================================
-- ANIMALS (For live animal intake before slaughter)
-- ============================================================================

CREATE TABLE animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identification
    animal_number TEXT NOT NULL, -- Auto-generated
    tag_number TEXT, -- Ear tag or other ID
    animal_type TEXT NOT NULL DEFAULT 'cattle', -- 'cattle', 'pig', 'sheep', etc.
    breed TEXT,

    -- Source
    supplier_id UUID REFERENCES suppliers(id),

    -- Intake
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by UUID REFERENCES user_profiles(id),
    live_weight_kg NUMERIC(10, 3) NOT NULL,

    -- Cost
    cost_total NUMERIC(12, 2) NOT NULL,
    cost_per_kg NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN live_weight_kg > 0 THEN cost_total / live_weight_kg ELSE 0 END
    ) STORED,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'slaughtered', 'cancelled'

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, animal_number)
);

CREATE INDEX idx_animals_org ON animals(organization_id);
CREATE INDEX idx_animals_status ON animals(organization_id, status);
CREATE INDEX idx_animals_supplier ON animals(supplier_id);

-- ============================================================================
-- SLAUGHTER EVENTS
-- ============================================================================

CREATE TABLE slaughter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,

    slaughter_number TEXT NOT NULL, -- Auto-generated

    slaughtered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    slaughtered_by UUID REFERENCES user_profiles(id),

    -- Weights
    live_weight_kg NUMERIC(10, 3) NOT NULL, -- Should match animal
    carcass_weight_kg NUMERIC(10, 3) NOT NULL, -- Post-slaughter weight
    dressing_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN live_weight_kg > 0 THEN (carcass_weight_kg / live_weight_kg) * 100 ELSE 0 END
    ) STORED,

    -- Inspection
    inspection_passed BOOLEAN DEFAULT TRUE,
    inspection_notes TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, slaughter_number),
    UNIQUE(animal_id) -- One slaughter event per animal
);

CREATE INDEX idx_slaughter_events_org ON slaughter_events(organization_id);
CREATE INDEX idx_slaughter_events_animal ON slaughter_events(animal_id);

-- ============================================================================
-- CARCASSES
-- ============================================================================

CREATE TABLE carcasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    carcass_number TEXT NOT NULL, -- Auto-generated (CAR-MMDD-NN)

    -- Source
    source_type TEXT NOT NULL, -- 'purchased' or 'slaughtered'
    supplier_id UUID REFERENCES suppliers(id), -- For purchased carcasses
    animal_id UUID REFERENCES animals(id), -- For slaughtered animals
    slaughter_event_id UUID REFERENCES slaughter_events(id), -- Link to slaughter

    -- Receiving
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by UUID REFERENCES user_profiles(id),

    -- Weight and grading
    weight_kg NUMERIC(10, 3) NOT NULL,
    grade_id UUID REFERENCES grades(id),

    -- Cost
    cost_total NUMERIC(12, 2) NOT NULL,
    cost_per_kg NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN weight_kg > 0 THEN cost_total / weight_kg ELSE 0 END
    ) STORED,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'quartered', 'processing', 'completed'
    quarters_count INTEGER DEFAULT 0,

    -- Yield tracking (updated by triggers)
    total_output_kg NUMERIC(10, 3) DEFAULT 0,
    waste_kg NUMERIC(10, 3) DEFAULT 0,
    yield_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN weight_kg > 0 THEN (total_output_kg / weight_kg) * 100 ELSE 0 END
    ) STORED,

    -- Financial tracking (updated by triggers)
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    realized_margin NUMERIC(12, 2) GENERATED ALWAYS AS (total_revenue - cost_total) STORED,
    margin_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN total_revenue > 0 THEN ((total_revenue - cost_total) / total_revenue) * 100 ELSE 0 END
    ) STORED,

    -- Destination zone for products
    destination_zone_id UUID REFERENCES zones(id),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, carcass_number)
);

CREATE INDEX idx_carcasses_org ON carcasses(organization_id);
CREATE INDEX idx_carcasses_status ON carcasses(organization_id, status);
CREATE INDEX idx_carcasses_supplier ON carcasses(supplier_id);
CREATE INDEX idx_carcasses_date ON carcasses(organization_id, received_at DESC);
CREATE INDEX idx_carcasses_grade ON carcasses(grade_id);

-- ============================================================================
-- CARCASS QUARTERS
-- ============================================================================

CREATE TABLE carcass_quarters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carcass_id UUID NOT NULL REFERENCES carcasses(id) ON DELETE CASCADE,

    quarter_number INTEGER NOT NULL, -- 1-4
    quarter_type TEXT NOT NULL, -- 'fore_left', 'fore_right', 'hind_left', 'hind_right'

    weight_kg NUMERIC(10, 3) NOT NULL,

    -- Cost allocation (proportional to weight)
    allocated_cost NUMERIC(12, 2) NOT NULL,
    cost_per_kg NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN weight_kg > 0 THEN allocated_cost / weight_kg ELSE 0 END
    ) STORED,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed'

    -- Yield tracking
    total_output_kg NUMERIC(10, 3) DEFAULT 0,
    yield_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN weight_kg > 0 THEN (total_output_kg / weight_kg) * 100 ELSE 0 END
    ) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(carcass_id, quarter_number)
);

CREATE INDEX idx_carcass_quarters_carcass ON carcass_quarters(carcass_id);
CREATE INDEX idx_carcass_quarters_status ON carcass_quarters(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate carcass number
CREATE OR REPLACE FUNCTION trigger_set_carcass_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.carcass_number IS NULL THEN
        NEW.carcass_number := get_next_document_number(
            NEW.organization_id, 'carcass', 'CAR'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_carcass_number BEFORE INSERT ON carcasses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_carcass_number();

-- Auto-generate animal number
CREATE OR REPLACE FUNCTION trigger_set_animal_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.animal_number IS NULL THEN
        NEW.animal_number := get_next_document_number(
            NEW.organization_id, 'animal', 'ANI'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_animal_number BEFORE INSERT ON animals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_animal_number();

-- Auto-generate slaughter number
CREATE OR REPLACE FUNCTION trigger_set_slaughter_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slaughter_number IS NULL THEN
        NEW.slaughter_number := get_next_document_number(
            NEW.organization_id, 'slaughter', 'SLA'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_slaughter_number BEFORE INSERT ON slaughter_events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_slaughter_number();

-- Update animal status on slaughter
CREATE OR REPLACE FUNCTION trigger_animal_slaughtered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE animals
    SET status = 'slaughtered',
        updated_at = NOW()
    WHERE id = NEW.animal_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER animal_slaughtered AFTER INSERT ON slaughter_events
    FOR EACH ROW EXECUTE FUNCTION trigger_animal_slaughtered();

-- Update carcass quarters count
CREATE OR REPLACE FUNCTION trigger_update_quarters_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE carcasses
        SET quarters_count = quarters_count + 1,
            status = CASE WHEN quarters_count + 1 >= 4 THEN 'quartered' ELSE status END,
            updated_at = NOW()
        WHERE id = NEW.carcass_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE carcasses
        SET quarters_count = quarters_count - 1,
            updated_at = NOW()
        WHERE id = OLD.carcass_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quarters_count AFTER INSERT OR DELETE ON carcass_quarters
    FOR EACH ROW EXECUTE FUNCTION trigger_update_quarters_count();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON animals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON carcasses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON carcass_quarters
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create quarters for a carcass
CREATE OR REPLACE FUNCTION create_carcass_quarters(
    p_carcass_id UUID,
    p_weights NUMERIC[] DEFAULT NULL -- Optional array of 4 weights
) RETURNS VOID AS $$
DECLARE
    v_carcass RECORD;
    v_quarter_weight NUMERIC;
    v_quarter_types TEXT[] := ARRAY['fore_left', 'fore_right', 'hind_left', 'hind_right'];
    i INTEGER;
BEGIN
    -- Get carcass details
    SELECT * INTO v_carcass FROM carcasses WHERE id = p_carcass_id;

    IF v_carcass IS NULL THEN
        RAISE EXCEPTION 'Carcass not found';
    END IF;

    -- If no weights provided, divide evenly
    IF p_weights IS NULL THEN
        v_quarter_weight := v_carcass.weight_kg / 4;

        FOR i IN 1..4 LOOP
            INSERT INTO carcass_quarters (
                carcass_id, quarter_number, quarter_type, weight_kg, allocated_cost
            ) VALUES (
                p_carcass_id,
                i,
                v_quarter_types[i],
                v_quarter_weight,
                v_carcass.cost_total / 4
            );
        END LOOP;
    ELSE
        -- Use provided weights
        IF array_length(p_weights, 1) != 4 THEN
            RAISE EXCEPTION 'Must provide exactly 4 weights';
        END IF;

        FOR i IN 1..4 LOOP
            INSERT INTO carcass_quarters (
                carcass_id, quarter_number, quarter_type, weight_kg, allocated_cost
            ) VALUES (
                p_carcass_id,
                i,
                v_quarter_types[i],
                p_weights[i],
                v_carcass.cost_total * (p_weights[i] / v_carcass.weight_kg)
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
