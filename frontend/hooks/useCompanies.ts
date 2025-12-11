import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

interface Company {
  _id: string;
  name: string;
  registrationNumber: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  subscription: {
    plan: string;
    status: string;
    maxWorkers: number;
    monthlyFee: number;
  };
  paymentTypes: string[];
  isActive: boolean;
  workerCount?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  agent?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await feathersClient.service('companies').find({
        query: {
          $limit: 100,
          $sort: { name: 1 }
        }
      });

      const companiesData = (response.data || response) as Company[];

      // Fetch worker counts for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company: Company) => {
          try {
            const workers = await feathersClient.service('workers').find({
              query: {
                company: company._id,
                $limit: 0
              }
            });
            return { ...company, workerCount: workers.total || 0 };
          } catch (error) {
            return { ...company, workerCount: 0 };
          }
        })
      );

      return companiesWithCounts;
    },
    // Companies don't change often, so we can cache them longer
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Company>) => {
      return await feathersClient.service('companies').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      return await feathersClient.service('companies').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('companies').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

