import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface Loan {
  _id: string;
  loanId: string;
  category: 'loan' | 'advance';
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email?: string;
    phone?: string;
    profilePicture?: string;
  };
  company: {
    _id: string;
    name: string;
  };
  principalAmount: number;
  interestRate: number;
  totalAmount: number;
  currency: string;
  hasInstallments: boolean;
  installmentType: 'fixed_amount' | 'fixed_count';
  installmentAmount?: number;
  installmentCount?: number;
  installments?: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: 'pending' | 'paid' | 'overdue';
    paidAt?: string;
  }>;
  status: 'active' | 'completed' | 'cancelled' | 'defaulted';
  loanDate: string;
  startDate: string;
  expectedEndDate?: string;
  completedAt?: string;
  totalPaidAmount: number;
  remainingAmount: number;
  description?: string;
  notes?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all loans for a company
export function useLoans(companyId?: string) {
  return useQuery({
    queryKey: ['loans', companyId],
    queryFn: async () => {
      const query: any = {
        $sort: { createdAt: -1 }
      };

      if (companyId) {
        query.company = companyId;
      }

      const response = await feathersClient.service('loans').find({ query });
      return response.data || response;
    },
  });
}

// Get a specific loan
export function useLoan(loanId?: string) {
  return useQuery({
    queryKey: ['loan', loanId],
    queryFn: async () => {
      if (!loanId) return null;
      return await feathersClient.service('loans').get(loanId);
    },
    enabled: !!loanId,
  });
}

// Create a new loan
export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Loan> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');
      return await feathersClient.service('loans').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Update a loan
export function useUpdateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Loan> }) => {
      return await feathersClient.service('loans').patch(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', data._id] });
    },
  });
}

// Delete a loan
export function useDeleteLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loanId: string) => {
      return await feathersClient.service('loans').remove(loanId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Record a payment for a loan
export function useRecordLoanPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      amount,
      payrollRecordId,
      installmentNumber
    }: {
      loanId: string;
      amount: number;
      payrollRecordId?: string;
      installmentNumber?: number;
    }) => {
      return await feathersClient.service('loans').recordPayment(loanId, {
        amount,
        payrollRecordId,
        installmentNumber
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', data._id] });
    },
  });
}
