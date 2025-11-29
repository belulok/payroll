import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
}

interface LineManager {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  position: string;
}

interface Client {
  _id: string;
  name: string;
}

interface Worker {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  jobDesignation?: string;
  paymentType: 'monthly-salary' | 'hourly' | 'unit-based';
  employmentStatus: string;
  isActive?: boolean;
  company?: string | Company;
  lineManager?: string | LineManager;
  client?: string | Client;
  project?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportCountry?: string;
  payrollInfo: {
    monthlySalary?: number;
    hourlyRate?: number;
    unitRates?: Array<{ unitType: string; ratePerUnit: number }>;
    currency: string;
  };
  leaveTier?: string;
  user?: string;
}

export function useWorkers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['workers', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const response = await feathersClient.service('workers').find({
        query: {
          company: companyId,
          $limit: 100,
          $sort: { employeeId: 1 }
        }
      });
      return (response.data || response) as Worker[];
    },
    enabled: !!companyId,
  });
}

export function useCreateWorker(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Worker>) => {
      // Use company from data if provided (for admin users), otherwise use companyId
      const targetCompany = data.company || companyId;
      if (!targetCompany) throw new Error('Company ID is required');

      return await feathersClient.service('workers').create({
        ...data,
        company: targetCompany
      });
    },
    onSuccess: () => {
      // Invalidate and refetch workers query
      queryClient.invalidateQueries({ queryKey: ['workers', companyId] });
      // Also invalidate all workers queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useUpdateWorker(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Worker> }) => {
      return await feathersClient.service('workers').patch(id, data);
    },
    onSuccess: () => {
      // Invalidate the specific company workers list
      queryClient.invalidateQueries({ queryKey: ['workers', companyId] });
      // Also invalidate all workers queries so cross-company lists stay in sync
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useArchiveWorker(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      return await feathersClient.service('workers').patch(workerId, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers', companyId] });
    },
  });
}

export function useUnarchiveWorker(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      return await feathersClient.service('workers').patch(workerId, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers', companyId] });
    },
  });
}

