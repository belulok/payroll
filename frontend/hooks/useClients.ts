import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

interface Client {
  _id: string;
  name: string;
  company: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
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

export function useClients(companyId: string | undefined) {
  return useQuery({
    queryKey: ['clients', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const response = await feathersClient.service('clients').find({
        query: {
          company: companyId,
          $limit: 500,
          $sort: { name: 1 }
        }
      });

      return (response.data || response) as Client[];
    },
    enabled: !!companyId,
  });
}

export function useCreateClient(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const targetCompany = data.company || companyId;

      if (!targetCompany) throw new Error('Company ID is required');

      return await feathersClient.service('clients').create({
        ...data,
        company: targetCompany
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', companyId] });
    },
  });
}

export function useUpdateClient(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      return await feathersClient.service('clients').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', companyId] });
    },
  });
}

export function useDeleteClient(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('clients').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', companyId] });
    },
  });
}

