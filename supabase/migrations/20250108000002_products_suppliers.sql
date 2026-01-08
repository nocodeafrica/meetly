-- Migration: Products and Suppliers
-- Description: Product catalog, categories, pricing, and supplier management
-- Date: 2025-01-08

-- ============================================================================
-- SUPPLIERS
-- ============================================================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    code TEXT, -- Short code for quick reference
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,

    -- Payment terms
    payment_terms TEXT, -- e.g., "COD", "Net 30"

    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX idx_suppliers_active ON suppliers(organization_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PRODUCT CATEGORIES
-- ============================================================================

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    code TEXT, -- Short code
    description TEXT,

    -- For hierarchical display
    path TEXT, -- Materialized path like "beef/cuts/steaks"
    depth INTEGER DEFAULT 0,

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, parent_id, name)
);

CREATE INDEX idx_product_categories_org ON product_categories(organization_id);
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX idx_product_categories_path ON product_categories(organization_id, path);

-- ============================================================================
-- PRODUCTS
-- ============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,

    sku TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,

    -- Unit configuration
    unit_of_measure TEXT NOT NULL DEFAULT 'kg', -- 'kg', 'g', 'each'
    sold_by TEXT NOT NULL DEFAULT 'weight', -- 'weight' or 'each'
    default_weight_kg NUMERIC(10, 3), -- For 'each' items, default weight for costing

    -- Product behavior flags
    can_be_produced BOOLEAN DEFAULT FALSE, -- Output of cutting sessions
    can_be_sold BOOLEAN DEFAULT TRUE, -- Available at POS
    is_recipe_output BOOLEAN DEFAULT FALSE, -- Output of processing/recipes
    is_ingredient BOOLEAN DEFAULT FALSE, -- Can be used in recipes
    requires_weighing BOOLEAN DEFAULT TRUE, -- Must weigh at sale

    -- Traceability
    traceability_level TEXT DEFAULT 'batch', -- 'full', 'batch', 'none'

    -- Grading
    grading_scheme_id UUID REFERENCES grading_schemes(id) ON DELETE SET NULL,

    -- Inventory thresholds
    minimum_stock_kg NUMERIC(10, 3) DEFAULT 0,
    reorder_point_kg NUMERIC(10, 3) DEFAULT 0,

    -- Default shelf life in days (for expiry calculation)
    shelf_life_days INTEGER,

    -- Tax
    tax_rate_percent NUMERIC(5, 2) DEFAULT 0,
    is_tax_inclusive BOOLEAN DEFAULT TRUE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, sku)
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(organization_id, sku);
CREATE INDEX idx_products_barcode ON products(organization_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_active ON products(organization_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_search ON products USING gin(name gin_trgm_ops);

-- ============================================================================
-- PRODUCT PRICES
-- ============================================================================

CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    currency_code TEXT NOT NULL DEFAULT 'USD',

    -- Base price (before grade adjustments)
    base_price NUMERIC(12, 2) NOT NULL,

    -- Grade-specific price (optional, overrides base + adjustment calculation)
    grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,

    -- Target margin for reference
    target_margin_percent NUMERIC(5, 2),

    -- Validity
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE, -- NULL means currently active

    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Only one active price per product/currency/grade combination
    UNIQUE(product_id, currency_code, grade_id, effective_from)
);

CREATE INDEX idx_product_prices_product ON product_prices(product_id);
CREATE INDEX idx_product_prices_active ON product_prices(product_id, currency_code, effective_from DESC)
    WHERE effective_to IS NULL;

-- ============================================================================
-- PRODUCT PRICE HISTORY (Audit trail)
-- ============================================================================

CREATE TABLE product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    currency_code TEXT NOT NULL,
    old_price NUMERIC(12, 2),
    new_price NUMERIC(12, 2) NOT NULL,
    grade_id UUID REFERENCES grades(id),

    changed_by UUID REFERENCES user_profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX idx_product_price_history_product ON product_price_history(product_id, changed_at DESC);

-- ============================================================================
-- YIELD TEMPLATES (Expected output from cutting)
-- ============================================================================

CREATE TABLE yield_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL, -- e.g., "Standard Beef Quarter"
    description TEXT,

    -- What this template applies to
    applies_to TEXT NOT NULL DEFAULT 'quarter', -- 'carcass', 'quarter'
    grade_id UUID REFERENCES grades(id), -- Optional: specific to a grade

    -- Total expected yield percentage
    expected_yield_percent NUMERIC(5, 2) DEFAULT 80,

    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_yield_templates_org ON yield_templates(organization_id);

-- ============================================================================
-- YIELD TEMPLATE ITEMS (Products expected from template)
-- ============================================================================

CREATE TABLE yield_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yield_template_id UUID NOT NULL REFERENCES yield_templates(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Expected percentage of input weight
    yield_percent NUMERIC(5, 2) NOT NULL,

    -- Display order
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(yield_template_id, product_id)
);

CREATE INDEX idx_yield_template_items_template ON yield_template_items(yield_template_id);

-- ============================================================================
-- RECIPES (For processing/value-added products)
-- ============================================================================

CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    code TEXT, -- Short code
    description TEXT,

    -- Output product
    output_product_id UUID NOT NULL REFERENCES products(id),

    -- Standard batch size
    standard_batch_size_kg NUMERIC(10, 3) NOT NULL,
    expected_output_kg NUMERIC(10, 3) NOT NULL,
    expected_yield_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE WHEN standard_batch_size_kg > 0
        THEN (expected_output_kg / standard_batch_size_kg) * 100
        ELSE 0 END
    ) STORED,

    -- Labor/overhead factor (multiplier on ingredient cost)
    labor_factor NUMERIC(5, 2) DEFAULT 1.0, -- 1.0 = no markup, 1.2 = 20% markup

    -- Instructions (optional)
    instructions TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_recipes_org ON recipes(organization_id);
CREATE INDEX idx_recipes_output ON recipes(output_product_id);

-- ============================================================================
-- RECIPE INGREDIENTS
-- ============================================================================

CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    -- Quantity for standard batch size
    quantity_kg NUMERIC(10, 3) NOT NULL,

    -- Is this ingredient required?
    is_required BOOLEAN DEFAULT TRUE,

    -- Display order
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(recipe_id, product_id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current product price
CREATE OR REPLACE FUNCTION get_product_price(
    p_product_id UUID,
    p_currency_code TEXT DEFAULT 'USD',
    p_grade_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_price NUMERIC;
    v_base_price NUMERIC;
    v_adjustment NUMERIC;
BEGIN
    -- First try to get grade-specific price
    IF p_grade_id IS NOT NULL THEN
        SELECT base_price INTO v_price
        FROM product_prices
        WHERE product_id = p_product_id
          AND currency_code = p_currency_code
          AND grade_id = p_grade_id
          AND effective_from <= p_date
          AND (effective_to IS NULL OR effective_to >= p_date)
        ORDER BY effective_from DESC
        LIMIT 1;

        IF v_price IS NOT NULL THEN
            RETURN v_price;
        END IF;
    END IF;

    -- Get base price (no grade)
    SELECT base_price INTO v_base_price
    FROM product_prices
    WHERE product_id = p_product_id
      AND currency_code = p_currency_code
      AND grade_id IS NULL
      AND effective_from <= p_date
      AND (effective_to IS NULL OR effective_to >= p_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    -- If grade specified, apply adjustment from grading scheme
    IF p_grade_id IS NOT NULL AND v_base_price IS NOT NULL THEN
        SELECT price_adjustment_percent INTO v_adjustment
        FROM grades
        WHERE id = p_grade_id;

        IF v_adjustment IS NOT NULL THEN
            v_base_price := v_base_price * (1 + v_adjustment / 100);
        END IF;
    END IF;

    RETURN COALESCE(v_base_price, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Track price changes
CREATE OR REPLACE FUNCTION trigger_track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.base_price != NEW.base_price THEN
        INSERT INTO product_price_history (product_id, currency_code, old_price, new_price, grade_id, changed_by)
        VALUES (NEW.product_id, NEW.currency_code, OLD.base_price, NEW.base_price, NEW.grade_id, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_price_change AFTER UPDATE ON product_prices
    FOR EACH ROW EXECUTE FUNCTION trigger_track_price_change();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON yield_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- CATEGORY PATH MANAGEMENT
-- ============================================================================

-- Function to update category path on insert/update
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_path TEXT;
    v_parent_depth INTEGER;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path := NEW.name;
        NEW.depth := 0;
    ELSE
        SELECT path, depth INTO v_parent_path, v_parent_depth
        FROM product_categories
        WHERE id = NEW.parent_id;

        NEW.path := v_parent_path || '/' || NEW.name;
        NEW.depth := v_parent_depth + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_category_path BEFORE INSERT OR UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_category_path();
