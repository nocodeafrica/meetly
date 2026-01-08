import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Supplier } from '../types/database';

export function useSuppliers(options?: { search?: string }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['suppliers', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Supplier[];
    },
    enabled: !!organization?.id,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Supplier;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const insertData = {
        ...data,
        organization_id: organization?.id,
      } as any;

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return supplier as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      const { data: supplier, error } = await (supabase
        .from('suppliers') as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return supplier as Supplier;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
