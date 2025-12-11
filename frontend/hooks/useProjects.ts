import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

interface Client {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
}

interface Project {
  _id: string;
  name: string;
  company: string;
  client: string | Client;
  projectCode?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  location?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useProjects(companyId?: string) {
  return useQuery({
    queryKey: ['projects', companyId],
    queryFn: async () => {
      const query: any = {
        $limit: 500,
        $sort: { name: 1 },
        $populate: ['client']
      };

      if (companyId) {
        query.company = companyId;
      }

      const response = await feathersClient.service('projects').find({ query });
      return (response.data || response) as Project[];
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');

      return await feathersClient.service('projects').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      return await feathersClient.service('projects').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      return await feathersClient.service('projects').remove(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
