import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feathersClient from '@/lib/feathers';

interface DailyEntry {
  date: string;
  dayOfWeek: string;
  clockIn?: string;
  clockOut?: string;
  lunchOut?: string;
  lunchIn?: string;
  normalHours: number;
  ot1_5Hours: number;
  ot2_0Hours: number;
  totalHours: number;
  checkInMethod?: string;
  qrCodeCheckIn?: {
    scanned: boolean;
    scannedAt: string;
  };
  qrCodeCheckOut?: {
    scanned: boolean;
    scannedAt: string;
  };
  location?: any;
  notes?: string;
  isAbsent: boolean;
  leaveType?: string;
}

interface WeeklyTimesheet {
  _id: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  task?: {
    _id: string;
    name: string;
    taskId: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  dailyEntries: DailyEntry[];
  totalNormalHours: number;
  totalOT1_5Hours: number;
  totalOT2_0Hours: number;
  totalHours: number;
  status: string;
}

export function useTimesheets(companyId: string | undefined, weekStart: Date) {
  return useQuery({
    queryKey: ['timesheets', companyId, weekStart.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Include Saturday for hourly workers

      const response = await feathersClient.service('timesheets').find({
        query: {
          company: companyId,
          $limit: 500,
          weekStartDate: {
            $gte: weekStart.toISOString(),
            $lte: weekEnd.toISOString()
          },
          $sort: { weekStartDate: 1 },
          isDeleted: false
        }
      });

      return (response.data || response) as WeeklyTimesheet[];
    },
    enabled: !!companyId,
  });
}

export function useUpdateTimesheet(companyId: string | undefined, weekStart: Date) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await feathersClient.service('timesheets').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timesheets', companyId, weekStart.toISOString()]
      });
    },
  });
}

