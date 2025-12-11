import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface WorkerGroup {
  _id: string;
  company: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useWorkerGroups(companyId?: string, filters?: { isActive?: boolean }) {
  return useQuery({
    queryKey: ['worker-groups', companyId, filters],
    queryFn: async () => {
      const query: any = {
        $limit: 1000,
        $sort: { name: 1 }
      };

      if (companyId) {
        query.company = companyId;
      }

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const response = await feathersClient.service('worker-groups').find({ query });
      return response.data || response;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useCreateWorkerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WorkerGroup> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');
      return await feathersClient.service('worker-groups').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-groups'] });
    },
  });
}

export function useUpdateWorkerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkerGroup> }) => {
      return await feathersClient.service('worker-groups').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-groups'] });
    },
  });
}

export function useDeleteWorkerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('worker-groups').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-groups'] });
    },
  });
}
