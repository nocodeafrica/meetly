import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Product, ProductCategory } from '../types/database';

// Products
export function useProducts(options?: { categoryId?: string; search?: string }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['products', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(id, name),
          grading_scheme:grading_schemes(id, name)
        `)
        .eq('organization_id', organization.id)
        .order('name');

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as (Product & { category: ProductCategory | null })[];
    },
    enabled: !!organization?.id,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(id, name),
          grading_scheme:grading_schemes(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Product & { category: ProductCategory | null };
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const insertData = {
        ...data,
        organization_id: organization?.id,
      } as any;

      const { data: product, error } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return product as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const { data: product, error } = await (supabase
        .from('products') as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return product as Product;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Categories
export function useCategories() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['categories', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order')
        .order('name');

      if (error) throw error;
      return (data || []) as ProductCategory[];
    },
    enabled: !!organization?.id,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as ProductCategory;
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<ProductCategory>) => {
      const insertData = {
        ...data,
        organization_id: organization?.id,
      } as any;

      const { data: category, error } = await supabase
        .from('product_categories')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return category as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductCategory> }) => {
      const { data: category, error } = await (supabase
        .from('product_categories') as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return category as ProductCategory;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', variables.id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
