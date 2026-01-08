import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Banknote, Receipt, User, PauseCircle, PlayCircle, X, DollarSign } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import { usePOSProducts, useCreateSale, useProcessPayment, useHeldSales, useHoldSale, useRecallHeldSale, useTodaySales } from '../../hooks/useSales';
import { useCategories } from '../../hooks/useProducts';
import { useZones } from '../../hooks/useZones';

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  weight: number;
  unit_cost: number;
  tax_rate: number;
  sold_by: string;
}

export function POSPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');

  const { data: products, isLoading } = usePOSProducts({ search, category_id: selectedCategory });
  const { data: categories } = useCategories();
  const { data: zones } = useZones();
  const { data: heldSales } = useHeldSales();
  const { data: todaySales } = useTodaySales();
  const createSale = useCreateSale();
  const processPayment = useProcessPayment();
  const holdSale = useHoldSale();
  const recallHeldSale = useRecallHeldSale();

  // Set default zone (first POS zone)
  useEffect(() => {
    if (zones && zones.length > 0 && !selectedZone) {
      const posZone = zones.find(z => z.is_pos_zone) || zones[0];
      setSelectedZone(posZone.id);
    }
  }, [zones, selectedZone]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.weight, 0);
  const tax = cart.reduce((sum, item) => sum + (item.price * item.weight * item.tax_rate / 100), 0);
  const total = subtotal + tax;

  const addToCart = (product: any) => {
    if (product.sold_by === 'weight' || product.requires_weighing) {
      // Show weight input modal
      setPendingProduct(product);
      setShowWeightModal(true);
    } else {
      // Add as single unit
      addProductWithWeight(product, product.default_weight_kg || 1);
    }
  };

  const addProductWithWeight = (product: any, weight: number) => {
    const existingIndex = cart.findIndex(item => item.product_id === product.id);

    if (existingIndex >= 0) {
      // Add weight to existing item
      const newCart = [...cart];
      newCart[existingIndex].weight += weight;
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price || 10,
        quantity: 1,
        weight: weight,
        unit_cost: product.avg_cost || 0,
        tax_rate: product.tax_rate_percent || 15,
        sold_by: product.sold_by,
      }]);
    }
  };

  const updateWeight = (id: string, newWeight: number) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, weight: Math.max(0.01, newWeight) } : item
    ));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
  };

  const handleHoldSale = async () => {
    if (cart.length === 0 || !selectedZone) return;

    await holdSale.mutateAsync({
      zone_id: selectedZone,
      items: cart,
      subtotal: subtotal,
      total_weight_kg: cart.reduce((sum, item) => sum + item.weight, 0),
      customer_name: customerName || undefined,
    });

    clearCart();
  };

  const handleRecallSale = async (heldSaleId: string) => {
    const recalled = await recallHeldSale.mutateAsync(heldSaleId) as any;
    if (recalled?.items) {
      setCart(recalled.items as CartItem[]);
      setCustomerName(recalled.customer_name || '');
    }
    setShowHeldSalesModal(false);
  };

  const handleCompleteSale = async (paymentMethod: string, tendered?: number) => {
    if (cart.length === 0 || !selectedZone) return;

    try {
      // Create sale
      const sale = await createSale.mutateAsync({
        zone_id: selectedZone,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity_kg: item.weight,
          unit_price: item.price,
          unit_cost: item.unit_cost,
        })),
        customer_name: customerName || undefined,
      });

      // Process payment
      await processPayment.mutateAsync({
        sale_id: sale.id,
        payment_method: paymentMethod,
        currency_code: 'USD',
        amount: total,
        tendered: tendered,
      });

      clearCart();
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Failed to complete sale:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col">
        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-500">Today's Sales</p>
              <p className="text-lg font-bold text-gray-900">{todaySales?.count || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-meat-600">${(todaySales?.total || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Weight Sold</p>
              <p className="text-lg font-bold text-gray-900">{(todaySales?.weight || 0).toFixed(1)} kg</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-meat-500"
            >
              {zones?.filter(z => z.is_pos_zone).map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
            {heldSales && heldSales.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHeldSalesModal(true)}
                leftIcon={<PlayCircle className="w-4 h-4" />}
              >
                Held ({heldSales.length})
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === '' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('')}
          >
            All
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading products...
            </div>
          ) : !products || products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Receipt className="w-12 h-12 mb-4 text-gray-300" />
              <p>No products available</p>
              <p className="text-sm">Add products in Settings</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`cursor-pointer ${product.available_kg < 0.1 ? 'opacity-50' : ''}`}
                  onClick={() => product.available_kg >= 0.1 && addToCart(product)}
                >
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardBody className="p-3 text-center">
                      <div className="w-12 h-12 mx-auto mb-2 bg-meat-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">🥩</span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500">{product.sku}</p>
                      <p className="text-meat-600 font-bold mt-1">
                        ${(product.price || 0).toFixed(2)}/{product.sold_by === 'each' ? 'ea' : 'kg'}
                      </p>
                      <p className={`text-xs mt-1 ${product.available_kg < 1 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {product.available_kg.toFixed(1)} kg available
                      </p>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="w-96 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Current Sale</h2>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHoldSale}
                  disabled={holdSale.isPending}
                  title="Hold sale for later"
                >
                  <PauseCircle className="w-4 h-4" />
                </Button>
              )}
              <div className="relative">
                <Input
                  placeholder="Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-32 text-sm"
                  leftIcon={<User className="w-3 h-3" />}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No items in cart</p>
              <p className="text-sm">Tap products to add them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded hover:bg-red-100 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateWeight(item.id, item.weight - 0.1)}
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={item.weight.toFixed(2)}
                        onChange={(e) => updateWeight(item.id, parseFloat(e.target.value) || 0.01)}
                        className="w-16 text-center text-sm border rounded px-1 py-0.5"
                      />
                      <span className="text-sm text-gray-500">kg</span>
                      <button
                        onClick={() => updateWeight(item.id, item.weight + 0.1)}
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-medium text-gray-900">
                      ${(item.price * item.weight).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    @ ${item.price.toFixed(2)}/kg
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Items</span>
            <span className="font-medium">{cart.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Weight</span>
            <span className="font-medium">{cart.reduce((sum, item) => sum + item.weight, 0).toFixed(2)} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax (VAT)</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-3">
            <span>Total</span>
            <span className="text-meat-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0 || !selectedZone}
            onClick={() => setShowPaymentModal(true)}
            leftIcon={<Banknote className="w-5 h-5" />}
          >
            Pay ${total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Weight Input Modal */}
      {showWeightModal && pendingProduct && (
        <WeightModal
          product={pendingProduct}
          onConfirm={(weight) => {
            addProductWithWeight(pendingProduct, weight);
            setShowWeightModal(false);
            setPendingProduct(null);
          }}
          onClose={() => {
            setShowWeightModal(false);
            setPendingProduct(null);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={total}
          onComplete={handleCompleteSale}
          onClose={() => setShowPaymentModal(false)}
          isProcessing={createSale.isPending || processPayment.isPending}
        />
      )}

      {/* Held Sales Modal */}
      {showHeldSalesModal && (
        <HeldSalesModal
          heldSales={heldSales || []}
          onRecall={handleRecallSale}
          onClose={() => setShowHeldSalesModal(false)}
        />
      )}
    </div>
  );
}

function WeightModal({
  product,
  onConfirm,
  onClose,
}: {
  product: any;
  onConfirm: (weight: number) => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Enter Weight</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6">
          <div className="text-center mb-4">
            <p className="font-medium text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">${product.price?.toFixed(2)}/kg</p>
          </div>

          <div className="mb-6">
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-center text-2xl"
              autoFocus
            />
            <p className="text-center text-gray-500 mt-2">kilograms</p>
          </div>

          {weight && parseFloat(weight) > 0 && (
            <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Line Total</p>
              <p className="text-2xl font-bold text-meat-600">
                ${(parseFloat(weight) * (product.price || 0)).toFixed(2)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[0.25, 0.5, 1, 1.5, 2, 5].map((w) => (
              <Button
                key={w}
                variant="outline"
                size="sm"
                onClick={() => setWeight(w.toString())}
              >
                {w} kg
              </Button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!weight || parseFloat(weight) <= 0}
              onClick={() => onConfirm(parseFloat(weight))}
            >
              Add to Cart
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PaymentModal({
  total,
  onComplete,
  onClose,
  isProcessing,
}: {
  total: number;
  onComplete: (method: string, tendered?: number) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [tendered, setTendered] = useState('');
  const tenderedAmount = parseFloat(tendered) || 0;
  const change = tenderedAmount - total;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">Amount Due</p>
            <p className="text-4xl font-bold text-meat-600">${total.toFixed(2)}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cash Tendered (USD)
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              className="text-center text-xl"
              leftIcon={<DollarSign className="w-5 h-5" />}
              autoFocus
            />
          </div>

          {tenderedAmount >= total && (
            <div className="text-center mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">Change Due</p>
              <p className="text-3xl font-bold text-green-600">${change.toFixed(2)}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-6">
            {[20, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                onClick={() => setTendered(amount.toString())}
              >
                ${amount}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => setTendered(Math.ceil(total).toString())}
            >
              Exact
            </Button>
            <Button
              variant="outline"
              onClick={() => setTendered((Math.ceil(total / 10) * 10).toString())}
            >
              Round ${Math.ceil(total / 10) * 10}
            </Button>
            <Button variant="outline" onClick={() => setTendered('')}>
              Clear
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={tenderedAmount < total || isProcessing}
              isLoading={isProcessing}
              onClick={() => onComplete('cash_usd', tenderedAmount)}
              leftIcon={<Banknote className="w-4 h-4" />}
            >
              Complete Sale
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function HeldSalesModal({
  heldSales,
  onRecall,
  onClose,
}: {
  heldSales: any[];
  onRecall: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle>Held Sales</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-0 overflow-y-auto">
          {heldSales.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No held sales</div>
          ) : (
            <div className="divide-y">
              {heldSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRecall(sale.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{sale.hold_number}</p>
                    <span className="text-sm text-gray-500">
                      {new Date(sale.held_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {sale.customer_name || 'Walk-in'} • {(sale.items as any[])?.length || 0} items
                    </span>
                    <span className="font-medium text-meat-600">
                      ${sale.subtotal.toFixed(2)}
                    </span>
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
