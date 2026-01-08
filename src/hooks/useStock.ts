import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface StockItem {
  id: string;
  organization_id: string;
  product_id: string;
  zone_id: string;
  quantity_kg: number;
  quantity_units: number;
  cost_per_kg: number;
  total_cost: number;
  batch_number: string | null;
  source_type: string;
  source_id: string | null;
  received_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  product?: {
    id: string;
    name: string;
    sku: string;
    unit_of_measure: string;
    sold_by: string;
    category?: { id: string; name: string } | null;
  };
  zone?: {
    id: string;
    name: string;
    code: string;
    zone_type: string;
  };
}

export interface StockMovement {
  id: string;
  organization_id: string;
  stock_id: string;
  movement_type: string;
  quantity_kg: number;
  quantity_units: number;
  from_zone_id: string | null;
  to_zone_id: string | null;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  created_at: string;
  // Relations
  stock?: StockItem;
  from_zone?: { name: string };
  to_zone?: { name: string };
  performed_by_user?: { full_name: string };
}

interface StockFilters {
  zone_id?: string;
  product_id?: string;
  category_id?: string;
  low_stock?: boolean;
}

export function useStock(filters?: StockFilters) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['stock', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('stock')
        .select(`
          *,
          product:products(
            id, name, sku, unit_of_measure, sold_by,
            category:product_categories(id, name)
          ),
          zone:zones(id, name, code, zone_type)
        `)
        .eq('organization_id', organization.id)
        .gt('quantity_kg', 0)
        .order('product(name)');

      if (filters?.zone_id) {
        query = query.eq('zone_id', filters.zone_id);
      }

      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StockItem[];
    },
    enabled: !!organization?.id,
  });
}

export interface AggregatedStock {
  product_id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit_of_measure: string;
    sold_by: string;
    minimum_stock_kg: number;
    reorder_point_kg: number;
    category?: { id: string; name: string } | null;
  };
  total_quantity_kg: number;
  total_quantity_units: number;
  total_cost: number;
  avg_cost_per_kg: number;
  zones: {
    zone_id: string;
    zone_name: string;
    quantity_kg: number;
    quantity_units: number;
  }[];
}

export function useAggregatedStock(filters?: { category_id?: string; search?: string }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['stock-aggregated', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('stock')
        .select(`
          product_id,
          quantity_kg,
          quantity_units,
          cost_per_kg,
          total_cost,
          zone_id,
          product:products(
            id, name, sku, unit_of_measure, sold_by, minimum_stock_kg, reorder_point_kg,
            category:product_categories(id, name),
            category_id
          ),
          zone:zones(id, name, code)
        `)
        .eq('organization_id', organization.id)
        .gt('quantity_kg', 0);

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search if provided
      let filteredData = data || [];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((item: any) =>
          item.product?.name?.toLowerCase().includes(searchLower) ||
          item.product?.sku?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by category if provided
      if (filters?.category_id) {
        filteredData = filteredData.filter((item: any) =>
          item.product?.category_id === filters.category_id
        );
      }

      // Aggregate by product
      const aggregated: Record<string, AggregatedStock> = {};
      for (const item of filteredData) {
        const productId = (item as any).product_id;
        if (!aggregated[productId]) {
          aggregated[productId] = {
            product_id: productId,
            product: (item as any).product,
            total_quantity_kg: 0,
            total_quantity_units: 0,
            total_cost: 0,
            avg_cost_per_kg: 0,
            zones: [],
          };
        }
        aggregated[productId].total_quantity_kg += (item as any).quantity_kg;
        aggregated[productId].total_quantity_units += (item as any).quantity_units;
        aggregated[productId].total_cost += (item as any).total_cost;
        aggregated[productId].zones.push({
          zone_id: (item as any).zone_id,
          zone_name: (item as any).zone?.name,
          quantity_kg: (item as any).quantity_kg,
          quantity_units: (item as any).quantity_units,
        });
      }

      // Calculate average cost
      for (const key of Object.keys(aggregated)) {
        aggregated[key].avg_cost_per_kg = aggregated[key].total_quantity_kg > 0
          ? aggregated[key].total_cost / aggregated[key].total_quantity_kg
          : 0;
      }

      return Object.values(aggregated).sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
      );
    },
    enabled: !!organization?.id,
  });
}

export function useStockMovements(filters?: { stock_id?: string; zone_id?: string; limit?: number }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['stock-movements', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          stock:stock(product:products(name, sku)),
          from_zone:zones!stock_movements_from_zone_id_fkey(name),
          to_zone:zones!stock_movements_to_zone_id_fkey(name),
          performed_by_user:user_profiles!stock_movements_performed_by_fkey(full_name)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (filters?.stock_id) {
        query = query.eq('stock_id', filters.stock_id);
      }

      if (filters?.zone_id) {
        query = query.or(`from_zone_id.eq.${filters.zone_id},to_zone_id.eq.${filters.zone_id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StockMovement[];
    },
    enabled: !!organization?.id,
  });
}

interface TransferStockInput {
  stock_id: string;
  from_zone_id: string;
  to_zone_id: string;
  quantity_kg: number;
  quantity_units: number;
  reason?: string;
}

export function useTransferStock() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (input: TransferStockInput) => {
      // Get original stock item
      const { data: originalStock, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('id', input.stock_id)
        .single();

      if (stockError) throw stockError;
      const stock = originalStock as any;

      // Create movement record
      const { error: movementError } = await (supabase
        .from('stock_movements') as any)
        .insert({
          organization_id: stock.organization_id,
          stock_id: input.stock_id,
          movement_type: 'transfer',
          quantity_kg: input.quantity_kg,
          quantity_units: input.quantity_units,
          from_zone_id: input.from_zone_id,
          to_zone_id: input.to_zone_id,
          reason: input.reason || null,
          performed_by: profile?.id || null,
        });

      if (movementError) throw movementError;

      // Update original stock (reduce)
      const newQuantityKg = stock.quantity_kg - input.quantity_kg;
      const newQuantityUnits = stock.quantity_units - input.quantity_units;

      await (supabase
        .from('stock') as any)
        .update({
          quantity_kg: newQuantityKg,
          quantity_units: newQuantityUnits,
          total_cost: newQuantityKg * stock.cost_per_kg,
        })
        .eq('id', input.stock_id);

      // Check if stock already exists in destination zone
      const { data: existingStock } = await supabase
        .from('stock')
        .select('*')
        .eq('product_id', stock.product_id)
        .eq('zone_id', input.to_zone_id)
        .eq('batch_number', stock.batch_number || '')
        .single();

      if (existingStock) {
        // Add to existing stock
        const existing = existingStock as any;
        await (supabase
          .from('stock') as any)
          .update({
            quantity_kg: existing.quantity_kg + input.quantity_kg,
            quantity_units: existing.quantity_units + input.quantity_units,
            total_cost: (existing.quantity_kg + input.quantity_kg) * existing.cost_per_kg,
          })
          .eq('id', existing.id);
      } else {
        // Create new stock entry
        await (supabase
          .from('stock') as any)
          .insert({
            organization_id: stock.organization_id,
            product_id: stock.product_id,
            zone_id: input.to_zone_id,
            quantity_kg: input.quantity_kg,
            quantity_units: input.quantity_units,
            cost_per_kg: stock.cost_per_kg,
            total_cost: input.quantity_kg * stock.cost_per_kg,
            batch_number: stock.batch_number,
            source_type: 'transfer',
            source_id: stock.id,
            received_at: new Date().toISOString(),
            expires_at: stock.expires_at,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-aggregated'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

interface AdjustStockInput {
  stock_id: string;
  new_quantity_kg: number;
  new_quantity_units: number;
  reason: string;
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      // Get original stock item
      const { data: originalStock, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('id', input.stock_id)
        .single();

      if (stockError) throw stockError;
      const stock = originalStock as any;

      const diffKg = input.new_quantity_kg - stock.quantity_kg;
      const diffUnits = input.new_quantity_units - stock.quantity_units;

      // Create movement record
      await (supabase
        .from('stock_movements') as any)
        .insert({
          organization_id: stock.organization_id,
          stock_id: input.stock_id,
          movement_type: 'adjustment',
          quantity_kg: Math.abs(diffKg),
          quantity_units: Math.abs(diffUnits),
          reason: input.reason,
          performed_by: profile?.id || null,
        });

      // Update stock
      await (supabase
        .from('stock') as any)
        .update({
          quantity_kg: input.new_quantity_kg,
          quantity_units: input.new_quantity_units,
          total_cost: input.new_quantity_kg * stock.cost_per_kg,
        })
        .eq('id', input.stock_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-aggregated'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}
