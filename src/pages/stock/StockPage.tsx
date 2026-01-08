import { useState } from 'react';
import { Search, ArrowUpDown, AlertTriangle, Package, X, ArrowRight, History } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import { useAggregatedStock, useStock, useStockMovements, useTransferStock } from '../../hooks/useStock';
import { useZones } from '../../hooks/useZones';
import { useCategories } from '../../hooks/useProducts';

export function StockPage() {
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  const { data: aggregatedStock, isLoading } = useAggregatedStock({ search, category_id: selectedCategory });
  const { data: zones } = useZones();
  const { data: categories } = useCategories();
  const { data: movements } = useStockMovements({ limit: 20 });

  // Calculate totals
  const totals = aggregatedStock?.reduce((acc, item) => ({
    items: acc.items + 1,
    weight: acc.weight + item.total_quantity_kg,
    value: acc.value + item.total_cost,
    lowStock: acc.lowStock + (item.product.minimum_stock_kg > 0 && item.total_quantity_kg < item.product.minimum_stock_kg ? 1 : 0),
  }), { items: 0, weight: 0, value: 0, lowStock: 0 }) || { items: 0, weight: 0, value: 0, lowStock: 0 };

  const getStockStatus = (item: any) => {
    if (item.product.minimum_stock_kg > 0 && item.total_quantity_kg < item.product.minimum_stock_kg) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (item.product.reorder_point_kg > 0 && item.total_quantity_kg < item.product.reorder_point_kg) {
      return { label: 'Reorder', color: 'bg-orange-100 text-orange-800' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Stock Management</h2>
          <p className="text-sm text-gray-500">View and manage inventory levels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowMovementsModal(true)} leftIcon={<History className="w-4 h-4" />}>
            Movements
          </Button>
          <Button onClick={() => setShowTransferModal(true)} leftIcon={<ArrowUpDown className="w-4 h-4" />}>
            Transfer Stock
          </Button>
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{totals.items}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Total Weight</p>
            <p className="text-2xl font-bold text-gray-900">{totals.weight.toFixed(1)} kg</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Stock Value</p>
            <p className="text-2xl font-bold text-gray-900">${totals.value.toFixed(2)}</p>
          </CardBody>
        </Card>
        <Card className={totals.lowStock > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardBody className="p-4">
            <div className="flex items-center space-x-2">
              {totals.lowStock > 0 && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
              <p className="text-sm text-gray-500">Low Stock Items</p>
            </div>
            <p className={`text-2xl font-bold ${totals.lowStock > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>
              {totals.lowStock}
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
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="">All Zones</option>
              {zones?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              <option value="">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock ({aggregatedStock?.length || 0})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading stock...</div>
          ) : !aggregatedStock || aggregatedStock.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No stock items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {aggregatedStock.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.product_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.product.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.product.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.product.category?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.zones.map((zone, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                {zone.zone_name}: {zone.quantity_kg.toFixed(1)}kg
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.total_quantity_kg.toFixed(1)} kg
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.total_quantity_units}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          ${item.avg_cost_per_kg.toFixed(2)}/kg
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          ${item.total_cost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                            {status.label}
                          </span>
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

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          zones={zones || []}
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {/* Movements Modal */}
      {showMovementsModal && (
        <MovementsModal
          movements={movements || []}
          onClose={() => setShowMovementsModal(false)}
        />
      )}
    </div>
  );
}

function TransferModal({ zones, onClose }: { zones: any[]; onClose: () => void }) {
  const { data: stock } = useStock();
  const transferStock = useTransferStock();

  const [selectedStockId, setSelectedStockId] = useState('');
  const [toZoneId, setToZoneId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const selectedStockItem = stock?.find(s => s.id === selectedStockId);

  const handleTransfer = async () => {
    if (!selectedStockId || !toZoneId || !quantity) return;

    await transferStock.mutateAsync({
      stock_id: selectedStockId,
      from_zone_id: selectedStockItem?.zone_id || '',
      to_zone_id: toZoneId,
      quantity_kg: parseFloat(quantity),
      quantity_units: 1,
      reason,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transfer Stock</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Stock Item</label>
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select item...</option>
              {stock?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product?.name} - {item.zone?.name} ({item.quantity_kg.toFixed(1)} kg)
                </option>
              ))}
            </select>
          </div>

          {selectedStockItem && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span>{selectedStockItem.zone?.name}</span>
                <ArrowRight className="w-4 h-4" />
                <span className="text-gray-400">Select destination</span>
              </div>
              <p className="mt-1 font-medium">
                Available: {selectedStockItem.quantity_kg.toFixed(2)} kg
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Zone</label>
            <select
              value={toZoneId}
              onChange={(e) => setToZoneId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select zone...</option>
              {zones?.filter(z => z.id !== selectedStockItem?.zone_id).map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Quantity (kg)"
              type="number"
              step="0.01"
              max={selectedStockItem?.quantity_kg}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              rows={2}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for transfer..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleTransfer}
              disabled={!selectedStockId || !toZoneId || !quantity || transferStock.isPending}
              isLoading={transferStock.isPending}
            >
              Transfer
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function MovementsModal({ movements, onClose }: { movements: any[]; onClose: () => void }) {
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'transfer': return <ArrowUpDown className="w-4 h-4 text-blue-600" />;
      case 'adjustment': return <Package className="w-4 h-4 text-orange-600" />;
      case 'sale': return <Package className="w-4 h-4 text-green-600" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle>Recent Movements</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-0 overflow-y-auto">
          {movements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No movements recorded</div>
          ) : (
            <div className="divide-y">
              {movements.map((movement) => (
                <div key={movement.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getMovementIcon(movement.movement_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {movement.movement_type}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(movement.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {movement.stock?.product?.name || 'Unknown Product'} - {movement.quantity_kg.toFixed(2)} kg
                      </p>
                      {movement.from_zone && movement.to_zone && (
                        <p className="text-xs text-gray-500 mt-1">
                          {movement.from_zone.name} → {movement.to_zone.name}
                        </p>
                      )}
                      {movement.reason && (
                        <p className="text-xs text-gray-400 mt-1">{movement.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
