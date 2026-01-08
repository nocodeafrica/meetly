import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Zone } from '../types/database';

export function useZones() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['zones', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return (data || []) as Zone[];
    },
    enabled: !!organization?.id,
  });
}

export function useZone(id: string) {
  return useQuery({
    queryKey: ['zone', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Zone;
    },
    enabled: !!id,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Zone>) => {
      const insertData = {
        ...data,
        organization_id: organization?.id,
      } as any;

      const { data: zone, error } = await supabase
        .from('zones')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return zone as Zone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Zone> }) => {
      const { data: zone, error } = await (supabase
        .from('zones') as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return zone as Zone;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['zone', variables.id] });
    },
  });
}
