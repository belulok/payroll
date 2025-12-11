import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface LeaveEntitlement {
  name: string;        // e.g., "Annual Leave", "Sick Leave", "Maternity Leave"
  code: string;        // e.g., "AL", "SL", "ML"
  daysPerYear: number; // Entitlement days per year
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  description?: string;
}

export interface BenefitConfig {
  configType: 'group' | 'band'; // Type of configuration
  group?: string; // Worker Group ID (if configType is 'group')
  groupName?: string;
  jobBand?: string; // Job Band ID (if configType is 'band')
  jobBandName?: string;
  // Dynamic leave entitlements (replaces hardcoded annualLeave/sickLeave)
  leaveEntitlements: LeaveEntitlement[];
  // Legacy fields for backward compatibility
  annualLeave?: number;
  sickLeave?: number;
  benefits: Array<{
    name: string;
    description?: string;
    value: number;
    type: 'fixed' | 'percentage';
  }>;
}

export interface DeductionConfig {
  configType: 'group' | 'band'; // Type of configuration
  group?: string; // Worker Group ID (if configType is 'group')
  groupName?: string;
  jobBand?: string; // Job Band ID (if configType is 'band')
  jobBandName?: string;
  epfEnabled: boolean;
  epfEmployeeRate?: number; // Employee contribution rate (%)
  epfEmployerRate?: number; // Employer contribution rate (%)
  socsoEnabled: boolean;
  socsoEmployeeRate?: number; // Employee contribution rate (%)
  socsoEmployerRate?: number; // Employer contribution rate (%)
  eisEnabled: boolean;
  eisEmployeeRate?: number; // Employee contribution rate (%)
  eisEmployerRate?: number; // Employer contribution rate (%)
  customDeductions: Array<{
    name: string;
    description?: string;
    amount: number;
    type: 'fixed' | 'percentage';
  }>;
}

export interface ClientRateConfig {
  client: string;
  clientName?: string;
  positionRates: Array<{
    position: string; // Position ID
    positionTitle?: string; // Denormalized for display
    normalRate: number;
    otRate: number;
    sundayRate: number;
    phRate: number;
    currency: string;
  }>;
}

export interface CompensationConfig {
  _id: string;
  company: string;
  benefitConfigs: BenefitConfig[];
  deductionConfigs: DeductionConfig[];
  clientRateConfigs: ClientRateConfig[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Get compensation config for a company
export function useCompensationConfig(companyId?: string) {
  return useQuery({
    queryKey: ['compensation-config', companyId],
    queryFn: async () => {
      const query: any = {
        $limit: 1
      };

      if (companyId) {
        query.company = companyId;
      }

      const response = await feathersClient.service('compensation-configs').find({ query });
      const data = response.data || response;
      return data.length > 0 ? data[0] : null;
    },
  });
}

// Create compensation config
export function useCreateCompensationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CompensationConfig> & { company: string }) => {
      if (!data.company) throw new Error('Company ID is required');
      return await feathersClient.service('compensation-configs').create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-config'] });
    },
  });
}

// Update compensation config
export function useUpdateCompensationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CompensationConfig> }) => {
      return await feathersClient.service('compensation-configs').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-config'] });
    },
  });
}
