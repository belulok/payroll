import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';

export interface Department {
  _id: string;
  company: string;
  name: string;
  code?: string;
  description?: string;
  parentDepartment?: string;
  headOfDepartment?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useDepartments(filters?: { isActive?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['departments', selectedCompany, filters],
    queryFn: async () => {
      const query: any = {
        company: selectedCompany,
        $limit: 1000,
        $sort: { name: 1 }
      };

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const response = await feathersClient.service('departments').find({ query });
      return response.data || response;
    },
    enabled: !!selectedCompany,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Department>) => {
      return await feathersClient.service('departments').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) => {
      return await feathersClient.service('departments').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('departments').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

