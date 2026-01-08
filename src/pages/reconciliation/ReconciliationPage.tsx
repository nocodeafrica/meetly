import { useState } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, Play, X, ChevronRight, DollarSign, Package } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import {
  useDailyClosings,
  useTodayClosing,
  useDailyClosing,
  useStockCountItems,
  useStartDailyClosing,
  useUpdateStockCountItem,
  useUpdateCashCount,
  useCompleteStockCount,
  useCompleteDailyClosing,
  useVarianceReasons,
} from '../../hooks/useReconciliation';

export function ReconciliationPage() {
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showCashCountModal, setShowCashCountModal] = useState(false);
  const [selectedStockCount, setSelectedStockCount] = useState<any>(null);
  const [selectedCashCount, setSelectedCashCount] = useState<any>(null);

  const { data: todayClosing, isLoading: todayLoading } = useTodayClosing();
  const { data: closingDetails } = useDailyClosing(todayClosing?.id);
  const { data: closings } = useDailyClosings({ limit: 10 });
  const startClosing = useStartDailyClosing();
  const completeClosing = useCompleteDailyClosing();

  const handleStartClosing = async () => {
    await startClosing.mutateAsync(undefined);
  };

  const handleCompleteClosing = async () => {
    if (!todayClosing?.id) return;
    if (confirm('Are you sure you want to complete today\'s closing? This cannot be undone.')) {
      await completeClosing.mutateAsync({ closing_id: todayClosing.id });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100';
      case 'in_progress':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  const stockCountsCompleted = closingDetails?.stock_counts?.every(sc => sc.status === 'completed') ?? false;
  const cashCountsCompleted = closingDetails?.cash_counts?.every(cc => cc.counted_at != null) ?? false;
  const canComplete = stockCountsCompleted && cashCountsCompleted && todayClosing?.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Daily Reconciliation</h2>
          <p className="text-sm text-gray-500">End-of-day stock and cash reconciliation</p>
        </div>
        <div className="flex gap-2">
          {!todayClosing && !todayLoading && (
            <Button
              onClick={handleStartClosing}
              isLoading={startClosing.isPending}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Start Daily Closing
            </Button>
          )}
          {todayClosing && todayClosing.status === 'in_progress' && canComplete && (
            <Button
              onClick={handleCompleteClosing}
              isLoading={completeClosing.isPending}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Complete Closing
            </Button>
          )}
        </div>
      </div>

      {/* Today's Status */}
      {todayClosing ? (
        <>
          {/* Today's Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">${todayClosing.total_sales.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{todayClosing.transaction_count} transactions</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-gray-500">Weight Sold</p>
                <p className="text-2xl font-bold text-gray-900">{todayClosing.total_weight_sold_kg.toFixed(1)} kg</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-gray-500">Cash Variance (USD)</p>
                <p className={`text-2xl font-bold ${todayClosing.cash_variance_usd === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${todayClosing.cash_variance_usd.toFixed(2)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-gray-500">Stock Variance</p>
                <p className={`text-2xl font-bold ${todayClosing.stock_variance_kg === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {todayClosing.stock_variance_kg.toFixed(2)} kg
                </p>
                <p className="text-xs text-gray-400">{todayClosing.stock_variance_percent.toFixed(1)}%</p>
              </CardBody>
            </Card>
          </div>

          {/* Stock Counts by Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Stock Counts
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {closingDetails?.stock_counts?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No zones to count</div>
              ) : (
                <div className="divide-y">
                  {closingDetails?.stock_counts?.map((stockCount: any) => (
                    <div
                      key={stockCount.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedStockCount(stockCount);
                        setShowStockCountModal(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${getStatusBg(stockCount.status)}`}>
                          {getStatusIcon(stockCount.status)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{stockCount.zone?.name}</p>
                          <p className="text-sm text-gray-500">
                            {stockCount.items_counted} / {stockCount.total_items} items counted
                            {stockCount.items_with_variance > 0 && (
                              <span className="text-yellow-600 ml-2">
                                ({stockCount.items_with_variance} with variance)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Variance</p>
                          <p className={`font-medium ${stockCount.variance_kg === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {stockCount.variance_kg.toFixed(2)} kg
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Cash Counts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cash Counts
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {closingDetails?.cash_counts?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No cash to count</div>
              ) : (
                <div className="divide-y">
                  {closingDetails?.cash_counts?.map((cashCount: any) => (
                    <div
                      key={cashCount.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedCashCount(cashCount);
                        setShowCashCountModal(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${cashCount.counted_at ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {cashCount.counted_at ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cashCount.currency_code}</p>
                          <p className="text-sm text-gray-500">
                            Expected: ${cashCount.expected_total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {cashCount.counted_at ? 'Counted' : 'Pending'}
                          </p>
                          {cashCount.counted_at && (
                            <p className={`font-medium ${cashCount.variance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Variance: ${cashCount.variance.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Closing Started</h3>
            <p className="text-gray-500 mb-6">Start today's closing to begin stock and cash reconciliation</p>
            <Button
              onClick={handleStartClosing}
              isLoading={startClosing.isPending}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Start Daily Closing
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Recent Closings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Daily Closings</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {!closings || closings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No previous closings</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash Variance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Variance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {closings.map((closing) => (
                    <tr key={closing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {new Date(closing.closing_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">${closing.total_sales.toFixed(2)}</td>
                      <td className={`px-6 py-4 text-sm ${closing.cash_variance_usd === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${closing.cash_variance_usd.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-sm ${closing.stock_variance_kg === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {closing.stock_variance_kg.toFixed(2)} kg ({closing.stock_variance_percent.toFixed(1)}%)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {closing.started_by_user?.full_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          closing.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : closing.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {closing.status === 'completed' ? 'Closed' : closing.status === 'in_progress' ? 'In Progress' : closing.status}
                        </span>
                        {closing.requires_approval && !closing.approved_at && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                            Needs Approval
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Stock Count Modal */}
      {showStockCountModal && selectedStockCount && (
        <StockCountModal
          stockCount={selectedStockCount}
          onClose={() => {
            setShowStockCountModal(false);
            setSelectedStockCount(null);
          }}
        />
      )}

      {/* Cash Count Modal */}
      {showCashCountModal && selectedCashCount && (
        <CashCountModal
          cashCount={selectedCashCount}
          onClose={() => {
            setShowCashCountModal(false);
            setSelectedCashCount(null);
          }}
        />
      )}
    </div>
  );
}

function StockCountModal({ stockCount, onClose }: { stockCount: any; onClose: () => void }) {
  const { data: items, isLoading } = useStockCountItems(stockCount.id);
  const { data: varianceReasons } = useVarianceReasons();
  const updateItem = useUpdateStockCountItem();
  const completeCount = useCompleteStockCount();

  const [editingItem, setEditingItem] = useState<any>(null);
  const [actualWeight, setActualWeight] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');

  const handleSaveItem = async () => {
    if (!editingItem) return;

    await updateItem.mutateAsync({
      item_id: editingItem.id,
      actual_kg: parseFloat(actualWeight),
      variance_reason: varianceReason || undefined,
      variance_notes: varianceNotes || undefined,
    });

    setEditingItem(null);
    setActualWeight('');
    setVarianceReason('');
    setVarianceNotes('');
  };

  const handleCompleteCount = async () => {
    if (confirm('Complete this zone count? All uncounted items will be marked as 0.')) {
      await completeCount.mutateAsync(stockCount.id);
      onClose();
    }
  };

  const allCounted = items?.every(item => item.is_counted) ?? false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle>Stock Count: {stockCount.zone?.name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {stockCount.items_counted} / {stockCount.total_items} items counted
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allCounted && stockCount.status !== 'completed' && (
              <Button
                size="sm"
                onClick={handleCompleteCount}
                isLoading={completeCount.isPending}
              >
                Complete Count
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading items...</div>
          ) : !items || items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No items to count in this zone</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className={item.is_counted ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">{item.product?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.expected_kg.toFixed(2)} kg
                    </td>
                    <td className="px-4 py-3">
                      {editingItem?.id === item.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={actualWeight}
                          onChange={(e) => setActualWeight(e.target.value)}
                          className="w-24"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          {item.actual_kg !== null ? `${item.actual_kg.toFixed(2)} kg` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.variance_kg !== null && (
                        <span className={`text-sm font-medium ${
                          item.variance_kg === 0 ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {item.variance_kg > 0 ? '+' : ''}{item.variance_kg.toFixed(2)} kg
                          <span className="text-xs text-gray-500 ml-1">
                            ({item.variance_percent?.toFixed(1)}%)
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_counted ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Counted
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingItem?.id === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingItem(null);
                              setActualWeight('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveItem}
                            isLoading={updateItem.isPending}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(item);
                            setActualWeight(item.actual_kg?.toString() || item.expected_kg.toString());
                          }}
                        >
                          Count
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>

        {/* Variance reason input when editing */}
        {editingItem && parseFloat(actualWeight) !== editingItem.expected_kg && (
          <div className="border-t p-4 bg-yellow-50">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              Variance detected: {(parseFloat(actualWeight) - editingItem.expected_kg).toFixed(2)} kg
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select reason...</option>
                  {varianceReasons?.filter((r: any) => r.category === 'stock').map((reason: any) => (
                    <option key={reason.id} value={reason.code}>{reason.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <Input
                  value={varianceNotes}
                  onChange={(e) => setVarianceNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function CashCountModal({ cashCount, onClose }: { cashCount: any; onClose: () => void }) {
  const [countedTotal, setCountedTotal] = useState(cashCount.counted_total?.toString() || '');
  const [notes, setNotes] = useState(cashCount.notes || '');
  const updateCash = useUpdateCashCount();

  const expectedTotal = cashCount.expected_total || 0;
  const counted = parseFloat(countedTotal) || 0;
  const variance = counted - expectedTotal;

  const handleSave = async () => {
    await updateCash.mutateAsync({
      cash_count_id: cashCount.id,
      counted_total: counted,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cash Count: {cashCount.currency_code}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Opening Float</span>
              <span className="font-medium">${cashCount.opening_float.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cash Sales</span>
              <span className="font-medium">${cashCount.cash_sales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-500 font-medium">Expected Total</span>
              <span className="font-bold text-gray-900">${expectedTotal.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Counted Total ({cashCount.currency_code})
            </label>
            <Input
              type="number"
              step="0.01"
              value={countedTotal}
              onChange={(e) => setCountedTotal(e.target.value)}
              leftIcon={<DollarSign className="w-4 h-4" />}
              autoFocus
            />
          </div>

          {counted > 0 && (
            <div className={`p-4 rounded-lg ${variance === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex justify-between">
                <span className={variance === 0 ? 'text-green-700' : 'text-red-700'}>Variance</span>
                <span className={`font-bold ${variance === 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {variance > 0 ? '+' : ''}${variance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Any notes about this count..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              isLoading={updateCash.isPending}
              disabled={!countedTotal}
            >
              Save Count
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
