import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

export interface BenefitConfig {
  configType: 'group' | 'band'; // Type of configuration
  group?: string; // Worker Group ID (if configType is 'group')
  groupName?: string;
  jobBand?: string; // Job Band ID (if configType is 'band')
  jobBandName?: string;
  annualLeave: number;
  sickLeave: number;
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
export function useCompensationConfig(companyId: string | undefined) {
  return useQuery({
    queryKey: ['compensation-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const response = await feathersClient.service('compensation-configs').find({
        query: {
          company: companyId,
          $limit: 1
        }
      });

      const data = response.data || response;
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!companyId,
  });
}

// Create compensation config
export function useCreateCompensationConfig(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CompensationConfig>) => {
      return await feathersClient.service('compensation-configs').create({
        ...data,
        company: data.company || companyId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-config', companyId] });
    },
  });
}

// Update compensation config
export function useUpdateCompensationConfig(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CompensationConfig> }) => {
      return await feathersClient.service('compensation-configs').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-config', companyId] });
    },
  });
}

