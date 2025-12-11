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
  profilePicture?: string;
  profilePictureFileName?: string;
  payrollInfo?: {
    monthlySalary?: number;
    hourlyRate?: number;
    unitRates?: Array<{ unitType: string; ratePerUnit: number }>;
    currency?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    epfNumber?: string;
    socsoNumber?: string;
    taxNumber?: string;
  };
  leaveTier?: string;
  user?: string;
}

export function useWorkers(companyId?: string) {
  return useQuery({
    queryKey: ['workers', companyId],
    queryFn: async () => {
      const query: any = {
        $limit: 100,
        $sort: { employeeId: 1 }
      };

      if (companyId) {
        query.company = companyId;
      }

      const response = await feathersClient.service('workers').find({ query });
      return (response.data || response) as Worker[];
    },
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Worker> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');

      return await feathersClient.service('workers').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Worker> }) => {
      return await feathersClient.service('workers').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useArchiveWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      return await feathersClient.service('workers').patch(workerId, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useUnarchiveWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      return await feathersClient.service('workers').patch(workerId, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}
