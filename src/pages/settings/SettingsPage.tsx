import { useState, useEffect } from 'react';
import { User, Building2, Users, Package, Truck, Scissors, DollarSign, Bell, Shield, Plus, Check, X, Loader2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import { ProductsSettings } from './ProductsSettings';
import { SuppliersSettings } from './SuppliersSettings';
import { useAuth } from '../../hooks/useAuth';
import {
  useUpdateProfile,
  useUpdateOrganization,
  useOrganizationUsers,
  useRoles,
  useUpdateUserStatus,
  useUpdatePassword,
} from '../../hooks/useSettings';

type SettingsTab = 'profile' | 'organization' | 'users' | 'products' | 'suppliers' | 'cutting' | 'pricing' | 'notifications' | 'security';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: User },
    { id: 'organization' as const, name: 'Organization', icon: Building2 },
    { id: 'users' as const, name: 'Users & Roles', icon: Users },
    { id: 'products' as const, name: 'Products', icon: Package },
    { id: 'suppliers' as const, name: 'Suppliers', icon: Truck },
    { id: 'cutting' as const, name: 'Cutting Setup', icon: Scissors },
    { id: 'pricing' as const, name: 'Pricing', icon: DollarSign },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
    { id: 'security' as const, name: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your account and organization settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardBody className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-meat-50 text-meat-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </CardBody>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'organization' && <OrganizationSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'products' && <ProductsSettings />}
          {activeTab === 'suppliers' && <SuppliersSettings />}
          {activeTab === 'cutting' && <CuttingSettings />}
          {activeTab === 'pricing' && <PricingSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getInitials = () => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '??';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
      </CardHeader>
      <CardBody className="p-6 space-y-6">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full bg-meat-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-meat-700">{getInitials()}</span>
          </div>
          <div>
            <Button variant="outline" size="sm">Change Photo</Button>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG. Max 2MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={profile?.email || ''}
            disabled
            className="bg-gray-50"
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+263 77 123 4567"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved successfully
            </span>
          )}
          <Button
            onClick={handleSave}
            isLoading={updateProfile.isPending}
          >
            Save Changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function OrganizationSettings() {
  const { organization } = useAuth();
  const updateOrganization = useUpdateOrganization();

  const [name, setName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('Africa/Harare');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setTradingName(organization.trading_name || '');
      setTaxNumber(organization.tax_number || '');
      setAddress(organization.address || '');
      setPhone(organization.phone || '');
      setEmail(organization.email || '');
      const settings = organization.settings as Record<string, unknown> | null;
      setCurrency((settings?.currency as string) || 'USD');
      setTimezone((settings?.timezone as string) || 'Africa/Harare');
    }
  }, [organization]);

  const handleSave = async () => {
    const currentSettings = (organization?.settings as Record<string, unknown>) || {};
    await updateOrganization.mutateAsync({
      name,
      trading_name: tradingName || undefined,
      tax_number: taxNumber || undefined,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      settings: {
        ...currentSettings,
        currency,
        timezone,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
      </CardHeader>
      <CardBody className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Trading Name"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
          />
          <Input
            label="Tax Number / TIN"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
          />
          <div className="md:col-span-2">
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="ZWL">ZWL - Zimbabwe Dollar</option>
              <option value="ZAR">ZAR - South African Rand</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="Africa/Harare">Africa/Harare (CAT)</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved successfully
            </span>
          )}
          <Button
            onClick={handleSave}
            isLoading={updateOrganization.isPending}
          >
            Save Changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function UsersSettings() {
  const { data: users, isLoading } = useOrganizationUsers();
  const { data: roles } = useRoles();
  const updateStatus = useUpdateUserStatus();
  const [showAddModal, setShowAddModal] = useState(false);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '??';
  };

  const getRoleName = (user: any) => {
    const userRole = user.user_roles?.[0]?.role;
    return userRole?.display_name || userRole?.name || 'No Role';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users & Roles</CardTitle>
        <Button size="sm" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add User
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : !users || users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-meat-100 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-meat-700">
                            {getInitials(user.first_name, user.last_name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{getRoleName(user)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatus.mutate({ userId: user.id, isActive: !user.is_active })}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      {showAddModal && (
        <AddUserModal
          roles={roles || []}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </Card>
  );
}

function AddUserModal({ roles, onClose }: { roles: any[]; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add New User</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="">Select role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.display_name || role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!email || !firstName || !password || !roleId}>
              Create User
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Note: Creating users requires admin API access. Contact support if this doesn't work.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function CuttingSettings() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cutting Configuration</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Add Template
        </Button>
      </CardHeader>
      <CardBody className="p-6">
        <p className="text-gray-500 mb-6">
          Configure yield templates to define expected outputs from carcass cutting operations.
        </p>

        <div className="text-center py-8 text-gray-500">
          <Scissors className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No yield templates configured</p>
          <p className="text-sm mt-1">Create templates to track cutting efficiency</p>
        </div>
      </CardBody>
    </Card>
  );
}

function PricingSettings() {
  const { organization } = useAuth();
  const [taxRate, setTaxRate] = useState('15');
  const [defaultMargin, setDefaultMargin] = useState('30');

  useEffect(() => {
    if (organization?.settings) {
      const settings = organization.settings as Record<string, unknown>;
      setTaxRate((settings.default_tax_rate as string)?.toString() || '15');
      setDefaultMargin((settings.default_margin as string)?.toString() || '30');
    }
  }, [organization]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Rules</CardTitle>
      </CardHeader>
      <CardBody className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Default Tax Rate (%)"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Applied to all products unless overridden</p>
          </div>
          <div>
            <Input
              label="Default Markup Margin (%)"
              type="number"
              value={defaultMargin}
              onChange={(e) => setDefaultMargin(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Suggested margin for pricing calculations</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Currency Exchange Rates</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">USD to ZWL</p>
                <p className="text-xs text-gray-500">Updated manually</p>
              </div>
              <Input
                type="number"
                className="w-32"
                placeholder="Rate"
                defaultValue="1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Pricing Settings</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function NotificationsSettings() {
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);
  const [salesAlerts, setSalesAlerts] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardBody className="p-6 space-y-6">
        <p className="text-gray-500">Configure which alerts and notifications you want to receive.</p>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">Low Stock Alerts</p>
              <p className="text-sm text-gray-500">Get notified when products fall below minimum stock levels</p>
            </div>
            <input
              type="checkbox"
              checked={lowStockAlerts}
              onChange={(e) => setLowStockAlerts(e.target.checked)}
              className="w-5 h-5 text-meat-600 rounded focus:ring-meat-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">Expiry Alerts</p>
              <p className="text-sm text-gray-500">Get notified about products approaching expiry date</p>
            </div>
            <input
              type="checkbox"
              checked={expiryAlerts}
              onChange={(e) => setExpiryAlerts(e.target.checked)}
              className="w-5 h-5 text-meat-600 rounded focus:ring-meat-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">Daily Sales Report</p>
              <p className="text-sm text-gray-500">Receive a summary of daily sales via email</p>
            </div>
            <input
              type="checkbox"
              checked={dailyReport}
              onChange={(e) => setDailyReport(e.target.checked)}
              className="w-5 h-5 text-meat-600 rounded focus:ring-meat-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">Large Sale Alerts</p>
              <p className="text-sm text-gray-500">Get notified for sales above a certain threshold</p>
            </div>
            <input
              type="checkbox"
              checked={salesAlerts}
              onChange={(e) => setSalesAlerts(e.target.checked)}
              className="w-5 h-5 text-meat-600 rounded focus:ring-meat-500"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button>Save Preferences</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function SecuritySettings() {
  const updatePassword = useUpdatePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await updatePassword.mutateAsync({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardBody className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Password updated successfully
            </div>
          )}

          <div className="space-y-4 max-w-md">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              onClick={handleUpdatePassword}
              isLoading={updatePassword.isPending}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Update Password
            </Button>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 mb-4">Add an extra layer of security to your account.</p>
          <Button variant="outline">Enable 2FA</Button>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Active Sessions</h3>
          <p className="text-sm text-gray-500 mb-4">Manage your active login sessions.</p>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Current Session</p>
                <p className="text-xs text-gray-500">Last active: Just now</p>
              </div>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
