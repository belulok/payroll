import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface Task {
  _id: string;
  company: string;
  name: string;
  taskId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useTasks(companyId?: string, filters?: { isActive?: boolean }) {
  return useQuery({
    queryKey: ['tasks', companyId, filters],
    queryFn: async () => {
      const query: any = {
        $limit: 1000,
        $sort: { createdAt: -1 }
      };

      if (companyId) {
        query.company = companyId;
      }

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const response = await feathersClient.service('tasks').find({ query });
      return response.data || response;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Task> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');
      return await feathersClient.service('tasks').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      return await feathersClient.service('tasks').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('tasks').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
