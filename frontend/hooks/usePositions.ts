import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';

export interface Position {
  _id: string;
  company: string;
  title: string;
  code?: string;
  description?: string;
  department?: string;
  jobBand?: string;
  jobGrade?: string;
  reportsTo?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function usePositions(filters?: { isActive?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['positions', selectedCompany, filters],
    queryFn: async () => {
      const query: any = {
        company: selectedCompany,
        $limit: 1000,
        $sort: { title: 1 }
      };

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const response = await feathersClient.service('positions').find({ query });
      return response.data || response;
    },
    enabled: !!selectedCompany,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Position>) => {
      return await feathersClient.service('positions').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Position> }) => {
      return await feathersClient.service('positions').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('positions').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

