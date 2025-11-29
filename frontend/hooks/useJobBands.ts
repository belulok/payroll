import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';

export interface JobBand {
  _id: string;
  company: string;
  name: string;
  code?: string;
  description?: string;
  level: number;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useJobBands(filters?: { isActive?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['job-bands', selectedCompany, filters],
    queryFn: async () => {
      const query: any = {
        company: selectedCompany,
        $limit: 1000,
        $sort: { level: 1, name: 1 }
      };

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const response = await feathersClient.service('job-bands').find({ query });
      return response.data || response;
    },
    enabled: !!selectedCompany,
  });
}

export function useCreateJobBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<JobBand>) => {
      return await feathersClient.service('job-bands').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-bands'] });
    },
  });
}

export function useUpdateJobBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<JobBand> }) => {
      return await feathersClient.service('job-bands').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-bands'] });
    },
  });
}

export function useDeleteJobBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('job-bands').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-bands'] });
    },
  });
}

