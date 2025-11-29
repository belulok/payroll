import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';

export interface Task {
  _id: string;
  company: string;
  name: string;
  taskId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useTasks(filters?: { isActive?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['tasks', selectedCompany, filters],
    queryFn: async () => {
      const query: any = {
        company: selectedCompany,
        $limit: 1000,
        $sort: { createdAt: -1 }
      };

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const response = await feathersClient.service('tasks').find({ query });
      return response.data || response;
    },
    enabled: !!selectedCompany,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Task>) => {
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
