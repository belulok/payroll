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
export function useLoans(companyId: string | undefined) {
  return useQuery({
    queryKey: ['loans', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const response = await feathersClient.service('loans').find({
        query: {
          company: companyId,
          $sort: { createdAt: -1 }
        }
      });

      return response.data || response;
    },
    enabled: !!companyId,
  });
}

// Get a specific loan
export function useLoan(loanId: string | undefined) {
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
export function useCreateLoan(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Loan>) => {
      return await feathersClient.service('loans').create({
        ...data,
        company: data.company || companyId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', companyId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Update a loan
export function useUpdateLoan(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Loan> }) => {
      return await feathersClient.service('loans').patch(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans', companyId] });
      queryClient.invalidateQueries({ queryKey: ['loan', data._id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Delete a loan
export function useDeleteLoan(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loanId: string) => {
      return await feathersClient.service('loans').remove(loanId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', companyId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Record a payment for a loan
export function useRecordLoanPayment(companyId: string | undefined) {
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
      queryClient.invalidateQueries({ queryKey: ['loans', companyId] });
      queryClient.invalidateQueries({ queryKey: ['loan', data._id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}
