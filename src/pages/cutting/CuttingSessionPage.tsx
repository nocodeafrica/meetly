import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Scale,
  AlertTriangle,
  CheckCircle,
  X,
  Search
} from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import {
  useCuttingSession,
  useAddCut,
  useRemoveCut,
  useUpdateWaste,
  useCompleteCuttingSession
} from '../../hooks/useCuttingSessions';
import { useProducts } from '../../hooks/useProducts';
import { useAllGrades } from '../../hooks/useGrades';

export function CuttingSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useCuttingSession(id!);
  const { data: products } = useProducts();
  const { data: grades } = useAllGrades();
  const addCut = useAddCut();
  const removeCut = useRemoveCut();
  const updateWaste = useUpdateWaste();
  const completeSession = useCompleteCuttingSession();

  const [showAddCut, setShowAddCut] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [cutWeight, setCutWeight] = useState('');
  const [cutQuantity, setCutQuantity] = useState('1');
  const [cutGrade, setCutGrade] = useState('');
  const [cutNotes, setCutNotes] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-meat-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Session not found</p>
        <Button onClick={() => navigate('/cutting')}>Back to Cutting</Button>
      </div>
    );
  }

  const yieldPercentage = session.input_weight_kg > 0
    ? (session.total_output_kg / session.input_weight_kg) * 100
    : 0;

  const remainingWeight = session.input_weight_kg - session.total_output_kg - session.waste_kg;

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleAddCut = async () => {
    if (!selectedProduct || !cutWeight) return;

    await addCut.mutateAsync({
      session_id: session.id,
      product_id: selectedProduct,
      weight_kg: parseFloat(cutWeight),
      quantity: parseInt(cutQuantity) || 1,
      grade_id: cutGrade || null,
      notes: cutNotes || null,
    });

    // Reset form
    setSelectedProduct(null);
    setCutWeight('');
    setCutQuantity('1');
    setCutGrade('');
    setCutNotes('');
    setShowAddCut(false);
    setProductSearch('');
  };

  const handleRemoveCut = async (cutId: string) => {
    if (confirm('Remove this cut?')) {
      await removeCut.mutateAsync({ cutId, sessionId: session.id });
    }
  };

  const handleUpdateWaste = async () => {
    if (!wasteKg) return;
    await updateWaste.mutateAsync({
      session_id: session.id,
      waste_kg: parseFloat(wasteKg),
    });
  };

  const handleCompleteSession = async () => {
    await completeSession.mutateAsync({
      session_id: session.id,
      waste_kg: parseFloat(wasteKg) || session.waste_kg,
    });
    navigate('/cutting');
  };

  const formatDuration = () => {
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const isActive = session.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/cutting')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{session.session_number}</h2>
              <span className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
                session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                session.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {session.status === 'active' && <Clock className="w-3 h-3 animate-pulse" />}
                {session.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                {session.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {session.carcass?.carcass_number} • Started {new Date(session.started_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddCut(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Cut
            </Button>
            <Button onClick={() => setShowCompleteModal(true)} leftIcon={<CheckCircle className="w-4 h-4" />}>
              Complete Session
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              {formatDuration()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Input Weight</p>
            <p className="text-xl font-bold text-gray-900">{session.input_weight_kg.toFixed(1)} kg</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Output</p>
            <p className="text-xl font-bold text-green-600">{session.total_output_kg.toFixed(1)} kg</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Yield</p>
            <p className={`text-xl font-bold ${
              yieldPercentage >= 65 ? 'text-green-600' :
              yieldPercentage >= 55 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {yieldPercentage.toFixed(1)}%
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Processing Progress</span>
            <span className="text-sm text-gray-500">
              {remainingWeight.toFixed(1)} kg remaining
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${(session.total_output_kg / session.input_weight_kg) * 100}%` }}
              />
              <div
                className="bg-red-400 transition-all duration-300"
                style={{ width: `${(session.waste_kg / session.input_weight_kg) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Output: {session.total_output_kg.toFixed(1)} kg
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              Waste: {session.waste_kg.toFixed(1)} kg
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-200 rounded-full"></span>
              Remaining: {remainingWeight.toFixed(1)} kg
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cuts List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cuts ({session.cuts?.length || 0})</CardTitle>
              {isActive && (
                <Button size="sm" onClick={() => setShowAddCut(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Add Cut
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {!session.cuts || session.cuts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No cuts recorded yet</p>
                  {isActive && (
                    <Button variant="outline" className="mt-4" onClick={() => setShowAddCut(true)}>
                      Add First Cut
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        {isActive && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {session.cuts.map((cut) => (
                        <tr key={cut.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{cut.product?.name}</p>
                            <p className="text-xs text-gray-500">{cut.product?.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {cut.weight_kg.toFixed(2)} kg
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {cut.quantity}
                          </td>
                          <td className="px-4 py-3">
                            {cut.grade ? (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                {cut.grade.code}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {cut.notes || '-'}
                          </td>
                          {isActive && (
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCut(cut.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Carcass Info */}
          <Card>
            <CardHeader>
              <CardTitle>Carcass Info</CardTitle>
            </CardHeader>
            <CardBody className="p-4">
              {session.carcass && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Number</span>
                    <Link to={`/receiving/${session.carcass.id}`} className="font-medium text-meat-600 hover:underline">
                      {session.carcass.carcass_number}
                    </Link>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Weight</span>
                    <span className="font-medium">{session.carcass.weight_kg.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Grade</span>
                    <span className="font-medium">{session.carcass.grade?.code || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Supplier</span>
                    <span className="font-medium">{session.carcass.supplier?.name || '-'}</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Waste Entry */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Record Waste</CardTitle>
              </CardHeader>
              <CardBody className="p-4">
                <div className="space-y-3">
                  <Input
                    label="Waste Weight (kg)"
                    type="number"
                    step="0.01"
                    value={wasteKg}
                    onChange={(e) => setWasteKg(e.target.value)}
                    placeholder={session.waste_kg.toString()}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUpdateWaste}
                    disabled={!wasteKg}
                  >
                    Update Waste
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Add Cut Modal */}
      {showAddCut && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add Cut</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddCut(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              {/* Product Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
                {productSearch && filteredProducts && filteredProducts.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedProduct === product.id ? 'bg-meat-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedProduct(product.id);
                          setProductSearch(product.name);
                        }}
                      >
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedProduct && (
                  <p className="mt-1 text-xs text-green-600">Product selected</p>
                )}
              </div>

              {/* Weight and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.01"
                  value={cutWeight}
                  onChange={(e) => setCutWeight(e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  label="Quantity"
                  type="number"
                  value={cutQuantity}
                  onChange={(e) => setCutQuantity(e.target.value)}
                  placeholder="1"
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade (optional)</label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={cutGrade}
                  onChange={(e) => setCutGrade(e.target.value)}
                >
                  <option value="">No grade</option>
                  {grades?.map((grade: any) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.code} - {grade.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={cutNotes}
                  onChange={(e) => setCutNotes(e.target.value)}
                  placeholder="Any notes about this cut..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddCut(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddCut}
                  disabled={!selectedProduct || !cutWeight || addCut.isPending}
                  isLoading={addCut.isPending}
                >
                  Add Cut
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Complete Session Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Complete Session</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCompleteModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              {remainingWeight > 0.5 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Unaccounted Weight</p>
                    <p className="text-xs text-yellow-700">
                      {remainingWeight.toFixed(1)} kg has not been recorded as cuts or waste.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Input Weight</span>
                  <span className="font-medium">{session.input_weight_kg.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Total Output</span>
                  <span className="font-medium text-green-600">{session.total_output_kg.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Waste</span>
                  <span className="font-medium text-red-600">{session.waste_kg.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between py-2 bg-gray-50 -mx-6 px-6">
                  <span className="text-gray-700 font-medium">Final Yield</span>
                  <span className={`font-bold text-lg ${
                    yieldPercentage >= 65 ? 'text-green-600' :
                    yieldPercentage >= 55 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {yieldPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <Input
                label="Final Waste (kg)"
                type="number"
                step="0.01"
                value={wasteKg || session.waste_kg.toString()}
                onChange={(e) => setWasteKg(e.target.value)}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCompleteSession}
                  isLoading={completeSession.isPending}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Complete Session
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
