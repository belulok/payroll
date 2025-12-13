import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import feathersClient from '@/lib/feathers';

// Hook to check if user is authenticated
function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await feathersClient.reAuthenticate();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  return { isAuthenticated, isChecking };
}

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
  const { isAuthenticated, isChecking } = useIsAuthenticated();

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
    // Only run query when authenticated
    enabled: isAuthenticated && !isChecking,
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

