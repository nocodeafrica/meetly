import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Carcass, Supplier, Grade, Zone } from '../types/database';

export interface CarcassWithRelations extends Carcass {
  supplier: Supplier | null;
  grade: Grade | null;
  destination_zone: Zone | null;
}

export function useCarcasses(options?: { status?: string; search?: string }) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['carcasses', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('carcasses')
        .select(`
          *,
          supplier:suppliers(id, name),
          grade:grades(id, code, name),
          destination_zone:zones(id, name)
        `)
        .eq('organization_id', organization.id)
        .order('received_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.search) {
        query = query.or(`carcass_number.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CarcassWithRelations[];
    },
    enabled: !!organization?.id,
  });
}

export function useCarcass(id: string) {
  return useQuery({
    queryKey: ['carcass', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carcasses')
        .select(`
          *,
          supplier:suppliers(id, name),
          grade:grades(id, code, name),
          destination_zone:zones(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as CarcassWithRelations;
    },
    enabled: !!id,
  });
}

export function useCreateCarcass() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Carcass>) => {
      const insertData = {
        ...data,
        organization_id: organization?.id,
      } as any;

      const { data: carcass, error } = await supabase
        .from('carcasses')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return carcass as Carcass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carcasses'] });
    },
  });
}

export function useUpdateCarcass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Carcass> }) => {
      const { data: carcass, error } = await (supabase
        .from('carcasses') as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return carcass as Carcass;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['carcasses'] });
      queryClient.invalidateQueries({ queryKey: ['carcass', variables.id] });
    },
  });
}
