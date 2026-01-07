# Meatly - Meat Industry Inventory Management System

## Design Document

**Version:** 1.0
**Date:** 8 January 2026
**Client:** AGROBEEF Butchery, Zimbabwe
**Status:** Approved for Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technical Architecture](#3-technical-architecture)
4. [Database Design](#4-database-design)
5. [Module Specifications](#5-module-specifications)
6. [User Interface Design](#6-user-interface-design)
7. [Security & Access Control](#7-security--access-control)
8. [Offline Capabilities](#8-offline-capabilities)
9. [MVP Phasing](#9-mvp-phasing)

---

## 1. Executive Summary

### 1.1 Problem Statement

Butcheries in Zimbabwe currently rely on manual book-keeping to track inventory. The core challenge is the transformation problem: one carcass becomes dozens of different products (steaks, mince, offal, bones), making it difficult to:

- Track margins per carcass and per product type
- Maintain traceability from supplier to final sale
- Account for natural weight loss during processing
- Reconcile daily stock with sales

### 1.2 Solution

Meatly is a comprehensive inventory management system designed specifically for the meat industry. It tracks the complete lifecycle from carcass receipt through cutting, processing, and final sale, providing full traceability and margin analysis.

### 1.3 Key Features

- **Carcass Tracking**: Receipt of whole carcasses or live animals with supplier and grading information
- **Cutting Sessions**: Transform carcasses into individual cuts with yield tracking
- **Processing/Recipes**: Create value-added products (boerewors, marinades) from base ingredients
- **Multi-Zone Stock**: Track inventory across cold rooms, display counters, and freezers
- **Point of Sale**: Web-based POS with multi-currency support (USD/ZWL)
- **Daily Reconciliation**: Stock counts and variance tracking
- **Margin Analysis**: Per-carcass and per-product profitability

### 1.4 Target Market

- Small butcheries (1-5 staff, single location)
- Mid-size butcheries (5-20 staff, 1-3 locations)
- Built as single-tenant MVP, designed for future SaaS conversion

---

## 2. System Overview

### 2.1 Core Modules

```
┌─────────────────────────────────────────────────────────────────┐
│                         MEATLY SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ RECEIVE  │───▶│   CUT    │───▶│ PROCESS  │───▶│  STOCK   │  │
│  │          │    │          │    │          │    │          │  │
│  │ Carcass  │    │ Debone   │    │ Recipes  │    │ Zones    │  │
│  │ Animals  │    │ Quarter  │    │ Batches  │    │ Transfer │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                                               │         │
│       │              ┌──────────┐                     │         │
│       └─────────────▶│   POS    │◀────────────────────┘         │
│                      │          │                               │
│                      │ Sales    │                               │
│                      │ Payments │                               │
│                      └──────────┘                               │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ RECONCILE│◀───│ REPORTS  │    │ SETTINGS │    │  USERS   │  │
│  │          │    │          │    │          │    │          │  │
│  │ Daily    │    │ Margins  │    │ Products │    │ Roles    │  │
│  │ Counts   │    │ Yields   │    │ Prices   │    │ Perms    │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Entry Points

The system supports two entry points for inventory:

1. **Pre-slaughtered Carcasses**: Purchased directly from abattoirs
   - Recorded with weight, grade, supplier, and cost

2. **Live Animals**: Slaughtered on-premises
   - Live weight recorded at intake
   - Slaughter event creates carcass record
   - Carcass weight and grade recorded post-slaughter

### 2.3 Processing Streams

All three processing streams are supported:

1. **Deboning/Cutting**: Carcass → Quarters → Individual cuts
2. **Offal Processing**: Organs separated and prepared for sale
3. **Value-Added Processing**: Mince → Boerewors, marinades, ready meals

### 2.4 Stock Zones

Configurable zones per business (default set):

- **Cold Room**: Primary storage (0-4°C)
- **Display Counter**: Retail area
- **Freezer**: Long-term storage (-18°C)
- **Processing Area**: Temporary holding during production

### 2.5 Traceability Model

Configurable per product type:

- **Full Traceability**: Track to specific carcass (premium cuts)
- **Batch Traceability**: Track to cutting session (mince, stew)
- **Category Only**: No traceability (bones, trim)

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Web Frontend | Vite + React | Fast builds, modern DX |
| Mobile Apps | React Native | Code sharing with web |
| Backend | Supabase | Managed PostgreSQL, Auth, Realtime |
| Styling | Tailwind CSS | Utility-first, consistent design |
| AI Features | Vercel AI SDK | Configurable LLM provider |
| Offline | WatermelonDB | SQLite-based sync for mobile |

### 3.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web App     │  │  Mobile App  │  │  Mobile App  │          │
│  │  (Vite/React)│  │  (iOS)       │  │  (Android)   │          │
│  │              │  │  React Native│  │  React Native│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         │    ┌────────────┴────────────┐    │                   │
│         │    │    Offline Storage      │    │                   │
│         │    │    (WatermelonDB)       │    │                   │
│         │    └────────────┬────────────┘    │                   │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Auth        │  │  Realtime    │  │  Storage     │          │
│  │              │  │  (WebSocket) │  │  (Files)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │                 PostgreSQL                        │          │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │          │
│  │  │   Tables   │  │  Functions │  │  Triggers  │  │          │
│  │  │   + RLS    │  │  (plpgsql) │  │            │  │          │
│  │  └────────────┘  └────────────┘  └────────────┘  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Edge Functions (Deno)                │          │
│  │  - Complex business logic                         │          │
│  │  - External integrations                          │          │
│  │  - AI/LLM features                                │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Architectural Decisions

1. **Database-First Logic**: Business rules in PostgreSQL functions/triggers, not application code
2. **RLS for Security**: Row Level Security for multi-tenant data isolation
3. **Offline-First POS**: Sales work without internet, sync when connected
4. **Payment Agnostic**: Record payment methods without processing (EcoCash, OneMoney, Cash, Card)
5. **Multi-Currency**: USD base with ZWL support, configurable exchange rates

---

## 4. Database Design

### 4.1 Schema Overview

The database is heavily normalized with 40+ tables organized into logical groups:

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ORGANIZATION & USERS          REFERENCE DATA                   │
│  ├─ organizations              ├─ grading_schemes               │
│  ├─ user_profiles              ├─ grades                        │
│  ├─ roles                      ├─ zones                         │
│  └─ user_roles                 ├─ currencies                    │
│                                ├─ exchange_rates                │
│  PRODUCTS                      └─ suppliers                     │
│  ├─ product_categories                                          │
│  ├─ products                   INVENTORY                        │
│  ├─ product_prices             ├─ stock                         │
│  ├─ product_price_history      ├─ stock_movements               │
│  └─ yield_templates            ├─ transfers                     │
│                                ├─ transfer_items                │
│  RECEIVING                     ├─ write_offs                    │
│  ├─ animals                    └─ stock_adjustments             │
│  ├─ slaughter_events                                            │
│  ├─ carcasses                  SALES                            │
│  └─ carcass_quarters           ├─ sales                         │
│                                ├─ sale_items                    │
│  CUTTING                       ├─ sale_payments                 │
│  ├─ cutting_sessions           └─ held_sales                    │
│  └─ cutting_outputs                                             │
│                                RECONCILIATION                   │
│  PROCESSING                    ├─ daily_closings                │
│  ├─ recipes                    ├─ stock_counts                  │
│  ├─ recipe_ingredients         ├─ cash_counts                   │
│  ├─ production_batches         └─ variance_reasons              │
│  ├─ batch_inputs                                                │
│  └─ batch_outputs              SYSTEM                           │
│                                ├─ document_sequences            │
│                                ├─ audit_logs                    │
│                                └─ settings                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Core Tables

#### Organizations

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trading_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    logo_url TEXT,
    base_currency_code TEXT NOT NULL DEFAULT 'USD',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Products

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    category_id UUID REFERENCES product_categories(id),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit_of_measure TEXT NOT NULL DEFAULT 'kg',
    sold_by TEXT NOT NULL DEFAULT 'weight', -- 'weight' or 'each'
    is_active BOOLEAN DEFAULT TRUE,

    -- Product behavior flags
    can_be_produced BOOLEAN DEFAULT FALSE,      -- Output of cutting
    can_be_sold BOOLEAN DEFAULT TRUE,           -- Available at POS
    is_recipe_output BOOLEAN DEFAULT FALSE,     -- Output of recipe
    is_ingredient BOOLEAN DEFAULT FALSE,        -- Used in recipes
    requires_weighing BOOLEAN DEFAULT TRUE,     -- Weigh at sale

    -- Traceability
    traceability_level TEXT DEFAULT 'batch',    -- 'full', 'batch', 'none'
    grading_scheme_id UUID REFERENCES grading_schemes(id),

    -- Inventory
    minimum_stock_kg NUMERIC(10,3) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, sku)
);
```

#### Carcasses

```sql
CREATE TABLE carcasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    carcass_number TEXT NOT NULL,

    -- Source
    source_type TEXT NOT NULL, -- 'purchased' or 'slaughtered'
    supplier_id UUID REFERENCES suppliers(id),
    animal_id UUID REFERENCES animals(id),

    -- Details
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by UUID REFERENCES user_profiles(id),
    weight_kg NUMERIC(10,3) NOT NULL,
    grade_id UUID REFERENCES grades(id),
    cost_total NUMERIC(12,2) NOT NULL,
    cost_per_kg NUMERIC(10,4) GENERATED ALWAYS AS (cost_total / NULLIF(weight_kg, 0)) STORED,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'quartered', 'processing', 'completed'
    quarters_count INTEGER DEFAULT 0,

    -- Yield tracking
    total_output_kg NUMERIC(10,3) DEFAULT 0,
    yield_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN weight_kg > 0 THEN (total_output_kg / weight_kg) * 100 ELSE 0 END
    ) STORED,

    -- Financial
    total_revenue NUMERIC(12,2) DEFAULT 0,
    realized_margin NUMERIC(12,2) GENERATED ALWAYS AS (total_revenue - cost_total) STORED,
    margin_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_revenue > 0 THEN ((total_revenue - cost_total) / total_revenue) * 100 ELSE 0 END
    ) STORED,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, carcass_number)
);
```

#### Cutting Sessions

```sql
CREATE TABLE cutting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    session_number TEXT NOT NULL,

    -- Source
    carcass_id UUID NOT NULL REFERENCES carcasses(id),
    quarter_id UUID REFERENCES carcass_quarters(id),

    -- Session details
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_by UUID NOT NULL REFERENCES user_profiles(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Weights
    input_weight_kg NUMERIC(10,3) NOT NULL,
    total_output_kg NUMERIC(10,3) DEFAULT 0,
    waste_kg NUMERIC(10,3) DEFAULT 0,
    yield_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN input_weight_kg > 0 THEN (total_output_kg / input_weight_kg) * 100 ELSE 0 END
    ) STORED,

    -- Cost allocation
    allocated_cost NUMERIC(12,2) NOT NULL,

    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
    destination_zone_id UUID REFERENCES zones(id),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, session_number)
);
```

#### Stock

```sql
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    product_id UUID NOT NULL REFERENCES products(id),
    zone_id UUID NOT NULL REFERENCES zones(id),
    grade_id UUID REFERENCES grades(id),

    -- Traceability
    carcass_id UUID REFERENCES carcasses(id),
    cutting_session_id UUID REFERENCES cutting_sessions(id),
    production_batch_id UUID REFERENCES production_batches(id),

    -- Quantity and cost
    quantity_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10,4) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12,2) GENERATED ALWAYS AS (quantity_kg * unit_cost) STORED,

    -- Dates
    produced_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, product_id, zone_id, grade_id, carcass_id, cutting_session_id, production_batch_id)
);
```

#### Sales

```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    sale_number TEXT NOT NULL,

    -- Transaction details
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cashier_id UUID NOT NULL REFERENCES user_profiles(id),

    -- Totals (base currency - USD)
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_reason TEXT,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'partial'

    -- Status
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'voided', 'held'
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES user_profiles(id),
    void_reason TEXT,

    -- Offline support
    created_offline BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, sale_number)
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    -- Quantity
    quantity_kg NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(12,2) NOT NULL,

    -- Grading
    grade_id UUID REFERENCES grades(id),

    -- Traceability
    stock_id UUID REFERENCES stock(id),
    carcass_id UUID REFERENCES carcasses(id),

    -- Cost for margin calculation
    unit_cost NUMERIC(10,4) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,

    payment_method TEXT NOT NULL, -- 'cash_usd', 'cash_zwl', 'ecocash', 'onemoney', 'card'
    currency_code TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    amount_usd NUMERIC(12,2) NOT NULL, -- Converted to base currency
    exchange_rate NUMERIC(15,4) DEFAULT 1,

    reference TEXT, -- Transaction reference for electronic payments

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Daily Closings

```sql
CREATE TABLE daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    closing_date DATE NOT NULL,

    -- Process tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_by UUID NOT NULL REFERENCES user_profiles(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),

    -- Sales summary
    total_sales NUMERIC(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,

    -- Stock variance
    expected_stock_kg NUMERIC(12,3) DEFAULT 0,
    actual_stock_kg NUMERIC(12,3) DEFAULT 0,
    stock_variance_kg NUMERIC(12,3) GENERATED ALWAYS AS (actual_stock_kg - expected_stock_kg) STORED,
    stock_variance_value NUMERIC(12,2) DEFAULT 0,

    -- Cash variance
    expected_cash_usd NUMERIC(12,2) DEFAULT 0,
    actual_cash_usd NUMERIC(12,2) DEFAULT 0,
    cash_variance_usd NUMERIC(12,2) GENERATED ALWAYS AS (actual_cash_usd - expected_cash_usd) STORED,

    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, closing_date)
);
```

### 4.3 Database Functions

#### Get Next Document Number

```sql
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
    -- Get or create sequence for today
    v_date_part := TO_CHAR(CURRENT_DATE, 'MMDD');

    INSERT INTO document_sequences (organization_id, document_type, sequence_date, last_number)
    VALUES (p_organization_id, p_document_type, CURRENT_DATE, 0)
    ON CONFLICT (organization_id, document_type, sequence_date) DO NOTHING;

    UPDATE document_sequences
    SET last_number = last_number + 1
    WHERE organization_id = p_organization_id
      AND document_type = p_document_type
      AND sequence_date = CURRENT_DATE
    RETURNING last_number INTO v_sequence;

    -- Format: PREFIX-MMDD-SEQ (e.g., CAR-0108-001)
    v_number := COALESCE(p_prefix, UPPER(LEFT(p_document_type, 3))) || '-' ||
                v_date_part || '-' || LPAD(v_sequence::TEXT, 2, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;
```

#### Update Stock

```sql
CREATE OR REPLACE FUNCTION update_stock(
    p_organization_id UUID,
    p_product_id UUID,
    p_zone_id UUID,
    p_quantity_change NUMERIC,
    p_unit_cost NUMERIC,
    p_grade_id UUID DEFAULT NULL,
    p_carcass_id UUID DEFAULT NULL,
    p_cutting_session_id UUID DEFAULT NULL,
    p_production_batch_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_stock_id UUID;
BEGIN
    -- Upsert stock record
    INSERT INTO stock (
        organization_id, product_id, zone_id, grade_id,
        carcass_id, cutting_session_id, production_batch_id,
        quantity_kg, unit_cost
    )
    VALUES (
        p_organization_id, p_product_id, p_zone_id, p_grade_id,
        p_carcass_id, p_cutting_session_id, p_production_batch_id,
        p_quantity_change, p_unit_cost
    )
    ON CONFLICT (organization_id, product_id, zone_id, grade_id,
                 carcass_id, cutting_session_id, production_batch_id)
    DO UPDATE SET
        quantity_kg = stock.quantity_kg + p_quantity_change,
        -- Weighted average cost for additions
        unit_cost = CASE
            WHEN p_quantity_change > 0 THEN
                (stock.quantity_kg * stock.unit_cost + p_quantity_change * p_unit_cost) /
                NULLIF(stock.quantity_kg + p_quantity_change, 0)
            ELSE stock.unit_cost
        END,
        updated_at = NOW()
    RETURNING id INTO v_stock_id;

    -- Remove zero-quantity records
    DELETE FROM stock WHERE id = v_stock_id AND quantity_kg <= 0;

    RETURN v_stock_id;
END;
$$ LANGUAGE plpgsql;
```

#### Allocate Carcass Cost

```sql
CREATE OR REPLACE FUNCTION allocate_carcass_cost(
    p_cutting_session_id UUID
) RETURNS VOID AS $$
DECLARE
    v_session RECORD;
    v_output RECORD;
    v_cost_per_kg NUMERIC;
BEGIN
    -- Get session details
    SELECT cs.*, c.cost_per_kg as carcass_cost_per_kg
    INTO v_session
    FROM cutting_sessions cs
    JOIN carcasses c ON c.id = cs.carcass_id
    WHERE cs.id = p_cutting_session_id;

    -- Calculate cost per kg of output
    v_cost_per_kg := v_session.allocated_cost / NULLIF(v_session.total_output_kg, 0);

    -- Update each output with allocated cost
    FOR v_output IN
        SELECT * FROM cutting_outputs WHERE cutting_session_id = p_cutting_session_id
    LOOP
        UPDATE cutting_outputs
        SET unit_cost = v_cost_per_kg,
            total_cost = v_output.quantity_kg * v_cost_per_kg
        WHERE id = v_output.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 4.4 Triggers

#### Auto-Generate Document Numbers

```sql
CREATE OR REPLACE FUNCTION trigger_set_document_number()
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

CREATE TRIGGER set_carcass_number
    BEFORE INSERT ON carcasses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_document_number();
```

#### Update Stock on Cutting Output

```sql
CREATE OR REPLACE FUNCTION trigger_cutting_output_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add to stock
        PERFORM update_stock(
            (SELECT organization_id FROM cutting_sessions WHERE id = NEW.cutting_session_id),
            NEW.product_id,
            (SELECT destination_zone_id FROM cutting_sessions WHERE id = NEW.cutting_session_id),
            NEW.quantity_kg,
            NEW.unit_cost,
            NEW.grade_id,
            (SELECT carcass_id FROM cutting_sessions WHERE id = NEW.cutting_session_id),
            NEW.cutting_session_id,
            NULL
        );

        -- Update session total
        UPDATE cutting_sessions
        SET total_output_kg = total_output_kg + NEW.quantity_kg
        WHERE id = NEW.cutting_session_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cutting_output_update_stock
    AFTER INSERT ON cutting_outputs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cutting_output_stock();
```

#### Deduct Stock on Sale

```sql
CREATE OR REPLACE FUNCTION trigger_sale_item_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM sales WHERE id = NEW.sale_id;

    IF TG_OP = 'INSERT' THEN
        -- Deduct from stock (negative quantity)
        PERFORM update_stock(
            v_org_id,
            NEW.product_id,
            (SELECT id FROM zones WHERE organization_id = v_org_id AND is_pos_zone = TRUE LIMIT 1),
            -NEW.quantity_kg,
            NEW.unit_cost,
            NEW.grade_id,
            NEW.carcass_id,
            NULL,
            NULL
        );

        -- Update carcass revenue if traceable
        IF NEW.carcass_id IS NOT NULL THEN
            UPDATE carcasses
            SET total_revenue = total_revenue + NEW.line_total
            WHERE id = NEW.carcass_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_item_update_stock
    AFTER INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sale_item_stock();
```

#### Audit Logging

```sql
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        organization_id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        created_at
    )
    VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid(),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER audit_carcasses AFTER INSERT OR UPDATE OR DELETE ON carcasses
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
CREATE TRIGGER audit_stock_movements AFTER INSERT OR UPDATE OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
```

### 4.5 Row Level Security

All tables have RLS enabled with organization-based isolation:

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy for viewing (all authenticated users in org)
CREATE POLICY products_select ON products
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Policy for insert (admin/supervisor only)
CREATE POLICY products_insert ON products
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT up.organization_id
            FROM user_profiles up
            JOIN user_roles ur ON ur.user_id = up.id
            JOIN roles r ON r.id = ur.role_id
            WHERE up.id = auth.uid() AND r.name IN ('admin', 'supervisor')
        )
    );

-- Policy for update (admin/supervisor only)
CREATE POLICY products_update ON products
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT up.organization_id
            FROM user_profiles up
            JOIN user_roles ur ON ur.user_id = up.id
            JOIN roles r ON r.id = ur.role_id
            WHERE up.id = auth.uid() AND r.name IN ('admin', 'supervisor')
        )
    );
```

---

## 5. Module Specifications

### 5.1 Receiving Module

**Purpose**: Record incoming carcasses and live animals

**Workflows**:

1. **Receive Purchased Carcass**
   - Select supplier
   - Enter weight (kg)
   - Select grade
   - Enter cost
   - Optionally quarter immediately

2. **Receive Live Animal**
   - Record animal details (type, tag, live weight)
   - Later: Record slaughter event
   - Creates carcass record post-slaughter

**Key Fields**:
- Carcass number (auto-generated)
- Supplier
- Weight
- Grade
- Cost (total and per-kg calculated)
- Received by/at

### 5.2 Cutting Module

**Purpose**: Transform carcasses/quarters into individual cuts

**Workflow**:

1. Select carcass/quarter
2. Start cutting session
3. Add outputs (product, weight, grade)
4. Record waste
5. Complete session

**Yield Tracking**:
- Input weight vs total output
- Expected yield by grade
- Blockman performance metrics

**Cost Allocation**:
- Proportional by weight (fixed percentages)
- Carcass cost distributed to outputs

### 5.3 Processing Module

**Purpose**: Create value-added products from recipes

**Workflow**:

1. Select recipe
2. Configure batch size
3. Select/weigh input ingredients
4. Start production batch
5. Record output
6. Complete batch

**Recipe Management**:
- Ingredient list with quantities
- Expected output quantity
- Cost calculation (ingredients + labor factor)

### 5.4 Stock Management

**Purpose**: Track inventory across zones

**Features**:

- **Multi-Zone View**: Stock by location
- **Transfers**: Move stock between zones with approval workflow
- **Write-offs**: Record spoilage, damage, theft with categorized reasons
- **Adjustments**: Correct stock discrepancies with audit trail

### 5.5 Point of Sale

**Purpose**: Process customer sales

**Features**:

- Quick product search
- Scale integration (weight entry)
- Grade-based pricing
- Multi-currency (USD/ZWL)
- Multiple payment methods
- Hold/recall sales
- Discount application (with limits by role)
- Receipt printing

**Payment Methods**:
- Cash (USD)
- Cash (ZWL) - with exchange rate
- EcoCash
- OneMoney
- Bank Card

### 5.6 Daily Reconciliation

**Purpose**: End-of-day stock and cash verification

**Workflow**:

1. Start daily closing
2. Count stock by zone
3. Review variances
4. Assign variance reasons
5. Count cash by currency/denomination
6. Reconcile electronic payments
7. Supervisor approval
8. Close day

**Variance Tracking**:
- Automatic expected vs actual comparison
- Mandatory reason for each variance
- Threshold alerts (>0.5% warning, >2% critical)

### 5.7 Reports

**Categories**:

1. **Operational**
   - Stock levels
   - Carcass yield
   - Cutting efficiency
   - Production output

2. **Financial**
   - Sales summary
   - Margin analysis (per carcass, per product)
   - Supplier comparison
   - Variance reports

3. **Traceability**
   - Carcass lifecycle
   - Product origin
   - Audit logs

---

## 6. User Interface Design

### 6.1 Screen Summary

| Section | Screens | Description |
|---------|---------|-------------|
| Authentication | 4 | Login, password recovery |
| Dashboard | 3 | Role-specific home views |
| Receiving | 7 | Carcass/animal intake |
| Cutting/Deboning | 8 | Cutting sessions workflow |
| Processing | 10 | Recipe-based production |
| Stock Management | 10 | Transfers, write-offs, adjustments |
| Point of Sale | 14 | Sales, payments, receipts |
| Daily Reconciliation | 9 | Stock counts, cash reconciliation |
| Reports | 10 | Analytics and traceability |
| Settings | 15 | System configuration |
| **Total** | **90** | |

### 6.2 Design Principles

1. **Mobile-First**: Core workflows optimized for mobile devices
2. **Role-Based Views**: Dashboards and menus tailored to user role
3. **Offline Indicators**: Clear status when working offline
4. **Large Touch Targets**: Suitable for use with gloves in cold environments
5. **Minimal Data Entry**: Smart defaults, barcode scanning, scales integration

### 6.3 Key Screen Flows

#### Cutting Session Flow

```
Select Carcass → Start Session → Add Cuts → Record Waste → Complete
     ↓               ↓              ↓            ↓            ↓
  List view    Weight shown    Modal form   Auto-calc    Confirmation
```

#### POS Sale Flow

```
Search Product → Enter Weight → Add to Cart → Payment → Receipt
      ↓              ↓             ↓            ↓          ↓
  Quick search    Numpad       Running      Multi-     Print/
  or category     modal        total       method     Share
```

#### Daily Closing Flow

```
Start Closing → Count Stock → Review Variance → Count Cash → Close Day
      ↓             ↓              ↓               ↓            ↓
  Summary       By zone       Assign reasons   Denominations  Supervisor
  checks        entry         mandatory        count          approval
```

---

## 7. Security & Access Control

### 7.1 Authentication

- **Email + Password**: Primary login for web/mobile
- **PIN**: Quick access for POS terminals (4-6 digits)
- **Session Management**: Configurable timeout, single device option

### 7.2 Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| Admin | Full system access | All features, settings, users |
| Supervisor | Operations management | Approve transfers, view reports, close day |
| Blockman | Cutting operations | Start/complete cutting sessions |
| Cashier | POS operations | Process sales, limited discounts |
| Server | Order taking | Create orders, limited POS access |

### 7.3 Permission Matrix

| Feature | Admin | Supervisor | Blockman | Cashier | Server |
|---------|:-----:|:----------:|:--------:|:-------:|:------:|
| Receive carcasses | ✓ | ✓ | - | - | - |
| Cutting sessions | ✓ | ✓ | ✓ | - | - |
| Process sales | ✓ | ✓ | - | ✓ | ○ |
| Apply discounts | ✓ | ✓ | - | ○ | - |
| Void sales | ✓ | ✓ | - | - | - |
| View all reports | ✓ | ✓ | - | - | - |
| Manage products | ✓ | ✓ | - | - | - |
| Manage users | ✓ | - | - | - | - |
| System settings | ✓ | - | - | - | - |

✓ = Full access, ○ = Limited access, - = No access

### 7.4 Data Security

- **Row Level Security**: All data isolated by organization
- **Audit Logging**: Critical actions logged with user, timestamp, before/after
- **Encryption**: Data encrypted at rest and in transit
- **Backups**: Daily automated backups with 30-day retention

---

## 8. Offline Capabilities

### 8.1 Offline-First Architecture

The POS module is designed to work without internet connectivity:

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MOBILE/WEB APP                        │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              WatermelonDB (SQLite)               │    │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │   │
│  │  │  │Products │ │ Stock   │ │ Sales   │            │    │   │
│  │  │  │(cached) │ │(synced) │ │(queued) │            │    │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘            │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                          ↕                               │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              Sync Engine                         │    │   │
│  │  │  - Conflict resolution                           │    │   │
│  │  │  - Queue management                              │    │   │
│  │  │  - Retry logic                                   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↕                                  │
│                     (When online)                               │
│                              ↕                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SUPABASE                              │   │
│  │                  (Source of truth)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Offline Capabilities

| Feature | Offline Support | Notes |
|---------|:---------------:|-------|
| View products | ✓ | Cached locally |
| View stock levels | ✓ | Last synced values |
| Process sales | ✓ | Queued for sync |
| Accept payments | ✓ | Electronic marked as pending |
| Print receipts | ✓ | Local print |
| View own sales | ✓ | Local data |
| Cutting sessions | ○ | Start only, complete when online |
| Transfers | ○ | Create only, approve when online |
| Reports | - | Requires sync |
| Settings | - | Requires online |

### 8.3 Sync Strategy

1. **On Connect**:
   - Push queued transactions
   - Pull updated reference data
   - Reconcile stock levels

2. **Conflict Resolution**:
   - Server wins for reference data
   - Merge for stock (aggregate changes)
   - Queue retry for failed transactions

3. **Offline Indicators**:
   - Clear visual indicator when offline
   - Pending sync count displayed
   - Warning for extended offline periods

---

## 9. MVP Phasing

### 9.1 Phase 1: Core Operations (MVP)

**Duration**: 8-10 weeks

**Features**:
- User authentication (email/password + PIN)
- Business setup and configuration
- Product and category management
- Supplier management
- Carcass receiving
- Basic cutting sessions
- Single-zone stock tracking
- POS (cash payments only)
- Basic daily closing
- Essential reports (sales, stock)

**Goal**: Replace manual book-keeping with digital system

### 9.2 Phase 2: Full Operations

**Duration**: 6-8 weeks

**Features**:
- Multi-zone stock management
- Transfers with approval workflow
- Full cutting with yield tracking
- Recipe management
- Production batches
- Multi-currency support
- Electronic payments (EcoCash, OneMoney)
- Complete daily reconciliation
- Variance tracking
- Comprehensive reports

**Goal**: Complete operational coverage

### 9.3 Phase 3: Mobile & Offline

**Duration**: 4-6 weeks

**Features**:
- React Native mobile apps
- Offline POS capabilities
- Mobile cutting interface
- Mobile stock counting
- Push notifications
- Barcode/QR scanning

**Goal**: Mobile workforce enablement

### 9.4 Phase 4: Analytics & Scale

**Duration**: 4-6 weeks

**Features**:
- Advanced margin analysis
- Supplier performance scoring
- Yield optimization recommendations
- Multi-location support
- API for integrations
- SaaS conversion (multi-tenant)

**Goal**: Business intelligence and growth

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Carcass** | Whole animal body after slaughter, before cutting |
| **Quarter** | One of four sections of a carcass (2 fore, 2 hind) |
| **Cutting Session** | Process of breaking down carcass/quarter into individual cuts |
| **Yield** | Percentage of usable product from input weight |
| **Grade** | Quality classification (Super, Choice, Commercial, Manufacturing) |
| **Traceability** | Ability to track product back to source carcass |
| **Zone** | Physical storage location (Cold Room, Display, Freezer) |
| **Write-off** | Stock removed from inventory (spoilage, damage, theft) |
| **Daily Closing** | End-of-day reconciliation of stock and cash |
| **Variance** | Difference between expected and actual values |

## Appendix B: Zimbabwe Market Context

### Currency
- **USD**: Primary trading currency, base for all calculations
- **ZWL**: Zimbabwe Dollar, volatile exchange rate
- **Exchange Rate**: Updated daily, typically manual entry

### Payment Methods
- **Cash**: Still dominant, both USD and ZWL
- **EcoCash**: Mobile money by Econet (most popular)
- **OneMoney**: Mobile money by NetOne
- **Bank Cards**: Limited acceptance, growing

### Infrastructure
- **Internet**: Unreliable, hence offline-first requirement
- **Power**: Load shedding common, backup power needed
- **Devices**: Mix of smartphones and basic phones

### Regulatory
- **VAT**: 15% standard rate
- **BP Number**: Business Partner number for tax
- **Data Retention**: 7 years for financial records

---

*Document prepared as part of the Meatly system design process.*
