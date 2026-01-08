import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button, Input, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { useCategories, useCreateProduct, useUpdateProduct } from '../../hooks/useProducts';
import { useGradingSchemes } from '../../hooks/useGrades';
import type { Product } from '../../types/database';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  unit_of_measure: z.string().default('kg'),
  sold_by: z.enum(['weight', 'each']).default('weight'),
  default_weight_kg: z.number().optional(),
  can_be_produced: z.boolean().default(false),
  can_be_sold: z.boolean().default(true),
  requires_weighing: z.boolean().default(true),
  traceability_level: z.enum(['full', 'batch', 'none']).default('batch'),
  grading_scheme_id: z.string().optional(),
  minimum_stock_kg: z.number().default(0),
  reorder_point_kg: z.number().default(0),
  shelf_life_days: z.number().optional(),
  tax_rate_percent: z.number().default(15),
  is_active: z.boolean().default(true),
});

// Type inferred from schema

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const { data: categories } = useCategories();
  const { data: gradingSchemes } = useGradingSchemes();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description || '',
          category_id: product.category_id || '',
          unit_of_measure: product.unit_of_measure,
          sold_by: product.sold_by as 'weight' | 'each',
          default_weight_kg: product.default_weight_kg || undefined,
          can_be_produced: product.can_be_produced,
          can_be_sold: product.can_be_sold,
          requires_weighing: product.requires_weighing,
          traceability_level: product.traceability_level as 'full' | 'batch' | 'none',
          grading_scheme_id: product.grading_scheme_id || '',
          minimum_stock_kg: product.minimum_stock_kg,
          reorder_point_kg: product.reorder_point_kg,
          shelf_life_days: product.shelf_life_days || undefined,
          tax_rate_percent: product.tax_rate_percent,
          is_active: product.is_active,
        }
      : {
          sku: '',
          name: '',
          description: '',
          category_id: '',
          unit_of_measure: 'kg',
          sold_by: 'weight' as const,
          can_be_produced: false,
          can_be_sold: true,
          requires_weighing: true,
          traceability_level: 'batch' as const,
          grading_scheme_id: '',
          minimum_stock_kg: 0,
          reorder_point_kg: 0,
          tax_rate_percent: 15,
          is_active: true,
        },
  });

  const soldBy = watch('sold_by');

  const onSubmit = async (data: any) => {
    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, data });
      } else {
        await createProduct.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{product ? 'Edit Product' : 'Add Product'}</CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SKU *"
                placeholder="e.g., TBN-001"
                error={errors.sku?.message}
                {...register('sku')}
              />
              <Input
                label="Name *"
                placeholder="e.g., T-Bone Steak"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500 focus:border-meat-500"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                  {...register('category_id')}
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grading Scheme</label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                  {...register('grading_scheme_id')}
                >
                  <option value="">No Grading</option>
                  {gradingSchemes?.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sales Settings */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Sales Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                    {...register('unit_of_measure')}
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="each">Each</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sold By</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                    {...register('sold_by')}
                  >
                    <option value="weight">Weight</option>
                    <option value="each">Each / Unit</option>
                  </select>
                </div>
                {soldBy === 'each' && (
                  <Input
                    label="Default Weight (kg)"
                    type="number"
                    step="0.001"
                    {...register('default_weight_kg', { valueAsNumber: true })}
                  />
                )}
              </div>
              <div className="mt-4">
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  step="0.01"
                  {...register('tax_rate_percent', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Inventory Settings */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Inventory Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Minimum Stock (kg)"
                  type="number"
                  step="0.001"
                  {...register('minimum_stock_kg', { valueAsNumber: true })}
                />
                <Input
                  label="Reorder Point (kg)"
                  type="number"
                  step="0.001"
                  {...register('reorder_point_kg', { valueAsNumber: true })}
                />
                <Input
                  label="Shelf Life (days)"
                  type="number"
                  {...register('shelf_life_days', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Traceability */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Traceability</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Traceability Level</label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                  {...register('traceability_level')}
                >
                  <option value="full">Full (to specific carcass)</option>
                  <option value="batch">Batch (to cutting session)</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            {/* Flags */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Product Behavior</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-meat-600 rounded focus:ring-meat-500"
                    {...register('can_be_sold')}
                  />
                  <span className="text-sm text-gray-700">Can be sold (available at POS)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-meat-600 rounded focus:ring-meat-500"
                    {...register('can_be_produced')}
                  />
                  <span className="text-sm text-gray-700">Can be produced (output of cutting)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-meat-600 rounded focus:ring-meat-500"
                    {...register('requires_weighing')}
                  />
                  <span className="text-sm text-gray-700">Requires weighing at sale</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-meat-600 rounded focus:ring-meat-500"
                    {...register('is_active')}
                  />
                  <span className="text-sm text-gray-700">Active (visible in system)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {product ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
