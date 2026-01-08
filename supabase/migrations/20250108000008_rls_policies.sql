-- Migration: Row Level Security Policies
-- Description: RLS policies for all tables to ensure data isolation
-- Date: 2025-01-08

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION auth.user_has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND r.name = role_name
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user has any of the specified roles
CREATE OR REPLACE FUNCTION auth.user_has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND r.name = ANY(role_names)
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE slaughter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE carcasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carcass_quarters ENABLE ROW LEVEL SECURITY;

ALTER TABLE cutting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_outputs ENABLE ROW LEVEL SECURITY;

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_off_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_sales ENABLE ROW LEVEL SECURITY;

ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_count_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variance_reasons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

-- Users can only see their own organization
CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (id = auth.user_organization_id());

-- Only admins can update organization
CREATE POLICY organizations_update ON organizations
    FOR UPDATE USING (
        id = auth.user_organization_id()
        AND auth.user_has_role('admin')
    );

-- ============================================================================
-- USER PROFILES
-- ============================================================================

-- Users can see profiles in their organization
CREATE POLICY user_profiles_select ON user_profiles
    FOR SELECT USING (organization_id = auth.user_organization_id());

-- Users can update their own profile
CREATE POLICY user_profiles_update_self ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Admins can update any profile in their org
CREATE POLICY user_profiles_update_admin ON user_profiles
    FOR UPDATE USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_role('admin')
    );

-- Admins can insert profiles
CREATE POLICY user_profiles_insert ON user_profiles
    FOR INSERT WITH CHECK (
        organization_id = auth.user_organization_id()
        AND auth.user_has_role('admin')
    );

-- ============================================================================
-- USER ROLES
-- ============================================================================

-- Users can see role assignments in their organization
CREATE POLICY user_roles_select ON user_roles
    FOR SELECT USING (
        user_id IN (SELECT id FROM user_profiles WHERE organization_id = auth.user_organization_id())
    );

-- Only admins can manage role assignments
CREATE POLICY user_roles_all ON user_roles
    FOR ALL USING (
        auth.user_has_role('admin')
        AND user_id IN (SELECT id FROM user_profiles WHERE organization_id = auth.user_organization_id())
    );

-- ============================================================================
-- REFERENCE DATA (currencies, zones, grading, etc.)
-- ============================================================================

-- All authenticated users can view reference data for their org
CREATE POLICY currencies_select ON currencies
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY exchange_rates_select ON exchange_rates
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY zones_select ON zones
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY grading_schemes_select ON grading_schemes
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY grades_select ON grades
    FOR SELECT USING (
        grading_scheme_id IN (SELECT id FROM grading_schemes WHERE organization_id = auth.user_organization_id())
    );

-- Admin/Supervisor can manage reference data
CREATE POLICY currencies_manage ON currencies
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY exchange_rates_manage ON exchange_rates
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY zones_manage ON zones
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY grading_schemes_manage ON grading_schemes
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY grades_manage ON grades
    FOR ALL USING (
        grading_scheme_id IN (SELECT id FROM grading_schemes WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

-- ============================================================================
-- PRODUCTS & SUPPLIERS
-- ============================================================================

-- All can view products
CREATE POLICY products_select ON products
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY product_categories_select ON product_categories
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY product_prices_select ON product_prices
    FOR SELECT USING (
        product_id IN (SELECT id FROM products WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY suppliers_select ON suppliers
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY recipes_select ON recipes
    FOR SELECT USING (organization_id = auth.user_organization_id());

-- Admin/Supervisor can manage
CREATE POLICY products_manage ON products
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY product_categories_manage ON product_categories
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY product_prices_manage ON product_prices
    FOR ALL USING (
        product_id IN (SELECT id FROM products WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY suppliers_manage ON suppliers
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY recipes_manage ON recipes
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY recipe_ingredients_manage ON recipe_ingredients
    FOR ALL USING (
        recipe_id IN (SELECT id FROM recipes WHERE organization_id = auth.user_organization_id())
    );

-- ============================================================================
-- RECEIVING (Carcasses, Animals)
-- ============================================================================

-- Admin/Supervisor can manage receiving
CREATE POLICY animals_select ON animals
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY animals_manage ON animals
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY carcasses_select ON carcasses
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY carcasses_manage ON carcasses
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY carcass_quarters_select ON carcass_quarters
    FOR SELECT USING (
        carcass_id IN (SELECT id FROM carcasses WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY carcass_quarters_manage ON carcass_quarters
    FOR ALL USING (
        carcass_id IN (SELECT id FROM carcasses WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY slaughter_events_select ON slaughter_events
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY slaughter_events_manage ON slaughter_events
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

-- ============================================================================
-- CUTTING & PROCESSING
-- ============================================================================

-- Admin/Supervisor/Blockman can manage cutting sessions
CREATE POLICY cutting_sessions_select ON cutting_sessions
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY cutting_sessions_manage ON cutting_sessions
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'blockman'])
    );

CREATE POLICY cutting_outputs_select ON cutting_outputs
    FOR SELECT USING (
        cutting_session_id IN (SELECT id FROM cutting_sessions WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY cutting_outputs_manage ON cutting_outputs
    FOR ALL USING (
        cutting_session_id IN (SELECT id FROM cutting_sessions WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'blockman'])
    );

CREATE POLICY production_batches_select ON production_batches
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY production_batches_manage ON production_batches
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'blockman'])
    );

CREATE POLICY batch_inputs_manage ON batch_inputs
    FOR ALL USING (
        production_batch_id IN (SELECT id FROM production_batches WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY batch_outputs_manage ON batch_outputs
    FOR ALL USING (
        production_batch_id IN (SELECT id FROM production_batches WHERE organization_id = auth.user_organization_id())
    );

-- ============================================================================
-- STOCK & INVENTORY
-- ============================================================================

-- All authenticated users can view stock
CREATE POLICY stock_select ON stock
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY stock_movements_select ON stock_movements
    FOR SELECT USING (organization_id = auth.user_organization_id());

-- Admin/Supervisor can manage stock
CREATE POLICY stock_manage ON stock
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

-- Transfers
CREATE POLICY transfers_select ON transfers
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY transfers_create ON transfers
    FOR INSERT WITH CHECK (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY transfers_update ON transfers
    FOR UPDATE USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY transfer_items_manage ON transfer_items
    FOR ALL USING (
        transfer_id IN (SELECT id FROM transfers WHERE organization_id = auth.user_organization_id())
    );

-- Write-offs
CREATE POLICY write_offs_select ON write_offs
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY write_offs_manage ON write_offs
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY write_off_items_manage ON write_off_items
    FOR ALL USING (
        write_off_id IN (SELECT id FROM write_offs WHERE organization_id = auth.user_organization_id())
    );

-- Adjustments (Admin only)
CREATE POLICY stock_adjustments_select ON stock_adjustments
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY stock_adjustments_manage ON stock_adjustments
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_role('admin')
    );

-- ============================================================================
-- SALES
-- ============================================================================

-- Cashiers can see all sales in their org, create new sales
CREATE POLICY sales_select ON sales
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY sales_insert ON sales
    FOR INSERT WITH CHECK (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'cashier'])
    );

-- Cashiers can update their own sales (for completing payment)
CREATE POLICY sales_update_own ON sales
    FOR UPDATE USING (
        organization_id = auth.user_organization_id()
        AND cashier_id = auth.uid()
        AND status != 'voided'
    );

-- Admin/Supervisor can update any sale (for voids, etc.)
CREATE POLICY sales_update_admin ON sales
    FOR UPDATE USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY sale_items_select ON sale_items
    FOR SELECT USING (
        sale_id IN (SELECT id FROM sales WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY sale_items_manage ON sale_items
    FOR ALL USING (
        sale_id IN (SELECT id FROM sales WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'cashier'])
    );

CREATE POLICY sale_payments_manage ON sale_payments
    FOR ALL USING (
        sale_id IN (SELECT id FROM sales WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY held_sales_select ON held_sales
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY held_sales_manage ON held_sales
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'cashier'])
    );

-- ============================================================================
-- RECONCILIATION
-- ============================================================================

CREATE POLICY daily_closings_select ON daily_closings
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY daily_closings_manage ON daily_closings
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY stock_counts_select ON stock_counts
    FOR SELECT USING (
        daily_closing_id IN (SELECT id FROM daily_closings WHERE organization_id = auth.user_organization_id())
    );

CREATE POLICY stock_counts_manage ON stock_counts
    FOR ALL USING (
        daily_closing_id IN (SELECT id FROM daily_closings WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'blockman'])
    );

CREATE POLICY stock_count_items_select ON stock_count_items
    FOR SELECT USING (
        stock_count_id IN (
            SELECT sc.id FROM stock_counts sc
            JOIN daily_closings dc ON dc.id = sc.daily_closing_id
            WHERE dc.organization_id = auth.user_organization_id()
        )
    );

CREATE POLICY stock_count_items_manage ON stock_count_items
    FOR ALL USING (
        stock_count_id IN (
            SELECT sc.id FROM stock_counts sc
            JOIN daily_closings dc ON dc.id = sc.daily_closing_id
            WHERE dc.organization_id = auth.user_organization_id()
        )
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor', 'blockman'])
    );

CREATE POLICY cash_counts_manage ON cash_counts
    FOR ALL USING (
        daily_closing_id IN (SELECT id FROM daily_closings WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY cash_count_denominations_manage ON cash_count_denominations
    FOR ALL USING (
        cash_count_id IN (
            SELECT cc.id FROM cash_counts cc
            JOIN daily_closings dc ON dc.id = cc.daily_closing_id
            WHERE dc.organization_id = auth.user_organization_id()
        )
    );

CREATE POLICY variance_reasons_select ON variance_reasons
    FOR SELECT USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

-- Only admin can view audit logs
CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_role('admin')
    );

-- System inserts audit logs (no direct user insert)
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (TRUE); -- Controlled by trigger

-- ============================================================================
-- DOCUMENT SEQUENCES (Internal use)
-- ============================================================================

CREATE POLICY document_sequences_select ON document_sequences
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY document_sequences_manage ON document_sequences
    FOR ALL USING (organization_id = auth.user_organization_id());

-- ============================================================================
-- YIELD TEMPLATES
-- ============================================================================

CREATE POLICY yield_templates_select ON yield_templates
    FOR SELECT USING (organization_id = auth.user_organization_id());

CREATE POLICY yield_templates_manage ON yield_templates
    FOR ALL USING (
        organization_id = auth.user_organization_id()
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

CREATE POLICY yield_template_items_manage ON yield_template_items
    FOR ALL USING (
        yield_template_id IN (SELECT id FROM yield_templates WHERE organization_id = auth.user_organization_id())
    );

-- ============================================================================
-- PRICE HISTORY
-- ============================================================================

CREATE POLICY product_price_history_select ON product_price_history
    FOR SELECT USING (
        product_id IN (SELECT id FROM products WHERE organization_id = auth.user_organization_id())
        AND auth.user_has_any_role(ARRAY['admin', 'supervisor'])
    );

-- Insert handled by trigger
CREATE POLICY product_price_history_insert ON product_price_history
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- STOCK ADJUSTMENTS ITEMS
-- ============================================================================

CREATE POLICY stock_adjustment_items_manage ON stock_adjustment_items
    FOR ALL USING (
        stock_adjustment_id IN (SELECT id FROM stock_adjustments WHERE organization_id = auth.user_organization_id())
    );
