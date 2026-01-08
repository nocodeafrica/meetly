import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface DailyClosing {
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
  notes: string | null;
  // Relations
  started_by_user?: { full_name: string };
  completed_by_user?: { full_name: string };
  stock_counts?: StockCount[];
  cash_counts?: CashCount[];
}

export interface StockCount {
  id: string;
  daily_closing_id: string;
  zone_id: string;
  started_at: string | null;
  completed_at: string | null;
  expected_total_kg: number;
  actual_total_kg: number;
  variance_kg: number;
  variance_value: number;
  total_items: number;
  items_counted: number;
  items_with_variance: number;
  status: string;
  // Relations
  zone?: { id: string; name: string; code: string };
  items?: StockCountItem[];
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  product_id: string;
  grade_id: string | null;
  stock_id: string | null;
  expected_kg: number;
  expected_value: number;
  actual_kg: number | null;
  is_counted: boolean;
  variance_kg: number | null;
  variance_percent: number | null;
  variance_value: number | null;
  variance_reason: string | null;
  variance_notes: string | null;
  // Relations
  product?: { id: string; name: string; sku: string };
}

export interface CashCount {
  id: string;
  daily_closing_id: string;
  currency_code: string;
  opening_float: number;
  cash_sales: number;
  expected_total: number;
  counted_total: number;
  variance: number;
  counted_at: string | null;
  notes: string | null;
  // Relations
  denominations?: CashDenomination[];
}

export interface CashDenomination {
  id: string;
  cash_count_id: string;
  denomination: number;
  count: number;
  total: number;
}

export function useDailyClosings(filters?: { status?: string; limit?: number }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['daily-closings', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('daily_closings')
        .select(`
          *,
          started_by_user:user_profiles!daily_closings_started_by_fkey(full_name),
          completed_by_user:user_profiles!daily_closings_completed_by_fkey(full_name)
        `)
        .eq('organization_id', organization.id)
        .order('closing_date', { ascending: false })
        .limit(filters?.limit || 30);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DailyClosing[];
    },
    enabled: !!organization?.id,
  });
}

export function useTodayClosing() {
  const { organization } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['daily-closing-today', organization?.id, today],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .from('daily_closings')
        .select(`
          *,
          started_by_user:user_profiles!daily_closings_started_by_fkey(full_name)
        `)
        .eq('organization_id', organization.id)
        .eq('closing_date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as DailyClosing | null;
    },
    enabled: !!organization?.id,
  });
}

export function useDailyClosing(closingId: string | undefined) {
  return useQuery({
    queryKey: ['daily-closing', closingId],
    queryFn: async () => {
      if (!closingId) return null;

      const { data: closing, error: closingError } = await supabase
        .from('daily_closings')
        .select(`
          *,
          started_by_user:user_profiles!daily_closings_started_by_fkey(full_name),
          completed_by_user:user_profiles!daily_closings_completed_by_fkey(full_name)
        `)
        .eq('id', closingId)
        .single();

      if (closingError) throw closingError;

      // Get stock counts
      const { data: stockCounts, error: stockError } = await supabase
        .from('stock_counts')
        .select(`
          *,
          zone:zones(id, name, code)
        `)
        .eq('daily_closing_id', closingId);

      if (stockError) throw stockError;

      // Get cash counts
      const { data: cashCounts, error: cashError } = await supabase
        .from('cash_counts')
        .select('*')
        .eq('daily_closing_id', closingId);

      if (cashError) throw cashError;

      return {
        ...(closing as any),
        stock_counts: stockCounts,
        cash_counts: cashCounts,
      } as DailyClosing;
    },
    enabled: !!closingId,
  });
}

export function useStockCountItems(stockCountId: string | undefined) {
  return useQuery({
    queryKey: ['stock-count-items', stockCountId],
    queryFn: async () => {
      if (!stockCountId) return [];

      const { data, error } = await supabase
        .from('stock_count_items')
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .eq('stock_count_id', stockCountId)
        .order('product(name)');

      if (error) throw error;
      return (data || []) as StockCountItem[];
    },
    enabled: !!stockCountId,
  });
}

export function useStartDailyClosing() {
  const queryClient = useQueryClient();
  const { organization, profile } = useAuthStore();

  return useMutation({
    mutationFn: async (closingDate?: string) => {
      if (!organization?.id || !profile?.id) throw new Error('Not authenticated');

      const date = closingDate || new Date().toISOString().split('T')[0];

      // Call the database function to initialize closing
      const { data, error } = await (supabase.rpc as any)('initialize_daily_closing', {
        p_organization_id: organization.id,
        p_closing_date: date,
        p_started_by: profile.id,
      });

      if (error) throw error;
      return data as string; // Returns closing ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-closing-today'] });
    },
  });
}

export function useUpdateStockCountItem() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      actual_kg: number;
      variance_reason?: string;
      variance_notes?: string;
    }) => {
      const { error } = await (supabase
        .from('stock_count_items') as any)
        .update({
          actual_kg: input.actual_kg,
          is_counted: true,
          counted_at: new Date().toISOString(),
          counted_by: profile?.id,
          variance_reason: input.variance_reason,
          variance_notes: input.variance_notes,
        })
        .eq('id', input.item_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-count-items'] });
      queryClient.invalidateQueries({ queryKey: ['daily-closing'] });
    },
  });
}

export function useUpdateCashCount() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (input: {
      cash_count_id: string;
      counted_total: number;
      notes?: string;
    }) => {
      const { error } = await (supabase
        .from('cash_counts') as any)
        .update({
          counted_total: input.counted_total,
          counted_at: new Date().toISOString(),
          counted_by: profile?.id,
          notes: input.notes,
        })
        .eq('id', input.cash_count_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closing'] });
    },
  });
}

export function useCompleteStockCount() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (stockCountId: string) => {
      const { error } = await (supabase
        .from('stock_counts') as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: profile?.id,
        })
        .eq('id', stockCountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closing'] });
    },
  });
}

export function useCompleteDailyClosing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { closing_id: string; notes?: string }) => {
      const { error } = await (supabase
        .from('daily_closings') as any)
        .update({
          status: 'completed',
          notes: input.notes,
        })
        .eq('id', input.closing_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-closing'] });
      queryClient.invalidateQueries({ queryKey: ['daily-closing-today'] });
    },
  });
}

export function useVarianceReasons() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['variance-reasons', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('variance_reasons')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });
}
