import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface DateRange {
  from: string;
  to: string;
}

export interface SalesSummary {
  total_sales: number;
  transaction_count: number;
  total_weight_kg: number;
  avg_sale_value: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  by_payment_method: { method: string; amount: number; count: number }[];
  by_day: { date: string; total: number; count: number }[];
}

export interface StockSummary {
  total_products: number;
  total_weight_kg: number;
  total_value: number;
  low_stock_count: number;
  by_zone: { zone_name: string; weight_kg: number; value: number }[];
  by_category: { category_name: string; weight_kg: number; value: number }[];
  low_stock_items: { product_name: string; current_kg: number; minimum_kg: number }[];
}

export interface CarcassYieldReport {
  carcass_id: string;
  carcass_number: string;
  supplier_name: string;
  received_at: string;
  live_weight_kg: number;
  cold_weight_kg: number;
  output_kg: number;
  waste_kg: number;
  yield_percent: number;
  cost_per_kg: number;
  revenue: number;
  margin: number;
  margin_percent: number;
}

export function useSalesSummary(dateRange: DateRange) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['report-sales', organization?.id, dateRange],
    queryFn: async () => {
      if (!organization?.id) return null;

      // Get sales in date range
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'completed')
        .gte('sale_date', dateRange.from)
        .lte('sale_date', dateRange.to);

      if (salesError) throw salesError;

      const salesData = (sales || []) as any[];

      // Get payments breakdown
      const { data: payments, error: paymentsError } = await supabase
        .from('sale_payments')
        .select(`
          payment_method,
          amount_base,
          sale:sales!inner(
            organization_id,
            sale_date,
            status
          )
        `)
        .eq('sale.organization_id', organization.id)
        .eq('sale.status', 'completed')
        .gte('sale.sale_date', dateRange.from)
        .lte('sale.sale_date', dateRange.to);

      if (paymentsError) throw paymentsError;

      const paymentsData = (payments || []) as any[];

      // Calculate totals
      const totalSales = salesData.reduce((sum, s) => sum + s.total_amount, 0);
      const totalWeight = salesData.reduce((sum, s) => sum + s.total_weight_kg, 0);
      const totalCost = salesData.reduce((sum, s) => sum + s.total_cost, 0);
      const totalMargin = salesData.reduce((sum, s) => sum + s.margin_amount, 0);

      // By payment method
      const byMethod: Record<string, { amount: number; count: number }> = {};
      for (const p of paymentsData) {
        if (!byMethod[p.payment_method]) {
          byMethod[p.payment_method] = { amount: 0, count: 0 };
        }
        byMethod[p.payment_method].amount += p.amount_base;
        byMethod[p.payment_method].count += 1;
      }

      // By day
      const byDay: Record<string, { total: number; count: number }> = {};
      for (const s of salesData) {
        if (!byDay[s.sale_date]) {
          byDay[s.sale_date] = { total: 0, count: 0 };
        }
        byDay[s.sale_date].total += s.total_amount;
        byDay[s.sale_date].count += 1;
      }

      return {
        total_sales: totalSales,
        transaction_count: salesData.length,
        total_weight_kg: totalWeight,
        avg_sale_value: salesData.length > 0 ? totalSales / salesData.length : 0,
        total_cost: totalCost,
        total_margin: totalMargin,
        margin_percent: totalSales > 0 ? (totalMargin / totalSales) * 100 : 0,
        by_payment_method: Object.entries(byMethod).map(([method, data]) => ({
          method,
          ...data,
        })),
        by_day: Object.entries(byDay)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      } as SalesSummary;
    },
    enabled: !!organization?.id && !!dateRange.from && !!dateRange.to,
  });
}

export function useStockSummary() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['report-stock', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data: stock, error } = await supabase
        .from('stock')
        .select(`
          quantity_kg,
          total_cost,
          product:products(
            id,
            name,
            minimum_stock_kg,
            category:product_categories(name)
          ),
          zone:zones(name)
        `)
        .eq('organization_id', organization.id)
        .gt('quantity_kg', 0);

      if (error) throw error;

      const stockData = (stock || []) as any[];

      // Aggregate
      const byZone: Record<string, { weight_kg: number; value: number }> = {};
      const byCategory: Record<string, { weight_kg: number; value: number }> = {};
      const lowStockItems: { product_name: string; current_kg: number; minimum_kg: number }[] = [];
      const seenProducts = new Set<string>();

      let totalWeight = 0;
      let totalValue = 0;
      let totalProducts = 0;

      for (const item of stockData) {
        totalWeight += item.quantity_kg;
        totalValue += item.total_cost;

        // Track unique products
        if (!seenProducts.has(item.product.id)) {
          seenProducts.add(item.product.id);
          totalProducts++;
        }

        // By zone
        const zoneName = item.zone?.name || 'Unknown';
        if (!byZone[zoneName]) {
          byZone[zoneName] = { weight_kg: 0, value: 0 };
        }
        byZone[zoneName].weight_kg += item.quantity_kg;
        byZone[zoneName].value += item.total_cost;

        // By category
        const categoryName = item.product?.category?.name || 'Uncategorized';
        if (!byCategory[categoryName]) {
          byCategory[categoryName] = { weight_kg: 0, value: 0 };
        }
        byCategory[categoryName].weight_kg += item.quantity_kg;
        byCategory[categoryName].value += item.total_cost;
      }

      // Check low stock by aggregating product totals
      const productTotals: Record<string, { name: string; total: number; min: number }> = {};
      for (const item of stockData) {
        const pid = item.product.id;
        if (!productTotals[pid]) {
          productTotals[pid] = {
            name: item.product.name,
            total: 0,
            min: item.product.minimum_stock_kg || 0,
          };
        }
        productTotals[pid].total += item.quantity_kg;
      }

      for (const p of Object.values(productTotals)) {
        if (p.min > 0 && p.total < p.min) {
          lowStockItems.push({
            product_name: p.name,
            current_kg: p.total,
            minimum_kg: p.min,
          });
        }
      }

      return {
        total_products: totalProducts,
        total_weight_kg: totalWeight,
        total_value: totalValue,
        low_stock_count: lowStockItems.length,
        by_zone: Object.entries(byZone).map(([zone_name, data]) => ({
          zone_name,
          ...data,
        })),
        by_category: Object.entries(byCategory).map(([category_name, data]) => ({
          category_name,
          ...data,
        })),
        low_stock_items: lowStockItems.sort((a, b) =>
          (a.current_kg / a.minimum_kg) - (b.current_kg / b.minimum_kg)
        ),
      } as StockSummary;
    },
    enabled: !!organization?.id,
  });
}

export function useCarcassYieldReport(dateRange: DateRange) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['report-carcass-yield', organization?.id, dateRange],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('carcasses')
        .select(`
          id,
          carcass_number,
          supplier:suppliers(name),
          received_at,
          live_weight_kg,
          cold_weight_kg,
          total_output_kg,
          total_waste_kg,
          total_cost,
          total_revenue,
          current_margin
        `)
        .eq('organization_id', organization.id)
        .gte('received_at', dateRange.from)
        .lte('received_at', dateRange.to + 'T23:59:59')
        .order('received_at', { ascending: false });

      if (error) throw error;

      return ((data || []) as any[]).map(c => {
        const coldWeight = c.cold_weight_kg || c.live_weight_kg;
        const outputKg = c.total_output_kg || 0;
        const wasteKg = c.total_waste_kg || 0;
        const yieldPercent = coldWeight > 0 ? ((outputKg + wasteKg) / coldWeight) * 100 : 0;
        const costPerKg = coldWeight > 0 ? c.total_cost / coldWeight : 0;
        const margin = c.current_margin || (c.total_revenue - c.total_cost);
        const marginPercent = c.total_revenue > 0 ? (margin / c.total_revenue) * 100 : 0;

        return {
          carcass_id: c.id,
          carcass_number: c.carcass_number,
          supplier_name: c.supplier?.name || '-',
          received_at: c.received_at,
          live_weight_kg: c.live_weight_kg,
          cold_weight_kg: coldWeight,
          output_kg: outputKg,
          waste_kg: wasteKg,
          yield_percent: yieldPercent,
          cost_per_kg: costPerKg,
          revenue: c.total_revenue || 0,
          margin,
          margin_percent: marginPercent,
        } as CarcassYieldReport;
      });
    },
    enabled: !!organization?.id && !!dateRange.from && !!dateRange.to,
  });
}

export function useTopProducts(dateRange: DateRange, limit = 10) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['report-top-products', organization?.id, dateRange, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity_kg,
          line_total,
          product:products(name, sku),
          sale:sales!inner(
            organization_id,
            sale_date,
            status
          )
        `)
        .eq('sale.organization_id', organization.id)
        .eq('sale.status', 'completed')
        .gte('sale.sale_date', dateRange.from)
        .lte('sale.sale_date', dateRange.to);

      if (error) throw error;

      const itemsData = (data || []) as any[];

      // Aggregate by product
      const byProduct: Record<string, { name: string; sku: string; weight: number; revenue: number }> = {};
      for (const item of itemsData) {
        const pid = item.product_id;
        if (!byProduct[pid]) {
          byProduct[pid] = {
            name: item.product?.name || 'Unknown',
            sku: item.product?.sku || '',
            weight: 0,
            revenue: 0,
          };
        }
        byProduct[pid].weight += item.quantity_kg;
        byProduct[pid].revenue += item.line_total;
      }

      return Object.entries(byProduct)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    },
    enabled: !!organization?.id && !!dateRange.from && !!dateRange.to,
  });
}
