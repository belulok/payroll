import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface InvoiceItem {
  workerId: string;
  workerName: string;
  team?: string;
  normalHours: number;
  otHours: number;
  sundayHours: number;
  phHours: number;
  totalHours: number;
  normalRate: number;
  otRate: number;
  sundayRate: number;
  phRate: number;
  normalAmount: number;
  otAmount: number;
  sundayAmount: number;
  phAmount: number;
  totalAmount: number;
  claimAmount: number;
  grandTotal: number;
  dailyBreakdown: Array<{
    date: string;
    normalHours: number;
    otHours: number;
    sundayHours: number;
    phHours: number;
  }>;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  companyId: string;
	  periodType: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  invoiceDate: string;
  dueDate: string;
  totalNormalHours: number;
  totalOtHours: number;
  totalSundayHours: number;
  totalPhHours: number;
  totalHours: number;
  subtotalAmount: number;
  taxRate: number;
  taxAmount: number;
  totalClaimAmount: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms: string;
  paymentMethod?: string;
  paidDate?: string;
  paidAmount: number;
  items: InvoiceItem[];
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateInvoiceData {
  clientId: string;
  projectId: string;
  startDate: string;
  endDate: string;
	  periodType: 'daily' | 'weekly' | 'monthly' | 'custom';
  taxRate?: number;
}

export const useInvoices = (companyId?: string, params?: any) => {
  return useQuery({
    queryKey: ['invoices', companyId, params],
    queryFn: async () => {
      if (!companyId) return { data: [] };

      const response = await feathersClient.service('invoices').find({
        query: {
	          // Invoices store the tenant reference in `companyId` (not `company`),
	          // so we must filter using `companyId` to actually get results.
	          companyId: companyId,
          $limit: params?.limit || 50,
          $skip: params?.skip || 0,
          $sort: { createdAt: -1 },
          ...params?.query
        }
      });
      return response;
    },
    enabled: !!companyId
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      return await feathersClient.service('invoices').get(id);
    },
    enabled: !!id
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Invoice>) => {
      return await feathersClient.service('invoices').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateInvoiceData) => {
      return await feathersClient.service('invoices/generate').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Invoice> }) => {
      return await feathersClient.service('invoices').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await feathersClient.service('invoices').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};
