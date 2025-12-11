import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface JobGrade {
  _id: string;
  company: string;
  name: string;
  code?: string;
  description?: string;
  jobBand?: string;
  level: number;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useJobGrades(companyId?: string, filters?: { isActive?: boolean; jobBand?: string }) {
  return useQuery({
    queryKey: ['job-grades', companyId, filters],
    queryFn: async () => {
      const query: any = {
        $limit: 1000,
        $sort: { level: 1, name: 1 }
      };

      if (companyId) {
        query.company = companyId;
      }

      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters?.jobBand) {
        query.jobBand = filters.jobBand;
      }

      const response = await feathersClient.service('job-grades').find({ query });
      return response.data || response;
    },
  });
}

export function useCreateJobGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<JobGrade> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');
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
