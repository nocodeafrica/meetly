import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Auth
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';
import type { UserProfile, Organization } from './types/database';

// Layout
import { MainLayout, ProtectedRoute } from './components/layout';

// Auth Pages
import { LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';

// App Pages
import { DashboardPage } from './pages/dashboard';
import { ReceivingPage, ReceiveCarcassPage, CarcassDetailPage } from './pages/receiving';
import { CuttingPage, NewCuttingSessionPage, CuttingSessionPage } from './pages/cutting';
import { StockPage } from './pages/stock';
import { POSPage } from './pages/pos';
import { ReconciliationPage } from './pages/reconciliation';
import { ReportsPage } from './pages/reports';
import { SettingsPage } from './pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSession, setProfile, setOrganization, setRoles, setLoading } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setOrganization(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single<UserProfile>();

      if (profile) {
        setProfile(profile);

        // Fetch organization
        if (profile.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single<Organization>();
          setOrganization(org);
        }

        // Fetch user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            role:roles(
              id,
              name,
              description,
              permissions:role_permissions(
                permission:permissions(
                  id,
                  name,
                  module,
                  action
                )
              )
            )
          `)
          .eq('user_id', userId);

        if (userRoles) {
          const roles = userRoles.map((ur: any) => ({
            ...ur.role,
            permissions: ur.role.permissions.map((rp: any) => rp.permission),
          }));
          setRoles(roles);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-meat-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-meat-600 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-gray-600">Loading Meatly...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <SignupPage />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/receiving" element={<ReceivingPage />} />
        <Route path="/receiving/new" element={<ReceiveCarcassPage />} />
        <Route path="/receiving/:id" element={<CarcassDetailPage />} />
        <Route path="/cutting" element={<CuttingPage />} />
        <Route path="/cutting/new" element={<NewCuttingSessionPage />} />
        <Route path="/cutting/:id" element={<CuttingSessionPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
