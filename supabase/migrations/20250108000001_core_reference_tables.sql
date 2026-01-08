-- Migration: Core Reference Tables
-- Description: Organizations, users, roles, currencies, zones, grading schemes
-- Date: 2025-01-08

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trading_name TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Zimbabwe',
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    logo_url TEXT,
    base_currency_code TEXT NOT NULL DEFAULT 'USD',

    -- Operating hours stored as JSONB
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "18:00", "is_open": true},
        "tuesday": {"open": "08:00", "close": "18:00", "is_open": true},
        "wednesday": {"open": "08:00", "close": "18:00", "is_open": true},
        "thursday": {"open": "08:00", "close": "18:00", "is_open": true},
        "friday": {"open": "08:00", "close": "18:00", "is_open": true},
        "saturday": {"open": "08:00", "close": "14:00", "is_open": true},
        "sunday": {"open": null, "close": null, "is_open": false}
    }'::jsonb,

    -- Settings
    settings JSONB DEFAULT '{
        "variance_warning_threshold": 0.5,
        "variance_critical_threshold": 2.0,
        "auto_print_receipt": true,
        "receipt_paper_width": "80mm"
    }'::jsonb,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active organizations
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ROLES (Fixed set of roles)
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN DEFAULT TRUE, -- System roles cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions) VALUES
('admin', 'Administrator', 'Full access to all features including settings and user management', '{
    "receiving": {"view": true, "create": true, "edit": true, "delete": true},
    "cutting": {"view": true, "create": true, "edit": true, "delete": true},
    "processing": {"view": true, "create": true, "edit": true, "delete": true},
    "stock": {"view": true, "create": true, "edit": true, "delete": true, "transfer": true, "approve_transfer": true, "adjust": true},
    "pos": {"view": true, "sell": true, "discount": true, "discount_limit": 100, "void": true, "view_all_sales": true},
    "reconciliation": {"view": true, "start": true, "count": true, "close": true},
    "reports": {"operational": true, "financial": true, "export": true},
    "settings": {"view": true, "edit": true},
    "users": {"view": true, "create": true, "edit": true, "delete": true}
}'::jsonb),
('supervisor', 'Supervisor', 'Operations management with approval capabilities', '{
    "receiving": {"view": true, "create": true, "edit": true, "delete": false},
    "cutting": {"view": true, "create": true, "edit": true, "delete": false},
    "processing": {"view": true, "create": true, "edit": true, "delete": false},
    "stock": {"view": true, "create": true, "edit": true, "delete": false, "transfer": true, "approve_transfer": true, "adjust": false},
    "pos": {"view": true, "sell": true, "discount": true, "discount_limit": 50, "void": true, "view_all_sales": true},
    "reconciliation": {"view": true, "start": true, "count": true, "close": true},
    "reports": {"operational": true, "financial": true, "export": true},
    "settings": {"view": true, "edit": false},
    "users": {"view": true, "create": false, "edit": false, "delete": false}
}'::jsonb),
('blockman', 'Blockman', 'Cutting and processing operations', '{
    "receiving": {"view": true, "create": false, "edit": false, "delete": false},
    "cutting": {"view": true, "create": true, "edit": true, "delete": false},
    "processing": {"view": true, "create": true, "edit": true, "delete": false},
    "stock": {"view": true, "create": false, "edit": false, "delete": false, "transfer": false, "approve_transfer": false, "adjust": false},
    "pos": {"view": false, "sell": false, "discount": false, "discount_limit": 0, "void": false, "view_all_sales": false},
    "reconciliation": {"view": false, "start": false, "count": true, "close": false},
    "reports": {"operational": false, "financial": false, "export": false},
    "settings": {"view": false, "edit": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false}
}'::jsonb),
('cashier', 'Cashier', 'Point of sale operations', '{
    "receiving": {"view": false, "create": false, "edit": false, "delete": false},
    "cutting": {"view": false, "create": false, "edit": false, "delete": false},
    "processing": {"view": false, "create": false, "edit": false, "delete": false},
    "stock": {"view": true, "create": false, "edit": false, "delete": false, "transfer": false, "approve_transfer": false, "adjust": false},
    "pos": {"view": true, "sell": true, "discount": true, "discount_limit": 10, "void": false, "view_all_sales": false},
    "reconciliation": {"view": false, "start": false, "count": false, "close": false},
    "reports": {"operational": false, "financial": false, "export": false},
    "settings": {"view": false, "edit": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false}
}'::jsonb),
('server', 'Server', 'Order taking with limited POS access', '{
    "receiving": {"view": false, "create": false, "edit": false, "delete": false},
    "cutting": {"view": false, "create": false, "edit": false, "delete": false},
    "processing": {"view": false, "create": false, "edit": false, "delete": false},
    "stock": {"view": true, "create": false, "edit": false, "delete": false, "transfer": false, "approve_transfer": false, "adjust": false},
    "pos": {"view": true, "sell": false, "discount": false, "discount_limit": 0, "void": false, "view_all_sales": false},
    "reconciliation": {"view": false, "start": false, "count": false, "close": false},
    "reports": {"operational": false, "financial": false, "export": false},
    "settings": {"view": false, "edit": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false}
}'::jsonb);

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    -- PIN for quick POS access (hashed)
    pin_hash TEXT,

    -- Avatar
    avatar_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_active ON user_profiles(organization_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- USER ROLES (Junction table)
-- ============================================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES user_profiles(id),

    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- ============================================================================
-- CURRENCIES
-- ============================================================================

CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    code TEXT NOT NULL, -- ISO 4217 code (USD, ZWL)
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimal_places INTEGER DEFAULT 2,

    is_base BOOLEAN DEFAULT FALSE, -- Base currency for the organization
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, code)
);

CREATE INDEX idx_currencies_org ON currencies(organization_id);

-- ============================================================================
-- EXCHANGE RATES
-- ============================================================================

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    from_currency_code TEXT NOT NULL,
    to_currency_code TEXT NOT NULL,
    rate NUMERIC(15, 6) NOT NULL, -- 1 from_currency = rate to_currency

    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Audit
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Only one rate per currency pair per day
    UNIQUE(organization_id, from_currency_code, to_currency_code, effective_date)
);

CREATE INDEX idx_exchange_rates_org_date ON exchange_rates(organization_id, effective_date DESC);
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(organization_id, from_currency_code, to_currency_code, effective_date DESC);

-- ============================================================================
-- ZONES (Stock locations)
-- ============================================================================

CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    code TEXT NOT NULL, -- Short code for display
    description TEXT,

    zone_type TEXT NOT NULL DEFAULT 'storage', -- 'storage', 'display', 'processing', 'frozen'
    temperature_min NUMERIC(5, 2), -- Celsius
    temperature_max NUMERIC(5, 2),

    -- Behavior flags
    is_default_receiving BOOLEAN DEFAULT FALSE, -- Default zone for receiving
    is_pos_zone BOOLEAN DEFAULT FALSE, -- Can sell from this zone
    allows_transfers BOOLEAN DEFAULT TRUE,

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, code)
);

CREATE INDEX idx_zones_org ON zones(organization_id);
CREATE INDEX idx_zones_active ON zones(organization_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- GRADING SCHEMES
-- ============================================================================

CREATE TABLE grading_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    applies_to TEXT NOT NULL DEFAULT 'carcass', -- 'carcass', 'cut', 'both'

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_grading_schemes_org ON grading_schemes(organization_id);

-- ============================================================================
-- GRADES
-- ============================================================================

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grading_scheme_id UUID NOT NULL REFERENCES grading_schemes(id) ON DELETE CASCADE,

    code TEXT NOT NULL, -- Short code (S, C, CM, M)
    name TEXT NOT NULL, -- Display name (Super, Choice, Commercial, Manufacturing)
    description TEXT,

    -- Price adjustment (percentage from base price)
    price_adjustment_percent NUMERIC(5, 2) DEFAULT 0, -- +15 for premium, -10 for economy

    -- Yield expectations
    expected_yield_percent NUMERIC(5, 2), -- Expected yield for this grade

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(grading_scheme_id, code)
);

CREATE INDEX idx_grades_scheme ON grades(grading_scheme_id);

-- ============================================================================
-- DOCUMENT SEQUENCES (Auto-numbering)
-- ============================================================================

CREATE TABLE document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    document_type TEXT NOT NULL, -- 'carcass', 'cutting_session', 'sale', etc.
    sequence_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_number INTEGER NOT NULL DEFAULT 0,

    UNIQUE(organization_id, document_type, sequence_date)
);

CREATE INDEX idx_document_sequences_lookup ON document_sequences(organization_id, document_type, sequence_date);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'

    old_data JSONB,
    new_data JSONB,

    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned index for efficient querying
CREATE INDEX idx_audit_logs_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get next document number
CREATE OR REPLACE FUNCTION get_next_document_number(
    p_organization_id UUID,
    p_document_type TEXT,
    p_prefix TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_sequence INTEGER;
    v_date_part TEXT;
    v_number TEXT;
BEGIN
    -- Get date part
    v_date_part := TO_CHAR(CURRENT_DATE, 'MMDD');

    -- Insert or update sequence
    INSERT INTO document_sequences (organization_id, document_type, sequence_date, last_number)
    VALUES (p_organization_id, p_document_type, CURRENT_DATE, 1)
    ON CONFLICT (organization_id, document_type, sequence_date)
    DO UPDATE SET last_number = document_sequences.last_number + 1
    RETURNING last_number INTO v_sequence;

    -- Format: PREFIX-MMDD-SEQ (e.g., CAR-0108-01)
    v_number := COALESCE(p_prefix, UPPER(LEFT(p_document_type, 3))) || '-' ||
                v_date_part || '-' || LPAD(v_sequence::TEXT, 2, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get current exchange rate
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_organization_id UUID,
    p_from_currency TEXT,
    p_to_currency TEXT,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    -- Same currency = 1
    IF p_from_currency = p_to_currency THEN
        RETURN 1;
    END IF;

    -- Get most recent rate on or before the given date
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE organization_id = p_organization_id
      AND from_currency_code = p_from_currency
      AND to_currency_code = p_to_currency
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;

    -- If no direct rate, try inverse
    IF v_rate IS NULL THEN
        SELECT 1.0 / rate INTO v_rate
        FROM exchange_rates
        WHERE organization_id = p_organization_id
          AND from_currency_code = p_to_currency
          AND to_currency_code = p_from_currency
          AND effective_date <= p_date
        ORDER BY effective_date DESC
        LIMIT 1;
    END IF;

    RETURN COALESCE(v_rate, 1);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON grading_schemes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
