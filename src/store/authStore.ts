import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile, Role, Organization } from '../types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organization: Organization | null;
  roles: Role[];
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setOrganization: (organization: Organization | null) => void;
  setRoles: (roles: Role[]) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasPermission: (module: string, action: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      organization: null,
      roles: [],
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setOrganization: (organization) => set({ organization }),
      setRoles: (roles) => set({ roles }),
      setLoading: (isLoading) => set({ isLoading }),

      logout: () => set({
        user: null,
        session: null,
        profile: null,
        organization: null,
        roles: [],
        isAuthenticated: false,
      }),

      hasRole: (roleName: string) => {
        const { roles } = get();
        return roles.some((role) => role.name === roleName);
      },

      hasAnyRole: (roleNames: string[]) => {
        const { roles } = get();
        return roles.some((role) => roleNames.includes(role.name));
      },

      hasPermission: (module: string, action: string) => {
        const { roles } = get();
        return roles.some((role) => {
          const permissions = role.permissions as Record<string, Record<string, boolean | number>>;
          return permissions?.[module]?.[action] === true;
        });
      },
    }),
    {
      name: 'meatly-auth',
      partialize: (state) => ({
        // Only persist minimal auth state
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
