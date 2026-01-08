import { useState } from 'react';
import { TrendingUp, DollarSign, Package, Scissors, X, BarChart3 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import { useSalesSummary, useStockSummary, useCarcassYieldReport, useTopProducts } from '../../hooks/useReports';

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateRange, setDateRange] = useState({
    from: thirtyDaysAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  });

  const { data: stockSummary } = useStockSummary();
  const { data: salesSummary } = useSalesSummary(dateRange);

  const reports = [
    {
      id: 'sales',
      title: 'Sales Report',
      description: 'Sales analysis with trends, payment methods, and top products',
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      id: 'stock',
      title: 'Stock Valuation',
      description: 'Current inventory value by zone and category',
      icon: Package,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      id: 'yield',
      title: 'Yield Analysis',
      description: 'Cutting yields, margins, and efficiency by carcass',
      icon: Scissors,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
    },
    {
      id: 'topProducts',
      title: 'Top Products',
      description: 'Best selling products by revenue and weight',
      icon: TrendingUp,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Analyze business performance and trends</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(d => ({ ...d, from: e.target.value }))}
              className="w-40"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(d => ({ ...d, to: e.target.value }))}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Period Sales</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(salesSummary?.total_sales || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {salesSummary?.transaction_count || 0} transactions
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Avg. Margin</p>
            <p className="text-2xl font-bold text-gray-900">
              {(salesSummary?.margin_percent || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ${(salesSummary?.total_margin || 0).toFixed(2)} total
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Stock Value</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(stockSummary?.total_value || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(stockSummary?.total_weight_kg || 0).toFixed(1)} kg
            </p>
          </CardBody>
        </Card>
        <Card className={stockSummary?.low_stock_count ? "border-yellow-200" : ""}>
          <CardBody className="p-4">
            <p className="text-sm text-gray-500">Low Stock Items</p>
            <p className={`text-2xl font-bold ${stockSummary?.low_stock_count ? 'text-yellow-600' : 'text-gray-900'}`}>
              {stockSummary?.low_stock_count || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stockSummary?.total_products || 0} total products
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setActiveReport(report.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${report.iconBg}`}>
                      <Icon className={`w-6 h-6 ${report.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Report Modals */}
      {activeReport === 'sales' && (
        <SalesReportModal
          dateRange={dateRange}
          onClose={() => setActiveReport(null)}
        />
      )}

      {activeReport === 'stock' && (
        <StockReportModal
          onClose={() => setActiveReport(null)}
        />
      )}

      {activeReport === 'yield' && (
        <YieldReportModal
          dateRange={dateRange}
          onClose={() => setActiveReport(null)}
        />
      )}

      {activeReport === 'topProducts' && (
        <TopProductsModal
          dateRange={dateRange}
          onClose={() => setActiveReport(null)}
        />
      )}
    </div>
  );
}

function SalesReportModal({ dateRange, onClose }: { dateRange: { from: string; to: string }; onClose: () => void }) {
  const { data: salesSummary, isLoading } = useSalesSummary(dateRange);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales Report
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading report...</div>
          ) : !salesSummary ? (
            <div className="text-center text-gray-500 py-8">No data available</div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">${salesSummary.total_sales.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-xl font-bold text-gray-900">{salesSummary.transaction_count}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Weight Sold</p>
                  <p className="text-xl font-bold text-gray-900">{salesSummary.total_weight_kg.toFixed(1)} kg</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg. Sale</p>
                  <p className="text-xl font-bold text-gray-900">${salesSummary.avg_sale_value.toFixed(2)}</p>
                </div>
              </div>

              {/* Margin */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-700">Gross Margin</p>
                    <p className="text-2xl font-bold text-green-700">${salesSummary.total_margin.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700">Margin %</p>
                    <p className="text-2xl font-bold text-green-700">{salesSummary.margin_percent.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* By Payment Method */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">By Payment Method</h4>
                <div className="space-y-2">
                  {salesSummary.by_payment_method.map((pm) => (
                    <div key={pm.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="capitalize">{pm.method.replace(/_/g, ' ')}</span>
                      <div className="text-right">
                        <p className="font-medium">${pm.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{pm.count} payments</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Day */}
              {salesSummary.by_day.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Daily Sales</h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b">
                          <th className="text-left py-2">Date</th>
                          <th className="text-right py-2">Transactions</th>
                          <th className="text-right py-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesSummary.by_day.map((day) => (
                          <tr key={day.date} className="border-b">
                            <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                            <td className="text-right py-2">{day.count}</td>
                            <td className="text-right py-2 font-medium">${day.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StockReportModal({ onClose }: { onClose: () => void }) {
  const { data: stockSummary, isLoading } = useStockSummary();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Stock Valuation Report
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading report...</div>
          ) : !stockSummary ? (
            <div className="text-center text-gray-500 py-8">No data available</div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-xl font-bold text-gray-900">{stockSummary.total_products}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Weight</p>
                  <p className="text-xl font-bold text-gray-900">{stockSummary.total_weight_kg.toFixed(1)} kg</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-xl font-bold text-gray-900">${stockSummary.total_value.toFixed(2)}</p>
                </div>
              </div>

              {/* By Zone */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">By Zone</h4>
                <div className="space-y-2">
                  {stockSummary.by_zone.map((zone) => (
                    <div key={zone.zone_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{zone.zone_name}</span>
                      <div className="text-right">
                        <p className="font-medium">${zone.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{zone.weight_kg.toFixed(1)} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Category */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">By Category</h4>
                <div className="space-y-2">
                  {stockSummary.by_category.map((cat) => (
                    <div key={cat.category_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{cat.category_name}</span>
                      <div className="text-right">
                        <p className="font-medium">${cat.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{cat.weight_kg.toFixed(1)} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock */}
              {stockSummary.low_stock_items.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-3">Low Stock Items</h4>
                  <div className="space-y-2">
                    {stockSummary.low_stock_items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <span>{item.product_name}</span>
                        <div className="text-right">
                          <p className="font-medium text-yellow-700">{item.current_kg.toFixed(1)} kg</p>
                          <p className="text-xs text-yellow-600">Min: {item.minimum_kg.toFixed(1)} kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function YieldReportModal({ dateRange, onClose }: { dateRange: { from: string; to: string }; onClose: () => void }) {
  const { data: yieldData, isLoading } = useCarcassYieldReport(dateRange);

  const totals = yieldData?.reduce((acc, c) => ({
    coldWeight: acc.coldWeight + c.cold_weight_kg,
    output: acc.output + c.output_kg,
    waste: acc.waste + c.waste_kg,
    revenue: acc.revenue + c.revenue,
    margin: acc.margin + c.margin,
  }), { coldWeight: 0, output: 0, waste: 0, revenue: 0, margin: 0 }) || { coldWeight: 0, output: 0, waste: 0, revenue: 0, margin: 0 };

  const avgYield = totals.coldWeight > 0 ? ((totals.output + totals.waste) / totals.coldWeight) * 100 : 0;
  const avgMarginPercent = totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Carcass Yield Report
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading report...</div>
          ) : !yieldData || yieldData.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No carcasses in this period</div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Carcasses</p>
                  <p className="text-xl font-bold text-gray-900">{yieldData.length}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg. Yield</p>
                  <p className="text-xl font-bold text-gray-900">{avgYield.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">${totals.revenue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Avg. Margin</p>
                  <p className="text-xl font-bold text-gray-900">{avgMarginPercent.toFixed(1)}%</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-2 text-left">Carcass</th>
                      <th className="px-3 py-2 text-left">Supplier</th>
                      <th className="px-3 py-2 text-right">Cold Wt</th>
                      <th className="px-3 py-2 text-right">Output</th>
                      <th className="px-3 py-2 text-right">Waste</th>
                      <th className="px-3 py-2 text-right">Yield %</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yieldData.map((c) => (
                      <tr key={c.carcass_id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{c.carcass_number}</td>
                        <td className="px-3 py-2 text-gray-500">{c.supplier_name}</td>
                        <td className="px-3 py-2 text-right">{c.cold_weight_kg.toFixed(1)} kg</td>
                        <td className="px-3 py-2 text-right text-green-600">{c.output_kg.toFixed(1)} kg</td>
                        <td className="px-3 py-2 text-right text-red-600">{c.waste_kg.toFixed(1)} kg</td>
                        <td className="px-3 py-2 text-right">{c.yield_percent.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">${c.revenue.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${c.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {c.margin_percent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function TopProductsModal({ dateRange, onClose }: { dateRange: { from: string; to: string }; onClose: () => void }) {
  const { data: topProducts, isLoading } = useTopProducts(dateRange, 15);

  const totalRevenue = topProducts?.reduce((sum, p) => sum + p.revenue, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top Products
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Loading report...</div>
          ) : !topProducts || topProducts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No sales data in this period</div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, idx) => {
                const pct = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={product.id} className="flex items-center gap-4">
                    <span className="w-6 text-gray-400 font-medium text-right">{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-medium text-gray-900">{product.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{product.sku}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">${product.revenue.toFixed(2)}</span>
                          <span className="text-xs text-gray-500 ml-2">({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-meat-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-16 text-right">
                          {product.weight.toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
