import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { UserProfile, Organization, Role } from '../types/database';

// Profile hooks
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setProfile, profile } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      phone?: string;
    }) => {
      if (!profile?.id) throw new Error('No profile found');

      const { data: updated, error } = await (supabase
        .from('user_profiles') as any)
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return updated as UserProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Organization hooks
export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { setOrganization, organization } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      trading_name?: string;
      tax_number?: string;
      address?: string;
      phone?: string;
      email?: string;
      settings?: Record<string, unknown>;
    }) => {
      if (!organization?.id) throw new Error('No organization found');

      const { data: updated, error } = await (supabase
        .from('organizations') as any)
        .update({
          name: data.name,
          trading_name: data.trading_name || null,
          tax_number: data.tax_number || null,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          settings: data.settings || organization.settings,
        })
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return updated as Organization;
    },
    onSuccess: (data) => {
      setOrganization(data);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

// Users hooks
export function useOrganizationUsers() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['organization-users', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles (
            role:roles (
              id,
              name,
              display_name
            )
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Role[];
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await (supabase
        .from('user_profiles') as any)
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
    },
  });
}

// Security hooks
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ newPassword }: { currentPassword: string; newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
  });
}
