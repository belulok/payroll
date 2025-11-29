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

export function useProjects(companyId: string | undefined) {
  return useQuery({
    queryKey: ['projects', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const response = await feathersClient.service('projects').find({
        query: {
          company: companyId,
          $limit: 500,
          $sort: { name: 1 },
          $populate: ['client']
        }
      });

      console.log('useProjects response:', response);

      return (response.data || response) as Project[];
    },
    enabled: !!companyId,
  });
}

export function useCreateProject(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      if (!companyId) throw new Error('Company ID is required');

      return await feathersClient.service('projects').create({
        ...data,
        company: companyId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId] });
    },
  });
}

export function useUpdateProject(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      console.log('🔧 useUpdateProject - Patching project:', id);
      console.log('🔧 useUpdateProject - Data to patch:', data);
      console.log('🔧 useUpdateProject - Client field:', data.client);

      const result = await feathersClient.service('projects').patch(id, data);

      console.log('🔧 useUpdateProject - Patch result:', result);
      console.log('🔧 useUpdateProject - Result client field:', result.client);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId] });
    },
  });
}

export function useDeleteProject(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      return await feathersClient.service('projects').remove(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId] });
    },
  });
}

