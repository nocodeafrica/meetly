import { useState } from 'react';
import { Scissors, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { useCuttingSessions } from '../../hooks/useCuttingSessions';

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <Clock className="w-3 h-3" />,
  paused: <AlertCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  cancelled: <AlertCircle className="w-3 h-3" />,
};

export function CuttingPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: sessions, isLoading } = useCuttingSessions({
    status: statusFilter || undefined,
  });

  const activeSessions = sessions?.filter(s => s.status === 'active') || [];
  const todaySessions = sessions?.filter(s => {
    const today = new Date().toDateString();
    return new Date(s.started_at).toDateString() === today;
  }) || [];

  const formatDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cutting</h2>
          <p className="text-sm text-gray-500">Manage cutting sessions and track yields</p>
        </div>
        <Link to="/cutting/new">
          <Button leftIcon={<Scissors className="w-4 h-4" />}>
            Start Cutting Session
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Active Sessions</p>
            <p className="text-2xl font-bold text-blue-600">{activeSessions.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Today's Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{todaySessions.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Today's Output</p>
            <p className="text-2xl font-bold text-green-600">
              {todaySessions.reduce((sum, s) => sum + s.total_output_kg, 0).toFixed(1)} kg
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Avg Yield</p>
            <p className="text-2xl font-bold text-meat-600">
              {todaySessions.length > 0
                ? (todaySessions.reduce((sum, s) => {
                    if (s.input_weight_kg > 0) {
                      return sum + (s.total_output_kg / s.input_weight_kg) * 100;
                    }
                    return sum;
                  }, 0) / todaySessions.filter(s => s.input_weight_kg > 0).length || 0).toFixed(1)
                : 0}%
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Clock className="w-5 h-5" />
              Active Sessions ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((session) => (
                <Link key={session.id} to={`/cutting/${session.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardBody className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{session.session_number}</p>
                          <p className="text-sm text-gray-500">
                            {session.carcass?.carcass_number || 'No carcass'}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          <Clock className="w-3 h-3 animate-pulse" />
                          Active
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-1 font-medium">
                            {formatDuration(session.started_at, session.ended_at)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Output:</span>
                          <span className="ml-1 font-medium">{session.total_output_kg.toFixed(1)} kg</span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Cutting Sessions ({sessions?.length || 0})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading sessions...</div>
          ) : sessions?.length === 0 ? (
            <div className="p-8 text-center">
              <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No cutting sessions yet</p>
              <Link to="/cutting/new">
                <Button variant="outline">Start your first session</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carcass</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Butcher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yield</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions?.map((session) => {
                    const yieldPct = session.input_weight_kg > 0
                      ? (session.total_output_kg / session.input_weight_kg) * 100
                      : 0;
                    return (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link
                            to={`/cutting/${session.id}`}
                            className="text-sm font-medium text-meat-600 hover:text-meat-700"
                          >
                            {session.session_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {session.carcass ? (
                            <Link
                              to={`/receiving/${session.carcass.id}`}
                              className="text-meat-600 hover:underline"
                            >
                              {session.carcass.carcass_number}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {session.butcher?.full_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {session.input_weight_kg.toFixed(1)} kg
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {session.total_output_kg.toFixed(1)} kg
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${
                            yieldPct >= 65 ? 'text-green-600' :
                            yieldPct >= 55 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {yieldPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded capitalize w-fit ${
                            statusColors[session.status] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {statusIcons[session.status]}
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatTime(session.started_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDuration(session.started_at, session.ended_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
