export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Define Row types first
export type OrganizationRow = {
  id: string;
  name: string;
  trading_name: string | null;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  logo_url: string | null;
  base_currency_code: string;
  operating_hours: Json;
  settings: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserProfileRow = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  pin_hash: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoleRow = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  permissions: Json;
  is_system: boolean;
  created_at: string;
};

export type UserRoleRow = {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
};

export type SupplierRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ZoneRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  zone_type: string;
  temperature_min: number | null;
  temperature_max: number | null;
  is_default_receiving: boolean;
  is_pos_zone: boolean;
  allows_transfers: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GradingSchemeRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  applies_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GradeRow = {
  id: string;
  grading_scheme_id: string;
  code: string;
  name: string;
  description: string | null;
  price_adjustment_percent: number;
  expected_yield_percent: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductCategoryRow = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  path: string;
  depth: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  organization_id: string;
  category_id: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit_of_measure: string;
  sold_by: string;
  default_weight_kg: number | null;
  can_be_produced: boolean;
  can_be_sold: boolean;
  is_recipe_output: boolean;
  is_ingredient: boolean;
  requires_weighing: boolean;
  traceability_level: string;
  grading_scheme_id: string | null;
  minimum_stock_kg: number;
  reorder_point_kg: number;
  shelf_life_days: number | null;
  tax_rate_percent: number;
  is_tax_inclusive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CarcassRow = {
  id: string;
  organization_id: string;
  carcass_number: string;
  source_type: string;
  supplier_id: string | null;
  animal_id: string | null;
  slaughter_event_id: string | null;
  received_at: string;
  received_by: string | null;
  weight_kg: number;
  grade_id: string | null;
  cost_total: number;
  cost_per_kg: number;
  status: string;
  quarters_count: number;
  total_output_kg: number;
  waste_kg: number;
  yield_percentage: number;
  total_revenue: number;
  realized_margin: number;
  margin_percentage: number;
  destination_zone_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CuttingSessionRow = {
  id: string;
  organization_id: string;
  session_number: string;
  carcass_id: string;
  quarter_id: string | null;
  started_at: string;
  started_by: string;
  completed_at: string | null;
  completed_by: string | null;
  input_weight_kg: number;
  total_output_kg: number;
  waste_kg: number;
  yield_percentage: number;
  allocated_cost: number;
  cost_per_kg_output: number;
  destination_zone_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StockRow = {
  id: string;
  organization_id: string;
  product_id: string;
  zone_id: string;
  grade_id: string | null;
  carcass_id: string | null;
  cutting_session_id: string | null;
  production_batch_id: string | null;
  quantity_kg: number;
  unit_cost: number;
  total_cost: number;
  batch_code: string | null;
  produced_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleRow = {
  id: string;
  organization_id: string;
  sale_number: string;
  sale_date: string;
  sold_at: string;
  cashier_id: string;
  zone_id: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  discount_reason: string | null;
  discount_approved_by: string | null;
  tax_amount: number;
  total_amount: number;
  total_weight_kg: number;
  total_cost: number;
  margin_amount: number;
  margin_percent: number;
  payment_status: string;
  amount_paid: number;
  change_given: number;
  status: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  receipt_printed: boolean;
  receipt_printed_at: string | null;
  created_offline: boolean;
  offline_id: string | null;
  synced_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyClosingRow = {
  id: string;
  organization_id: string;
  closing_date: string;
  started_at: string;
  started_by: string;
  completed_at: string | null;
  completed_by: string | null;
  total_sales: number;
  transaction_count: number;
  total_weight_sold_kg: number;
  expected_stock_kg: number;
  actual_stock_kg: number;
  stock_variance_kg: number;
  stock_variance_percent: number;
  stock_variance_value: number;
  expected_cash_usd: number;
  actual_cash_usd: number;
  cash_variance_usd: number;
  expected_cash_zwl: number;
  actual_cash_zwl: number;
  cash_variance_zwl: number;
  electronic_payments_verified: boolean;
  electronic_payments_total: number;
  status: string;
  requires_approval: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_profiles: {
        Row: UserProfileRow;
        Insert: Omit<UserProfileRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      roles: {
        Row: RoleRow;
        Insert: Omit<RoleRow, 'id' | 'created_at'>;
        Update: Partial<Omit<RoleRow, 'id' | 'created_at'>>;
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: Omit<UserRoleRow, 'id' | 'assigned_at'>;
        Update: Partial<Omit<UserRoleRow, 'id' | 'assigned_at'>>;
      };
      suppliers: {
        Row: SupplierRow;
        Insert: Omit<SupplierRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SupplierRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      zones: {
        Row: ZoneRow;
        Insert: Omit<ZoneRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ZoneRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      grading_schemes: {
        Row: GradingSchemeRow;
        Insert: Omit<GradingSchemeRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GradingSchemeRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      grades: {
        Row: GradeRow;
        Insert: Omit<GradeRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GradeRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      product_categories: {
        Row: ProductCategoryRow;
        Insert: Omit<ProductCategoryRow, 'id' | 'created_at' | 'updated_at' | 'path' | 'depth'>;
        Update: Partial<Omit<ProductCategoryRow, 'id' | 'created_at' | 'updated_at' | 'path' | 'depth'>>;
      };
      products: {
        Row: ProductRow;
        Insert: Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      carcasses: {
        Row: CarcassRow;
        Insert: Omit<CarcassRow, 'id' | 'created_at' | 'updated_at' | 'carcass_number' | 'cost_per_kg' | 'yield_percentage' | 'realized_margin' | 'margin_percentage'>;
        Update: Partial<Omit<CarcassRow, 'id' | 'created_at' | 'updated_at' | 'carcass_number' | 'cost_per_kg' | 'yield_percentage' | 'realized_margin' | 'margin_percentage'>>;
      };
      cutting_sessions: {
        Row: CuttingSessionRow;
        Insert: Omit<CuttingSessionRow, 'id' | 'created_at' | 'updated_at' | 'session_number' | 'yield_percentage' | 'cost_per_kg_output'>;
        Update: Partial<Omit<CuttingSessionRow, 'id' | 'created_at' | 'updated_at' | 'session_number' | 'yield_percentage' | 'cost_per_kg_output'>>;
      };
      stock: {
        Row: StockRow;
        Insert: Omit<StockRow, 'id' | 'created_at' | 'updated_at' | 'total_cost'>;
        Update: Partial<Omit<StockRow, 'id' | 'created_at' | 'updated_at' | 'total_cost'>>;
      };
      sales: {
        Row: SaleRow;
        Insert: Omit<SaleRow, 'id' | 'created_at' | 'updated_at' | 'sale_number' | 'margin_amount' | 'margin_percent'>;
        Update: Partial<Omit<SaleRow, 'id' | 'created_at' | 'updated_at' | 'sale_number' | 'margin_amount' | 'margin_percent'>>;
      };
      daily_closings: {
        Row: DailyClosingRow;
        Insert: Omit<DailyClosingRow, 'id' | 'created_at' | 'updated_at' | 'stock_variance_kg' | 'stock_variance_percent' | 'cash_variance_usd' | 'cash_variance_zwl'>;
        Update: Partial<Omit<DailyClosingRow, 'id' | 'created_at' | 'updated_at' | 'stock_variance_kg' | 'stock_variance_percent' | 'cash_variance_usd' | 'cash_variance_zwl'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_next_document_number: {
        Args: { p_organization_id: string; p_document_type: string; p_prefix?: string };
        Returns: string;
      };
      get_exchange_rate: {
        Args: { p_organization_id: string; p_from_currency: string; p_to_currency: string; p_date?: string };
        Returns: number;
      };
      get_product_price: {
        Args: { p_product_id: string; p_currency_code?: string; p_grade_id?: string; p_date?: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Organization = OrganizationRow;
export type UserProfile = UserProfileRow;
export type Role = RoleRow;
export type Supplier = SupplierRow;
export type Zone = ZoneRow;
export type GradingScheme = GradingSchemeRow;
export type Grade = GradeRow;
export type ProductCategory = ProductCategoryRow;
export type Product = ProductRow;
export type Carcass = CarcassRow;
export type CuttingSession = CuttingSessionRow;
export type Stock = StockRow;
export type Sale = SaleRow;
export type DailyClosing = DailyClosingRow;
