import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Scissors, Scale, DollarSign, TrendingUp } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { useCarcass } from '../../hooks/useCarcasses';

export function CarcassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: carcass, isLoading } = useCarcass(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-meat-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading carcass details...</p>
        </div>
      </div>
    );
  }

  if (!carcass) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Carcass not found</p>
        <Button onClick={() => navigate('/receiving')}>Back to Receiving</Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    quartered: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-orange-100 text-orange-800 border-orange-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/receiving')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{carcass.carcass_number}</h2>
              <span className={`px-3 py-1 text-sm font-medium rounded-full border capitalize ${
                statusColors[carcass.status] || 'bg-gray-100 text-gray-800'
              }`}>
                {carcass.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Received {new Date(carcass.received_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {carcass.status === 'pending' && (
            <Link to={`/cutting/new?carcass=${carcass.id}`}>
              <Button leftIcon={<Scissors className="w-4 h-4" />}>
                Start Cutting
              </Button>
            </Link>
          )}
          <Button variant="outline" leftIcon={<Edit className="w-4 h-4" />}>
            Edit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="text-xl font-bold text-gray-900">{carcass.weight_kg.toFixed(1)} kg</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">${carcass.cost_total.toFixed(2)}</p>
                <p className="text-xs text-gray-400">${carcass.cost_per_kg.toFixed(2)}/kg</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Yield</p>
                <p className={`text-xl font-bold ${
                  carcass.yield_percentage >= 65 ? 'text-green-600' :
                  carcass.yield_percentage >= 55 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {carcass.yield_percentage > 0 ? `${carcass.yield_percentage.toFixed(1)}%` : '-'}
                </p>
                <p className="text-xs text-gray-400">{carcass.total_output_kg.toFixed(1)} kg output</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Margin</p>
                <p className={`text-xl font-bold ${
                  carcass.realized_margin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${carcass.realized_margin.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{carcass.margin_percentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Carcass Details</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Carcass Number</dt>
                  <dd className="mt-1 font-medium text-gray-900">{carcass.carcass_number}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Source Type</dt>
                  <dd className="mt-1 font-medium text-gray-900 capitalize">{carcass.source_type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Supplier</dt>
                  <dd className="mt-1 font-medium text-gray-900">{carcass.supplier?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Grade</dt>
                  <dd className="mt-1">
                    {carcass.grade ? (
                      <span className="px-2 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">
                        {carcass.grade.code} - {carcass.grade.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not graded</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Destination Zone</dt>
                  <dd className="mt-1 font-medium text-gray-900">{carcass.destination_zone?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Quarters</dt>
                  <dd className="mt-1 font-medium text-gray-900">{carcass.quarters_count}</dd>
                </div>
              </dl>
              {carcass.notes && (
                <div className="mt-6 pt-4 border-t">
                  <dt className="text-sm text-gray-500">Notes</dt>
                  <dd className="mt-1 text-gray-900">{carcass.notes}</dd>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Cutting Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cutting Sessions</CardTitle>
              {carcass.status !== 'completed' && (
                <Link to={`/cutting/new?carcass=${carcass.id}`}>
                  <Button size="sm" leftIcon={<Scissors className="w-4 h-4" />}>
                    New Session
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardBody className="p-6">
              <p className="text-gray-500 text-center py-8">No cutting sessions yet</p>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardBody className="p-6 space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Cost</span>
                <span className="font-medium">${carcass.cost_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Revenue</span>
                <span className="font-medium">${carcass.total_revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Margin</span>
                <span className={`font-bold ${
                  carcass.realized_margin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${carcass.realized_margin.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-gray-50 -mx-6 px-6">
                <span className="text-gray-600">Margin %</span>
                <span className={`font-bold text-lg ${
                  carcass.margin_percentage >= 20 ? 'text-green-600' :
                  carcass.margin_percentage >= 10 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {carcass.margin_percentage.toFixed(1)}%
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Received</p>
                    <p className="text-xs text-gray-500">
                      {new Date(carcass.received_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {carcass.status !== 'pending' && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        carcass.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{carcass.status}</p>
                      <p className="text-xs text-gray-500">Current status</p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
