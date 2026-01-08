import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface SaleItem {
  id?: string;
  product_id: string;
  stock_id?: string;
  grade_id?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    sold_by: string;
    tax_rate_percent: number;
  };
  quantity_kg: number;
  unit_price: number;
  line_subtotal: number;
  line_discount: number;
  line_total: number;
  tax_rate_percent: number;
  tax_amount: number;
  unit_cost: number;
}

export interface Sale {
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
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  // Relations
  cashier?: { full_name: string };
  zone?: { name: string };
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: string;
  currency_code: string;
  amount: number;
  exchange_rate: number;
  amount_base: number;
  reference: string | null;
  tendered: number | null;
  change_amount: number | null;
  status: string;
  created_at: string;
}

export interface POSProduct {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  category?: { id: string; name: string } | null;
  sold_by: string;
  requires_weighing: boolean;
  tax_rate_percent: number;
  price?: number;
  available_kg: number;
  avg_cost: number;
}

export function usePOSProducts(filters?: { search?: string; category_id?: string }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['pos-products', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get products that can be sold
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, sku, category_id, sold_by, requires_weighing, tax_rate_percent,
          category:product_categories(id, name)
        `)
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .eq('can_be_sold', true)
        .order('name');

      if (productsError) throw productsError;

      // Get stock aggregated by product
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select('product_id, quantity_kg, cost_per_kg')
        .eq('organization_id', organization.id)
        .gt('quantity_kg', 0);

      if (stockError) throw stockError;

      // Aggregate stock by product
      const stockByProduct: Record<string, { kg: number; totalCost: number }> = {};
      for (const stock of (stockData || []) as any[]) {
        const pid = stock.product_id;
        if (!stockByProduct[pid]) {
          stockByProduct[pid] = { kg: 0, totalCost: 0 };
        }
        stockByProduct[pid].kg += stock.quantity_kg;
        stockByProduct[pid].totalCost += stock.quantity_kg * stock.cost_per_kg;
      }

      // Get prices (from product_prices table or use default markup)
      // For now, calculate price as cost * 1.5 markup
      const posProducts: POSProduct[] = (products || [])
        .map((p: any) => {
          const stockInfo = stockByProduct[p.id] || { kg: 0, totalCost: 0 };
          const avgCost = stockInfo.kg > 0 ? stockInfo.totalCost / stockInfo.kg : 0;
          return {
            ...p,
            available_kg: stockInfo.kg,
            avg_cost: avgCost,
            price: avgCost > 0 ? avgCost * 1.5 : 10.00, // Default price or cost + 50% markup
          };
        })
        .filter((p: POSProduct) => p.available_kg > 0 || !filters?.search); // Show products with stock or if browsing

      // Apply filters
      let filtered = posProducts;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
        );
      }
      if (filters?.category_id) {
        filtered = filtered.filter(p => p.category_id === filters.category_id);
      }

      return filtered;
    },
    enabled: !!organization?.id,
  });
}

export function useSales(filters?: { date?: string; status?: string; limit?: number }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['sales', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('sales')
        .select(`
          *,
          cashier:user_profiles!sales_cashier_id_fkey(full_name),
          zone:zones(name)
        `)
        .eq('organization_id', organization.id)
        .order('sold_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (filters?.date) {
        query = query.eq('sale_date', filters.date);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Sale[];
    },
    enabled: !!organization?.id,
  });
}

export function useTodaySales() {
  const { organization } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['sales-today', organization?.id, today],
    queryFn: async () => {
      if (!organization?.id) return { count: 0, total: 0, weight: 0 };

      const { data, error } = await supabase
        .from('sales')
        .select('total_amount, total_weight_kg')
        .eq('organization_id', organization.id)
        .eq('sale_date', today)
        .eq('status', 'completed');

      if (error) throw error;

      const salesData = (data || []) as any[];
      return {
        count: salesData.length,
        total: salesData.reduce((sum, s) => sum + s.total_amount, 0),
        weight: salesData.reduce((sum, s) => sum + s.total_weight_kg, 0),
      };
    },
    enabled: !!organization?.id,
  });
}

interface CreateSaleInput {
  zone_id: string;
  items: {
    product_id: string;
    stock_id?: string;
    quantity_kg: number;
    unit_price: number;
    unit_cost: number;
  }[];
  discount_amount?: number;
  discount_reason?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}

interface ProcessPaymentInput {
  sale_id: string;
  payment_method: string;
  currency_code: string;
  amount: number;
  exchange_rate?: number;
  tendered?: number;
  reference?: string;
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { organization, profile } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      if (!organization?.id || !profile?.id) throw new Error('Not authenticated');

      // Create sale
      const { data: sale, error: saleError } = await (supabase
        .from('sales') as any)
        .insert({
          organization_id: organization.id,
          cashier_id: profile.id,
          zone_id: input.zone_id,
          discount_amount: input.discount_amount || 0,
          discount_reason: input.discount_reason,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          notes: input.notes,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Add items
      const items = input.items.map(item => {
        const lineSubtotal = item.quantity_kg * item.unit_price;
        const taxAmount = lineSubtotal * 0.15; // Default 15% VAT
        return {
          sale_id: sale.id,
          product_id: item.product_id,
          stock_id: item.stock_id,
          quantity_kg: item.quantity_kg,
          unit_price: item.unit_price,
          line_subtotal: lineSubtotal,
          line_discount: 0,
          line_total: lineSubtotal,
          tax_rate_percent: 15,
          tax_amount: taxAmount,
          unit_cost: item.unit_cost,
        };
      });

      const { error: itemsError } = await (supabase
        .from('sale_items') as any)
        .insert(items);

      if (itemsError) throw itemsError;

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-today'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-aggregated'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessPaymentInput) => {
      const exchangeRate = input.exchange_rate || 1;
      const amountBase = input.amount / exchangeRate;
      const changeAmount = input.tendered ? input.tendered - input.amount : null;

      const { data, error } = await (supabase
        .from('sale_payments') as any)
        .insert({
          sale_id: input.sale_id,
          payment_method: input.payment_method,
          currency_code: input.currency_code,
          amount: input.amount,
          exchange_rate: exchangeRate,
          amount_base: amountBase,
          tendered: input.tendered,
          change_amount: changeAmount,
          reference: input.reference,
          status: 'completed',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-today'] });
    },
  });
}

export function useVoidSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sale_id, reason }: { sale_id: string; reason: string }) => {
      const { error } = await (supabase
        .from('sales') as any)
        .update({
          status: 'voided',
          void_reason: reason,
        })
        .eq('id', sale_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-today'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-aggregated'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    },
  });
}

// Held sales
export function useHeldSales() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['held-sales', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('held_sales')
        .select(`
          *,
          held_by_user:user_profiles!held_sales_held_by_fkey(full_name),
          zone:zones(name)
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'held')
        .order('held_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });
}

export function useHoldSale() {
  const queryClient = useQueryClient();
  const { organization, profile } = useAuthStore();

  return useMutation({
    mutationFn: async (input: {
      zone_id: string;
      items: any[];
      subtotal: number;
      total_weight_kg: number;
      customer_name?: string;
      customer_phone?: string;
      notes?: string;
    }) => {
      if (!organization?.id || !profile?.id) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('held_sales') as any)
        .insert({
          organization_id: organization.id,
          held_by: profile.id,
          zone_id: input.zone_id,
          items: input.items,
          subtotal: input.subtotal,
          total_weight_kg: input.total_weight_kg,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['held-sales'] });
    },
  });
}

export function useRecallHeldSale() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (held_sale_id: string) => {
      // Get the held sale
      const { data: heldSale, error: fetchError } = await supabase
        .from('held_sales')
        .select('*')
        .eq('id', held_sale_id)
        .single();

      if (fetchError) throw fetchError;

      // Mark as recalled
      const { error: updateError } = await (supabase
        .from('held_sales') as any)
        .update({
          status: 'recalled',
          recalled_at: new Date().toISOString(),
          recalled_by: profile?.id,
        })
        .eq('id', held_sale_id);

      if (updateError) throw updateError;

      return heldSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['held-sales'] });
    },
  });
}
