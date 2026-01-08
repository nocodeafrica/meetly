import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Grade, GradingScheme } from '../types/database';

export function useGradingSchemes() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['grading-schemes', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('grading_schemes')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as GradingScheme[];
    },
    enabled: !!organization?.id,
  });
}

export function useGrades(schemeId?: string) {
  return useQuery({
    queryKey: ['grades', schemeId],
    queryFn: async () => {
      if (!schemeId) return [];

      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('grading_scheme_id', schemeId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as Grade[];
    },
    enabled: !!schemeId,
  });
}

export function useAllGrades() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['all-grades', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          grading_scheme:grading_schemes(id, name)
        `)
        .eq('grading_schemes.organization_id', organization.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as (Grade & { grading_scheme: GradingScheme })[];
    },
    enabled: !!organization?.id,
  });
}
