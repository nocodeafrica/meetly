import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Scale, DollarSign } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '../../components/ui';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useZones } from '../../hooks/useZones';
import { useAllGrades } from '../../hooks/useGrades';
import { useCreateCarcass } from '../../hooks/useCarcasses';

const carcassSchema = z.object({
  source_type: z.enum(['purchased', 'slaughtered']).default('purchased'),
  supplier_id: z.string().min(1, 'Supplier is required'),
  weight_kg: z.number().min(0.1, 'Weight must be greater than 0'),
  grade_id: z.string().optional(),
  cost_total: z.number().min(0, 'Cost must be 0 or greater'),
  destination_zone_id: z.string().optional(),
  notes: z.string().optional(),
});

// Type inferred from schema

export function ReceiveCarcassPage() {
  const navigate = useNavigate();
  const { data: suppliers } = useSuppliers();
  const { data: zones } = useZones();
  const { data: grades } = useAllGrades();
  const createCarcass = useCreateCarcass();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(carcassSchema),
    defaultValues: {
      source_type: 'purchased' as const,
      supplier_id: '',
      weight_kg: 0,
      cost_total: 0,
      grade_id: '',
      destination_zone_id: '',
      notes: '',
    },
  });

  const weight = watch('weight_kg') || 0;
  const cost = watch('cost_total') || 0;
  const costPerKg = weight > 0 ? cost / weight : 0;

  const onSubmit = async (data: any) => {
    try {
      await createCarcass.mutateAsync({
        source_type: data.source_type,
        supplier_id: data.supplier_id,
        weight_kg: data.weight_kg,
        grade_id: data.grade_id || null,
        cost_total: data.cost_total,
        destination_zone_id: data.destination_zone_id || null,
        notes: data.notes || null,
        status: 'pending',
        quarters_count: 0,
        total_output_kg: 0,
        waste_kg: 0,
        total_revenue: 0,
      } as any);
      navigate('/receiving');
    } catch (error) {
      console.error('Failed to create carcass:', error);
    }
  };

  const defaultReceivingZone = zones?.find(z => z.is_default_receiving);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/receiving')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Receive Carcass</h2>
          <p className="text-sm text-gray-500">Record incoming carcass details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Source */}
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="purchased"
                      className="text-meat-600 focus:ring-meat-500"
                      {...register('source_type')}
                    />
                    <span className="text-sm text-gray-700">Purchased Carcass</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="slaughtered"
                      className="text-meat-600 focus:ring-meat-500"
                      {...register('source_type')}
                    />
                    <span className="text-sm text-gray-700">Slaughtered On-Site</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500 ${
                    errors.supplier_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  {...register('supplier_id')}
                >
                  <option value="">Select Supplier</option>
                  {suppliers?.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {errors.supplier_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.supplier_id.message}</p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Weight & Grade */}
          <Card>
            <CardHeader>
              <CardTitle>Weight & Grade</CardTitle>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Carcass Weight (kg) *"
                    type="number"
                    step="0.1"
                    leftIcon={<Scale className="w-4 h-4" />}
                    error={errors.weight_kg?.message}
                    {...register('weight_kg', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                    {...register('grade_id')}
                  >
                    <option value="">Select Grade</option>
                    {grades?.map((grade: any) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.code} - {grade.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Cost */}
          <Card>
            <CardHeader>
              <CardTitle>Cost</CardTitle>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Total Cost (USD) *"
                    type="number"
                    step="0.01"
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    error={errors.cost_total?.message}
                    {...register('cost_total', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per kg</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    ${costPerKg.toFixed(2)} / kg
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Destination */}
          <Card>
            <CardHeader>
              <CardTitle>Destination</CardTitle>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Zone</label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                  defaultValue={defaultReceivingZone?.id || ''}
                  {...register('destination_zone_id')}
                >
                  <option value="">Select Zone</option>
                  {zones?.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} {zone.is_default_receiving ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                  placeholder="Any additional notes about this carcass..."
                  {...register('notes')}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Weight</span>
                <span className="font-medium">{weight.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Total Cost</span>
                <span className="font-medium">${cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Cost per kg</span>
                <span className="font-bold text-lg text-meat-600">${costPerKg.toFixed(2)}</span>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-3">
            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              Receive Carcass
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/receiving')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
