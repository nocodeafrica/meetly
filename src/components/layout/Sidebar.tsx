import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Scissors,
  Package,
  ShoppingCart,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredPermission?: { module: string; action: string };
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Receiving', href: '/receiving', icon: Truck, requiredPermission: { module: 'receiving', action: 'view' } },
  { name: 'Cutting', href: '/cutting', icon: Scissors, requiredPermission: { module: 'cutting', action: 'view' } },
  { name: 'Stock', href: '/stock', icon: Package, requiredPermission: { module: 'stock', action: 'view' } },
  { name: 'POS', href: '/pos', icon: ShoppingCart, requiredPermission: { module: 'pos', action: 'view' } },
  { name: 'Reconciliation', href: '/reconciliation', icon: ClipboardCheck, requiredPermission: { module: 'reconciliation', action: 'view' } },
  { name: 'Reports', href: '/reports', icon: BarChart3, requiredPermission: { module: 'reports', action: 'view' } },
  { name: 'Settings', href: '/settings', icon: Settings, requiredPermission: { module: 'settings', action: 'view' } },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, hasPermission, profile } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload to clear state if signOut fails
      window.location.href = '/login';
    }
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission.module, item.requiredPermission.action);
  });

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 z-50 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-meat-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <span className="font-bold text-lg">Meatly</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-meat-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        {!collapsed && profile && (
          <div className="mb-3">
            <p className="text-sm font-medium text-white truncate">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-gray-400 truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`flex items-center w-full px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
