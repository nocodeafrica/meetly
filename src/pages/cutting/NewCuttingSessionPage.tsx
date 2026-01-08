import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Scissors, Scale } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../../components/ui';
import { useCarcasses } from '../../hooks/useCarcasses';
import { useCreateCuttingSession } from '../../hooks/useCuttingSessions';

const sessionSchema = z.object({
  carcass_id: z.string().min(1, 'Please select a carcass'),
  butcher_id: z.string().optional(),
  notes: z.string().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

export function NewCuttingSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCarcassId = searchParams.get('carcass');

  const { data: carcasses } = useCarcasses({ status: 'pending' });
  const createSession = useCreateCuttingSession();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      carcass_id: preselectedCarcassId || '',
    },
  });

  const selectedCarcassId = watch('carcass_id');
  const selectedCarcass = carcasses?.find(c => c.id === selectedCarcassId);

  const onSubmit = async (data: SessionFormData) => {
    try {
      const session = await createSession.mutateAsync({
        carcass_id: data.carcass_id,
        butcher_id: data.butcher_id || null,
        notes: data.notes || null,
      });
      navigate(`/cutting/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/cutting')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Start Cutting Session</h2>
          <p className="text-sm text-gray-500">Select a carcass to begin processing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Carcass Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Carcass</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              {!carcasses || carcasses.length === 0 ? (
                <div className="text-center py-8">
                  <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No pending carcasses available for cutting</p>
                  <Button variant="outline" onClick={() => navigate('/receiving/new')}>
                    Receive a Carcass First
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Select a pending carcass to begin a cutting session. Only carcasses that haven't been processed yet are shown.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {carcasses.map((carcass) => (
                      <label
                        key={carcass.id}
                        className={`relative flex cursor-pointer rounded-lg border p-4 hover:bg-gray-50 transition-colors ${
                          selectedCarcassId === carcass.id
                            ? 'border-meat-600 bg-meat-50 ring-2 ring-meat-600'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          value={carcass.id}
                          className="sr-only"
                          {...register('carcass_id')}
                        />
                        <div className="flex flex-col w-full">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-gray-900">
                              {carcass.carcass_number}
                            </span>
                            {carcass.grade && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                {carcass.grade.code}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>Weight: <span className="font-medium text-gray-700">{carcass.weight_kg.toFixed(1)} kg</span></p>
                            <p>Supplier: {carcass.supplier?.name || '-'}</p>
                            <p className="text-xs text-gray-400">
                              Received {new Date(carcass.received_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {selectedCarcassId === carcass.id && (
                          <div className="absolute top-3 right-3">
                            <div className="w-5 h-5 bg-meat-600 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.carcass_id && (
                    <p className="text-sm text-red-600">{errors.carcass_id.message}</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Session Notes</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <textarea
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-meat-500"
                placeholder="Any notes for this cutting session..."
                {...register('notes')}
              />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Carcass Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              {selectedCarcass ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-meat-50 rounded-lg">
                    <Scale className="w-8 h-8 text-meat-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedCarcass.carcass_number}</p>
                      <p className="text-sm text-gray-500">{selectedCarcass.weight_kg.toFixed(1)} kg</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Supplier</span>
                      <span className="font-medium">{selectedCarcass.supplier?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Grade</span>
                      <span className="font-medium">
                        {selectedCarcass.grade?.code || 'Not graded'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Cost</span>
                      <span className="font-medium">${selectedCarcass.cost_total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">Cost/kg</span>
                      <span className="font-medium">${selectedCarcass.cost_per_kg.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Scissors className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>Select a carcass to see details</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
              disabled={!selectedCarcassId || isSubmitting}
              leftIcon={<Scissors className="w-4 h-4" />}
            >
              Start Cutting Session
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/cutting')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
