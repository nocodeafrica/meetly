import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface CuttingSession {
  id: string;
  organization_id: string;
  session_number: string;
  carcass_id: string | null;
  butcher_id: string | null;
  station_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  input_weight_kg: number;
  total_output_kg: number;
  waste_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  carcass?: {
    id: string;
    carcass_number: string;
    weight_kg: number;
    status: string;
    cost_per_kg?: number;
    cost_total?: number;
    supplier?: { name: string } | null;
    grade?: { code: string; name: string } | null;
  };
  butcher?: {
    id: string;
    full_name: string;
  } | null;
  cuts?: CuttingSessionCut[];
}

export interface CuttingSessionCut {
  id: string;
  session_id: string;
  product_id: string;
  weight_kg: number;
  quantity: number;
  grade_id: string | null;
  notes: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: { name: string } | null;
  };
  grade?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface CuttingSessionFilters {
  status?: string;
  carcass_id?: string;
  butcher_id?: string;
  from_date?: string;
  to_date?: string;
}

export function useCuttingSessions(filters?: CuttingSessionFilters) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['cutting-sessions', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('cutting_sessions')
        .select(`
          *,
          carcass:carcasses(
            id,
            carcass_number,
            weight_kg,
            status,
            supplier:suppliers(name),
            grade:grades(code, name)
          ),
          butcher:user_profiles!cutting_sessions_butcher_id_fkey(
            id,
            full_name
          )
        `)
        .eq('organization_id', organization.id)
        .order('started_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.carcass_id) {
        query = query.eq('carcass_id', filters.carcass_id);
      }
      if (filters?.butcher_id) {
        query = query.eq('butcher_id', filters.butcher_id);
      }
      if (filters?.from_date) {
        query = query.gte('started_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('started_at', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as CuttingSession[];
    },
    enabled: !!organization?.id,
  });
}

export function useCuttingSession(id: string) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['cutting-session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cutting_sessions')
        .select(`
          *,
          carcass:carcasses(
            id,
            carcass_number,
            weight_kg,
            status,
            cost_per_kg,
            cost_total,
            supplier:suppliers(name),
            grade:grades(code, name)
          ),
          butcher:user_profiles!cutting_sessions_butcher_id_fkey(
            id,
            full_name
          ),
          cuts:cutting_session_cuts(
            *,
            product:products(id, name, sku, category:categories(name)),
            grade:grades(id, code, name)
          )
        `)
        .eq('id', id)
        .eq('organization_id', organization?.id || '')
        .single();

      if (error) throw error;
      return data as unknown as CuttingSession;
    },
    enabled: !!id && !!organization?.id,
  });
}

interface CreateCuttingSessionInput {
  carcass_id: string;
  butcher_id?: string | null;
  station_id?: string | null;
  notes?: string | null;
}

export function useCreateCuttingSession() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateCuttingSessionInput) => {
      if (!organization?.id) throw new Error('No organization');

      // Get carcass weight
      const { data: carcass } = await supabase
        .from('carcasses')
        .select('weight_kg')
        .eq('id', input.carcass_id)
        .single();

      const carcassData = carcass as { weight_kg: number } | null;

      const { data, error } = await supabase
        .from('cutting_sessions')
        .insert({
          organization_id: organization.id,
          carcass_id: input.carcass_id,
          butcher_id: input.butcher_id || null,
          station_id: input.station_id || null,
          input_weight_kg: carcassData?.weight_kg || 0,
          total_output_kg: 0,
          waste_kg: 0,
          status: 'active',
          notes: input.notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update carcass status to processing
      await (supabase
        .from('carcasses') as any)
        .update({ status: 'processing' })
        .eq('id', input.carcass_id);

      return data as CuttingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cutting-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['carcasses'] });
    },
  });
}

interface AddCutInput {
  session_id: string;
  product_id: string;
  weight_kg: number;
  quantity: number;
  grade_id?: string | null;
  notes?: string | null;
}

export function useAddCut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCutInput) => {
      const { data, error } = await supabase
        .from('cutting_session_cuts')
        .insert({
          session_id: input.session_id,
          product_id: input.product_id,
          weight_kg: input.weight_kg,
          quantity: input.quantity,
          grade_id: input.grade_id || null,
          notes: input.notes || null,
        } as any)
        .select(`
          *,
          product:products(id, name, sku),
          grade:grades(id, code, name)
        `)
        .single();

      if (error) throw error;

      // Update session totals
      const { data: cuts } = await supabase
        .from('cutting_session_cuts')
        .select('weight_kg')
        .eq('session_id', input.session_id);

      const cutsData = (cuts || []) as { weight_kg: number }[];
      const totalOutput = cutsData.reduce((sum, cut) => sum + cut.weight_kg, 0);

      await (supabase
        .from('cutting_sessions') as any)
        .update({ total_output_kg: totalOutput })
        .eq('id', input.session_id);

      return data as CuttingSessionCut;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cutting-session', variables.session_id] });
      queryClient.invalidateQueries({ queryKey: ['cutting-sessions'] });
    },
  });
}

export function useRemoveCut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cutId, sessionId }: { cutId: string; sessionId: string }) => {
      const { error } = await supabase
        .from('cutting_session_cuts')
        .delete()
        .eq('id', cutId);

      if (error) throw error;

      // Update session totals
      const { data: cuts } = await supabase
        .from('cutting_session_cuts')
        .select('weight_kg')
        .eq('session_id', sessionId);

      const cutsData = (cuts || []) as { weight_kg: number }[];
      const totalOutput = cutsData.reduce((sum, cut) => sum + cut.weight_kg, 0);

      await (supabase
        .from('cutting_sessions') as any)
        .update({ total_output_kg: totalOutput })
        .eq('id', sessionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cutting-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['cutting-sessions'] });
    },
  });
}

interface UpdateWasteInput {
  session_id: string;
  waste_kg: number;
}

export function useUpdateWaste() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWasteInput) => {
      const { error } = await (supabase
        .from('cutting_sessions') as any)
        .update({ waste_kg: input.waste_kg })
        .eq('id', input.session_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cutting-session', variables.session_id] });
      queryClient.invalidateQueries({ queryKey: ['cutting-sessions'] });
    },
  });
}

interface CompleteCuttingSessionInput {
  session_id: string;
  waste_kg: number;
  notes?: string | null;
}

export function useCompleteCuttingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompleteCuttingSessionInput) => {
      // Get session with cuts and carcass
      const { data: sessionData } = await supabase
        .from('cutting_sessions')
        .select(`
          *,
          carcass:carcasses(id, weight_kg),
          cuts:cutting_session_cuts(weight_kg, product_id, quantity)
        `)
        .eq('id', input.session_id)
        .single();

      const session = sessionData as any;
      if (!session) throw new Error('Session not found');

      const totalOutput = session.cuts?.reduce((sum: number, cut: any) => sum + cut.weight_kg, 0) || 0;

      // Update session as completed
      const { error } = await (supabase
        .from('cutting_sessions') as any)
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          waste_kg: input.waste_kg,
          total_output_kg: totalOutput,
          notes: input.notes || session.notes,
        })
        .eq('id', input.session_id);

      if (error) throw error;

      // Update carcass with totals
      if (session.carcass_id) {
        const yieldPercentage = session.carcass?.weight_kg
          ? (totalOutput / session.carcass.weight_kg) * 100
          : 0;

        await (supabase
          .from('carcasses') as any)
          .update({
            status: 'completed',
            total_output_kg: totalOutput,
            waste_kg: input.waste_kg,
            yield_percentage: yieldPercentage,
          })
          .eq('id', session.carcass_id);
      }

      return session as CuttingSession;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cutting-session', variables.session_id] });
      queryClient.invalidateQueries({ queryKey: ['cutting-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['carcasses'] });
    },
  });
}
