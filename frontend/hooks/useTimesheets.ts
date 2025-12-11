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
  company?: {
    _id: string;
    name: string;
  };
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    lineManager?: {
      firstName: string;
      lastName: string;
    };
    project?: {
      name: string;
      client?: {
        name: string;
      };
    };
    department?: string;
    position?: string;
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
  verifiedBy?: string;
  verifiedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export function useTimesheets(companyId?: string, weekStart?: Date) {
  return useQuery({
    queryKey: ['timesheets', companyId, weekStart?.toISOString()],
    queryFn: async () => {
      const query: any = {
        $limit: 500,
        $sort: { weekStartDate: 1 },
        isDeleted: false
      };

      if (companyId) {
        query.company = companyId;
      }

      if (weekStart) {
        // Adjust for timezone differences - expand the search window
        const searchStart = new Date(weekStart);
        searchStart.setDate(searchStart.getDate() - 1); // Day before to catch timezone offsets
        searchStart.setHours(0, 0, 0, 0);

        const searchEnd = new Date(weekStart);
        searchEnd.setDate(searchEnd.getDate() + 7); // Day after to catch timezone offsets
        searchEnd.setHours(23, 59, 59, 999);

        query.weekStartDate = {
          $gte: searchStart.toISOString(),
          $lte: searchEnd.toISOString()
        };
      }

      const response = await feathersClient.service('timesheets').find({ query });
      return (response.data || response) as WeeklyTimesheet[];
    },
  });
}

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await feathersClient.service('timesheets').patch(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}
