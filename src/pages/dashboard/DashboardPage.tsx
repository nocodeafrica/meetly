import {
  Truck,
  Scissors,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function StatCard({ title, value, change, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <Card>
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span>{Math.abs(change)}% vs last week</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

function QuickAction({ title, description, href, icon: Icon, color }: QuickActionProps) {
  return (
    <Link to={href} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardBody className="p-4">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

interface AlertItemProps {
  title: string;
  description: string;
  type: 'warning' | 'danger' | 'info';
  time: string;
}

function AlertItem({ title, description, type, time }: AlertItemProps) {
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[type]}`}>
      <div className="flex items-start">
        <AlertTriangle className={`w-5 h-5 mr-3 flex-shrink-0 ${icons[type]}`} />
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm mt-1 opacity-80">{description}</p>
          <p className="text-xs mt-2 opacity-60 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  // These would come from API calls in a real app
  const stats = [
    {
      title: "Today's Sales",
      value: '$12,450',
      change: 8.2,
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Carcasses Received',
      value: '24',
      change: -5.1,
      icon: Truck,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Stock Value',
      value: '$84,230',
      change: 3.4,
      icon: Package,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Avg Yield',
      value: '68.5%',
      change: 1.2,
      icon: Scale,
      iconColor: 'text-meat-600',
      iconBg: 'bg-meat-100',
    },
  ];

  const quickActions = [
    {
      title: 'Receive Carcass',
      description: 'Log incoming livestock',
      href: '/receiving/new',
      icon: Truck,
      color: 'bg-blue-600',
    },
    {
      title: 'Start Cutting',
      description: 'Begin cutting session',
      href: '/cutting/new',
      icon: Scissors,
      color: 'bg-orange-600',
    },
    {
      title: 'New Sale',
      description: 'Open POS terminal',
      href: '/pos',
      icon: ShoppingCart,
      color: 'bg-green-600',
    },
    {
      title: 'Stock Count',
      description: 'Start inventory count',
      href: '/reconciliation/count',
      icon: Package,
      color: 'bg-purple-600',
    },
  ];

  const alerts = [
    {
      title: 'Low Stock Alert',
      description: 'T-Bone steaks are below minimum threshold (12 units remaining)',
      type: 'warning' as const,
      time: '10 minutes ago',
    },
    {
      title: 'Expiring Soon',
      description: '8 products will expire within the next 24 hours',
      type: 'danger' as const,
      time: '1 hour ago',
    },
    {
      title: 'Daily Closing Pending',
      description: 'Yesterday\'s cash count has not been completed',
      type: 'info' as const,
      time: '12 hours ago',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Quick Actions and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardBody className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <QuickAction key={action.title} {...action} />
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Alerts */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {alerts.map((alert, index) => (
                <AlertItem key={index} {...alert} />
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">10:30 AM</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Sale Completed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">John Moyo</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Invoice #INV-001234 - $245.00</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">10:15 AM</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Carcass Received
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Mary Dube</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Beef carcass #BF-2024-0156 - 285kg</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">09:45 AM</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Cutting Completed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Peter Ncube</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Session #CS-001 - 45 products yielded</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">09:30 AM</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Stock Transfer
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">John Moyo</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Cold Room to Display - 20 items</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
