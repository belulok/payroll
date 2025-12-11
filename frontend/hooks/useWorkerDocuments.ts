import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface WorkerDocument {
  _id: string;
  worker: string | { _id: string; firstName: string; lastName: string; employeeId: string };
  company: string | { _id: string; name: string };
  documentType: 'passport' | 'visa' | 'work-permit' | 'ic' | 'driving-license' | 'medical-certificate' | 'insurance' | 'contract' | 'other';
  documentNumber?: string;
  documentName: string;
  countryOfIssue?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileName?: string;
  reminderEnabled: boolean;
  customReminderDays?: number[];
  remindersSent?: Array<{
    daysBeforeExpiry: number;
    sentAt: string;
    sentTo: string[];
  }>;
  status: 'active' | 'expired' | 'expiring-soon' | 'archived';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all documents for a worker
export function useWorkerDocuments(workerId?: string) {
  return useQuery({
    queryKey: ['worker-documents', workerId],
    queryFn: async () => {
      if (!workerId) return [];
      const result = await feathersClient.service('worker-documents').find({
        query: {
          worker: workerId,
          $sort: { expiryDate: 1 }
        }
      });
      return result.data || result;
    },
    enabled: !!workerId
  });
}

// Get all documents for a company
export function useCompanyDocuments(companyId?: string) {
  return useQuery({
    queryKey: ['worker-documents', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const result = await feathersClient.service('worker-documents').find({
        query: {
          company: companyId,
          $sort: { expiryDate: 1 }
        }
      });
      return result.data || result;
    },
    enabled: !!companyId
  });
}

// Get expiring documents
export function useExpiringDocuments(days: number = 30) {
  return useQuery({
    queryKey: ['worker-documents', 'expiring', days],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);

      const result = await feathersClient.service('worker-documents').find({
        query: {
          expiryDate: { $gte: today.toISOString(), $lte: targetDate.toISOString() },
          status: { $ne: 'archived' },
          $sort: { expiryDate: 1 }
        }
      });
      return result.data || result;
    }
  });
}

// Create document
export function useCreateWorkerDocument(workerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WorkerDocument>) => {
      return feathersClient.service('worker-documents').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-documents', workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker-documents', 'expiring'] });
    }
  });
}

// Update document
export function useUpdateWorkerDocument(workerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkerDocument> }) => {
      return feathersClient.service('worker-documents').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-documents', workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker-documents', 'expiring'] });
    }
  });
}

// Delete document
export function useDeleteWorkerDocument(workerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return feathersClient.service('worker-documents').remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-documents', workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker-documents', 'expiring'] });
    }
  });
}

// Document type labels
export const documentTypeLabels: Record<string, string> = {
  'passport': 'Passport',
  'visa': 'Visa',
  'work-permit': 'Work Permit',
  'ic': 'IC / National ID',
  'driving-license': 'Driving License',
  'medical-certificate': 'Medical Certificate',
  'insurance': 'Insurance',
  'contract': 'Contract',
  'other': 'Other'
};

// Document status colors
export const documentStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  'active': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'expiring-soon': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'expired': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'archived': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
};

// Calculate days until expiry
export function getDaysUntilExpiry(expiryDate: string | undefined): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}


