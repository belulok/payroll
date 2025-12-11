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

export function usePayrollRecords(companyId?: string) {
  return useQuery({
    queryKey: ['payroll-records', companyId],
    queryFn: async () => {
      const query: any = {
        $limit: 100,
        $sort: { periodEnd: -1 }
      };

      if (companyId) {
        query.company = companyId;
      }

      const response = await feathersClient.service('payroll-records').find({ query });
      return (response.data || response) as PayrollRecord[];
    },
  });
}

export function useGeneratePayroll() {
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
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
    },
  });
}

export function useApprovePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payrollId: string) => {
      return await feathersClient.service('payroll-records').patch(payrollId, {
        status: 'approved'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
    },
  });
}
