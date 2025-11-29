import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

interface Worker {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  paymentType: string;
}

interface PayrollRecord {
  _id: string;
  worker: Worker;
  periodStart: string;
  periodEnd: string;
  paymentType: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paymentStatus: string;
  totalHours?: number;
  totalNormalHours?: number;
  totalOT1_5Hours?: number;
  totalOT2_0Hours?: number;
  monthlySalary?: number;
  totalAmount?: number;
  epf?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  socso?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  eis?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
}

export function usePayrollRecords(companyId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-records', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const response = await feathersClient.service('payroll-records').find({
        query: {
          company: companyId,
          $limit: 100,
          $sort: { periodEnd: -1 }
        }
      });

      return (response.data || response) as PayrollRecord[];
    },
    enabled: !!companyId,
  });
}

export function useGeneratePayroll(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { workerId: string; periodStart: string; periodEnd: string }) => {
      return await feathersClient.service('payroll').create({
        workerId: data.workerId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records', companyId] });
    },
  });
}

export function useApprovePayroll(companyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payrollId: string) => {
      return await feathersClient.service('payroll-records').patch(payrollId, {
        status: 'approved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records', companyId] });
    },
  });
}

