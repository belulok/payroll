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

export function useClients(companyId?: string) {
  return useQuery({
    queryKey: ['clients', companyId],
    queryFn: async () => {
      const query: any = {
        $limit: 500,
        $sort: { name: 1 }
      };

      // Only add company filter if companyId is provided
      if (companyId) {
        query.company = companyId;
      }

      const response = await feathersClient.service('clients').find({ query });
      return (response.data || response) as Client[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Client> & { company: string }) => {
      if (!data.company) {
        throw new Error('Company ID is required');
      }

      return await feathersClient.service('clients').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      return await feathersClient.service('clients').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('clients').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
