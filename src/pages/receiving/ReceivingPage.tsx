import { useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import { useCarcasses } from '../../hooks/useCarcasses';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  quartered: 'bg-blue-100 text-blue-800',
  processing: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
};

export function ReceivingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: carcasses, isLoading } = useCarcasses({
    search,
    status: statusFilter || undefined,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Receiving</h2>
          <p className="text-sm text-gray-500">Manage incoming carcasses and livestock</p>
        </div>
        <Link to="/receiving/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Receive Carcass
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-2xl font-bold text-gray-900">
              {carcasses?.filter(c => new Date(c.received_at).toDateString() === new Date().toDateString()).length || 0}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {carcasses?.filter(c => c.status === 'pending').length || 0}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Processing</p>
            <p className="text-2xl font-bold text-orange-600">
              {carcasses?.filter(c => c.status === 'processing').length || 0}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {carcasses?.filter(c => c.status === 'completed').length || 0}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by carcass ID, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="quartered">Quartered</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Carcasses List */}
      <Card>
        <CardHeader>
          <CardTitle>Carcasses ({carcasses?.length || 0})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading carcasses...</div>
          ) : carcasses?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No carcasses found</p>
              <Link to="/receiving/new">
                <Button variant="outline">Receive your first carcass</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yield</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {carcasses?.map((carcass) => (
                    <tr key={carcass.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          to={`/receiving/${carcass.id}`}
                          className="text-sm font-medium text-meat-600 hover:text-meat-700"
                        >
                          {carcass.carcass_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {carcass.supplier?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {carcass.weight_kg.toFixed(1)} kg
                      </td>
                      <td className="px-6 py-4">
                        {carcass.grade ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            {carcass.grade.code}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        ${carcass.cost_total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {carcass.yield_percentage > 0 ? (
                          <span className={`text-sm font-medium ${
                            carcass.yield_percentage >= 65 ? 'text-green-600' :
                            carcass.yield_percentage >= 55 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {carcass.yield_percentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                          statusColors[carcass.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {carcass.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(carcass.received_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/receiving/${carcass.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
