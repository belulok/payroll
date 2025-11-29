import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';

export interface JobGrade {
  _id: string;
  company: string;
  name: string;
  code?: string;
  description?: string;
  jobBand?: string;
  level: number;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useJobGrades(filters?: { isActive?: boolean; jobBand?: string }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['job-grades', selectedCompany, filters],
    queryFn: async () => {
      const query: any = {
        company: selectedCompany,
        $limit: 1000,
        $sort: { level: 1, name: 1 }
      };

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters?.jobBand) {
        query.jobBand = filters.jobBand;
      }

      const response = await feathersClient.service('job-grades').find({ query });
      return response.data || response;
    },
    enabled: !!selectedCompany,
  });
}

export function useCreateJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<JobGrade>) => {
      return await feathersClient.service('job-grades').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-grades'] });
    },
  });
}

export function useUpdateJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<JobGrade> }) => {
      return await feathersClient.service('job-grades').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-grades'] });
    },
  });
}

export function useDeleteJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('job-grades').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-grades'] });
    },
  });
}

