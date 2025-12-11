'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useTimesheets, useUpdateTimesheet } from '@/hooks/useTimesheets';
import feathersClient from '@/lib/feathers';
import { API_URL } from '@/lib/config';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

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
  location?: {
    clockIn?: {
      latitude: number;
      longitude: number;
      address: string;
      timestamp: string;
    };
    clockOut?: {
      latitude: number;
      longitude: number;
      address: string;
      timestamp: string;
    };
  };
  notes?: string;
  isAbsent: boolean;
  leaveType?: string; // 'MC', 'AL', 'PH', etc.
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
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  approved_subcon: { label: 'Verified (Subcon)', color: 'bg-yellow-100 text-yellow-800' },
  approved_admin: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  approved: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
};

// Helper function to get Monday of the week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

// Helper function to get day name
function getDayName(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
}

// Helper function to format date for Date constructor (YYYY-MM-DD format)
function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Helper function to format time
function formatTime(timeString: string): string {
  if (!timeString) return '';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Helper function to format time for input fields (HH:MM format)
function formatTimeForInput(timeString: string): string {
  if (!timeString) return '';
  const date = new Date(timeString);
  return date.toTimeString().slice(0, 5); // HH:MM format
}

// Helper to check if a date is a public holiday
// Compare using LOCAL date (not UTC) to handle timezone correctly
function isPublicHoliday(date: Date, holidays: any[]): any | null {
  // Get local date components
  const entryYear = date.getFullYear();
  const entryMonth = date.getMonth();
  const entryDay = date.getDate();

  console.log(`Checking entry: ${entryYear}-${entryMonth + 1}-${entryDay} (${date.toISOString()})`);

  return holidays.find((h: any) => {
    const holidayDate = new Date(h.date);
    const hYear = holidayDate.getFullYear();
    const hMonth = holidayDate.getMonth();
    const hDay = holidayDate.getDate();

    console.log(`  vs Holiday "${h.name}": ${hYear}-${hMonth + 1}-${hDay} (${h.date})`);

    const match = hYear === entryYear && hMonth === entryMonth && hDay === entryDay;
    if (match) console.log(`  ✓ MATCH!`);
    return match;
  });
}

export default function TimesheetsPage() {
  const { selectedCompany } = useCompany();
  // Always start with the current week (Monday of this week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Use TanStack Query hooks
  const { data: weeklyTimesheets = [], isLoading: loading, refetch: refetchTimesheets } = useTimesheets(
    selectedCompany?._id,
    currentWeekStart
  );
  const updateTimesheet = useUpdateTimesheet();

  const [selectedWeeklyTimesheet, setSelectedWeeklyTimesheet] = useState<WeeklyTimesheet | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<any>(null);

  // Dropdown data
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Generate Timesheet Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateWeekStart, setGenerateWeekStart] = useState('');
  const [hourlyWorkers, setHourlyWorkers] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResults, setGenerateResults] = useState<{ created: string[]; skipped: string[] } | null>(null);

  // Public Holidays
  const [publicHolidays, setPublicHolidays] = useState<any[]>([]);

  // Interface for client timesheet settings
  interface TimesheetSettings {
    minuteIncrement: number;
    roundingMethod: 'nearest' | 'up' | 'down';
    maxHoursPerDay: number;
    maxOTHoursPerDay: number;
    allowOvertime: boolean;
  }

  // Default settings if no client settings found
  const defaultSettings: TimesheetSettings = {
    minuteIncrement: 30,
    roundingMethod: 'nearest',
    maxHoursPerDay: 8,
    maxOTHoursPerDay: 4,
    allowOvertime: true
  };

  // Round minutes based on increment and method
  const roundMinutes = (minutes: number, increment: number, method: 'nearest' | 'up' | 'down'): number => {
    if (increment <= 1) return minutes;

    switch (method) {
      case 'up':
        return Math.ceil(minutes / increment) * increment;
      case 'down':
        return Math.floor(minutes / increment) * increment;
      case 'nearest':
      default:
        return Math.round(minutes / increment) * increment;
    }
  };

  // Helper function to calculate hours from timestamps with client settings
  const calculateHoursFromTimestamps = (entry: any, settings: TimesheetSettings = defaultSettings) => {
    console.log('Calculating hours for entry with settings:', settings);

    if (!entry.clockIn || !entry.clockOut) {
      console.log('Missing clockIn or clockOut');
      return { normalHours: 0, ot1_5Hours: 0, ot2_0Hours: 0, totalHours: 0 };
    }

    // Get date string from entry.date for combining with time-only values
    const getDateStr = () => {
      if (entry.date) {
        const d = new Date(entry.date);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      }
      return new Date().toISOString().split('T')[0];
    };
    const dateStr = getDateStr();

    // Parse a time value - can be Date object, ISO string, or time-only string
    const parseTime = (value: any): Date | null => {
      if (!value) return null;

      // If already a Date object (won't happen after JSON serialization, but just in case)
      if (value instanceof Date) return value;

      // Try parsing directly first
      let date = new Date(value);
      if (!isNaN(date.getTime())) {
        console.log(`Parsed "${value}" directly as:`, date.toISOString());
        return date;
      }

      // If it's a time-only string like "08:41:51" or "08:41", combine with date
      if (typeof value === 'string') {
        const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
          const combined = `${dateStr}T${value}`;
          date = new Date(combined);
          if (!isNaN(date.getTime())) {
            console.log(`Parsed time-only "${value}" with date as:`, date.toISOString());
            return date;
          }
        }
      }

      console.warn('Could not parse time value:', value);
      return null;
    };

    // Parse times but normalize to same base date to fix date mismatch issues
    const clockInRaw = parseTime(entry.clockIn);
    const clockOutRaw = parseTime(entry.clockOut);

    console.log('Parsed clockIn raw:', clockInRaw?.toISOString());
    console.log('Parsed clockOut raw:', clockOutRaw?.toISOString());

    // Validate dates
    if (!clockInRaw || !clockOutRaw) {
      console.warn('Failed to parse dates:', { clockIn: entry.clockIn, clockOut: entry.clockOut });
      return { normalHours: 0, ot1_5Hours: 0, ot2_0Hours: 0, totalHours: 0 };
    }

    // Normalize all times to the same base date (entry.date or today)
    // This fixes issues where clockIn/clockOut are stored with different dates
    const baseDate = new Date(dateStr);

    const normalizeToBaseDate = (time: Date): Date => {
      const normalized = new Date(baseDate);
      normalized.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
      return normalized;
    };

    const clockIn = normalizeToBaseDate(clockInRaw);
    const clockOut = normalizeToBaseDate(clockOutRaw);

    console.log('Normalized clockIn:', clockIn.toISOString());
    console.log('Normalized clockOut:', clockOut.toISOString());

    // Handle lunch break - also normalize to same date
    let lunchOut: Date | null = null;
    let lunchIn: Date | null = null;

    if (entry.lunchOut) {
      const raw = parseTime(entry.lunchOut);
      if (raw) lunchOut = normalizeToBaseDate(raw);
    }
    if (entry.lunchIn) {
      const raw = parseTime(entry.lunchIn);
      if (raw) lunchIn = normalizeToBaseDate(raw);
    }

    // Calculate total worked time in minutes
    let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
    console.log('Minutes before lunch:', totalMinutes);

    // Subtract lunch break if both lunch times are provided
    if (lunchOut && lunchIn && lunchIn > lunchOut) {
      const lunchMinutes = (lunchIn.getTime() - lunchOut.getTime()) / (1000 * 60);
      totalMinutes -= lunchMinutes;
    }

    console.log('Minutes after lunch:', totalMinutes);

    // Apply rounding based on settings
    totalMinutes = roundMinutes(totalMinutes, settings.minuteIncrement, settings.roundingMethod);
    console.log('Minutes after rounding:', totalMinutes);

    const totalHours = totalMinutes / 60;
    console.log('Total hours:', totalHours);

    // Calculate normal and overtime hours based on settings
    let normalHours = 0;
    let ot1_5Hours = 0;
    let ot2_0Hours = 0;

    const maxNormal = settings.maxHoursPerDay;
    const maxOT = settings.maxOTHoursPerDay;

    if (totalHours <= maxNormal) {
      normalHours = totalHours;
    } else {
      normalHours = maxNormal;

      // Only calculate OT if allowed
      if (settings.allowOvertime) {
        const otHours = Math.min(totalHours - maxNormal, maxOT);

        // Split OT into 1.5x and 2x rates (first 2 hours at 1.5x, rest at 2x)
        if (otHours <= 2) {
          ot1_5Hours = otHours;
        } else {
          ot1_5Hours = 2;
          ot2_0Hours = otHours - 2;
        }
      }
    }

    const result = {
      normalHours: Math.max(0, normalHours),
      ot1_5Hours: Math.max(0, ot1_5Hours),
      ot2_0Hours: Math.max(0, ot2_0Hours),
      totalHours: Math.max(0, totalHours)
    };

    console.log('Calculation result:', result);
    return result;
  };

  // Fetch current user for role-based permissions
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const auth = await feathersClient.reAuthenticate();
        setUser(auth.user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        if (!selectedCompany) return;

        // Fetch projects
        const projectsData = await feathersClient.service('projects').find({
          query: { company: selectedCompany._id }
        });
        setProjects(projectsData.data || []);

        // Fetch clients
        const clientsData = await feathersClient.service('clients').find({
          query: { company: selectedCompany._id }
        });
        setClients(clientsData.data || []);

        // Fetch supervisors (workers with supervisor role)
        const supervisorsData = await feathersClient.service('workers').find({
          query: { company: selectedCompany._id, role: 'supervisor' }
        });
        setSupervisors(supervisorsData.data || []);

        // Fetch tasks
        const tasksData = await feathersClient.service('tasks').find({
          query: { company: selectedCompany._id }
        });
        setTasks(tasksData.data || []);

        // Fetch public holidays for the current year
        const year = new Date().getFullYear();
        try {
          const holidaysData = await feathersClient.service('gazetted-holidays').find({
            query: {
              company: selectedCompany._id,
              year: year,
              isActive: true,
              $limit: 100
            }
          });
          const holidays = holidaysData.data || holidaysData || [];
          console.log('Loaded public holidays:', holidays);
          setPublicHolidays(holidays);
        } catch (err) {
          console.error('Error fetching holidays:', err);
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, [selectedCompany]);

  const handleViewWorkerWeek = async (weeklyTimesheet: WeeklyTimesheet) => {
    // Clone and calculate hours for display
    const clonedTimesheet = JSON.parse(JSON.stringify(weeklyTimesheet));

    // Ensure dailyEntries exists
    if (!clonedTimesheet.dailyEntries || !Array.isArray(clonedTimesheet.dailyEntries)) {
      console.warn('No dailyEntries found in timesheet');
      setSelectedWeeklyTimesheet(clonedTimesheet);
      setShowModal(true);
      return;
    }

    // Fetch holidays for THIS timesheet's company (not selectedCompany)
    const timesheetCompanyId = typeof clonedTimesheet.company === 'object'
      ? clonedTimesheet.company._id
      : clonedTimesheet.company;

    let timesheetHolidays: any[] = [];
    try {
      const year = new Date().getFullYear();
      const holidaysData = await feathersClient.service('gazetted-holidays').find({
        query: {
          company: timesheetCompanyId,
          year: year,
          isActive: true,
          $limit: 100
        }
      });
      timesheetHolidays = holidaysData.data || holidaysData || [];
      console.log('Fetched holidays for timesheet company:', timesheetCompanyId, timesheetHolidays);
    } catch (err) {
      console.error('Error fetching holidays for timesheet:', err);
    }

    // Try to get client settings from the worker's project
    let settings: TimesheetSettings = { ...defaultSettings };
    try {
      // Get the worker to find their project
      const worker = clonedTimesheet.worker;
      if (worker?.project) {
        const projectId = typeof worker.project === 'object' ? worker.project._id : worker.project;
        if (projectId) {
          const project = await feathersClient.service('projects').get(projectId);
          if (project?.client) {
            const clientId = typeof project.client === 'object' ? project.client._id : project.client;
            if (clientId) {
              const client = await feathersClient.service('clients').get(clientId);
              if (client?.timesheetSettings) {
                settings = {
                  minuteIncrement: client.timesheetSettings.minuteIncrement || 30,
                  roundingMethod: client.timesheetSettings.roundingMethod || 'nearest',
                  maxHoursPerDay: client.timesheetSettings.maxHoursPerDay || 8,
                  maxOTHoursPerDay: client.timesheetSettings.maxOTHoursPerDay || 4,
                  allowOvertime: client.timesheetSettings.allowOvertime !== false
                };
                console.log('Using client timesheet settings:', settings);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch client settings, using defaults:', error);
    }

    // Auto-calculate hours for all entries that have clock times
    // Also check for public holidays using the timesheet's company holidays
    clonedTimesheet.dailyEntries = clonedTimesheet.dailyEntries.map((entry: any) => {
      const entryDate = new Date(entry.date);
      const holiday = isPublicHoliday(entryDate, timesheetHolidays);

      // If it's a public holiday, mark as PH
      if (holiday && !entry.leaveType) {
        return {
          ...entry,
          isAbsent: true,
          leaveType: 'PH',
          notes: holiday.name || 'Public Holiday',
          normalHours: 0,
          ot1_5Hours: 0,
          ot2_0Hours: 0,
          totalHours: 0
        };
      }

      // Check if clockIn and clockOut exist and are truthy
      if (entry.clockIn && entry.clockOut) {
        const calculated = calculateHoursFromTimestamps(entry, settings);
        return {
          ...entry,
          normalHours: calculated.normalHours,
          ot1_5Hours: calculated.ot1_5Hours,
          ot2_0Hours: calculated.ot2_0Hours,
          totalHours: calculated.totalHours
        };
      }
      // Ensure default values for entries without clock data
      return {
        ...entry,
        normalHours: entry.normalHours || 0,
        ot1_5Hours: entry.ot1_5Hours || 0,
        ot2_0Hours: entry.ot2_0Hours || 0,
        totalHours: entry.totalHours || 0
      };
    });

    // Recalculate totals
    clonedTimesheet.totalNormalHours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.normalHours || 0), 0);
    clonedTimesheet.totalOT1_5Hours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot1_5Hours || 0), 0);
    clonedTimesheet.totalOT2_0Hours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot2_0Hours || 0), 0);
    clonedTimesheet.totalHours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0);

    setSelectedWeeklyTimesheet(clonedTimesheet);
    setShowModal(true);
  };

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleCurrentWeek = () => {
    // Go to the current week (this week's Monday)
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Check if we're viewing the current week
  const isCurrentWeek = () => {
    const currentMonday = getMonday(new Date());
    return currentWeekStart.toDateString() === currentMonday.toDateString();
  };

  // Open Generate Timesheet Modal
  const openGenerateModal = async () => {
    // Set default week to current week
    const monday = getMonday(new Date());
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const day = String(monday.getDate()).padStart(2, '0');
    setGenerateWeekStart(`${year}-${month}-${day}`);
    setSelectedWorkers([]);
    setGenerateResults(null);

    // Fetch hourly workers
    try {
      const workersResponse = await feathersClient.service('workers').find({
        query: {
          company: selectedCompany?._id,
          paymentType: { $in: ['hourly', 'unit-based'] },
          $limit: 500
        }
      });
      setHourlyWorkers(workersResponse.data || workersResponse || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }

    setShowGenerateModal(true);
  };

  // Get week end date from start date
  const getWeekEndFromStart = (startDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle worker selection toggle
  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  // Select all workers
  const selectAllWorkers = () => {
    setSelectedWorkers(hourlyWorkers.map(w => w._id));
  };

  // Deselect all workers
  const deselectAllWorkers = () => {
    setSelectedWorkers([]);
  };

  // Handle Generate Timesheets submission
  const handleGenerateTimesheets = async () => {
    if (!generateWeekStart || selectedWorkers.length === 0) {
      alert('Please select a week and at least one employee');
      return;
    }

    setIsGenerating(true);
    setGenerateResults(null);

    const created: string[] = [];
    const skipped: string[] = [];

    const weekStart = new Date(generateWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Generate empty daily entries
    const generateDailyEntries = () => {
      const entries = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        entries.push({
          date: date.toISOString(),
          dayOfWeek: days[i],
          clockIn: null,
          clockOut: null,
          lunchOut: null,
          lunchIn: null,
          normalHours: 0,
          ot1_5Hours: 0,
          ot2_0Hours: 0,
          totalHours: 0,
          checkInMethod: 'manual',
          notes: null,
          isAbsent: false,
          leaveType: null
        });
      }
      return entries;
    };

    for (const workerId of selectedWorkers) {
      const worker = hourlyWorkers.find(w => w._id === workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : workerId;

      try {
        // Check if timesheet already exists
        const existingResponse = await feathersClient.service('timesheets').find({
          query: {
            company: selectedCompany?._id,
            worker: workerId,
            weekStartDate: weekStart.toISOString(),
            $limit: 1
          }
        });

        const existing = existingResponse.data || existingResponse;
        if (existing.length > 0) {
          skipped.push(workerName);
          continue;
        }

        // Create new timesheet
        await feathersClient.service('timesheets').create({
          company: selectedCompany?._id,
          worker: workerId,
          weekStartDate: weekStart.toISOString(),
          weekEndDate: weekEnd.toISOString(),
          dailyEntries: generateDailyEntries(),
          totalNormalHours: 0,
          totalOT1_5Hours: 0,
          totalOT2_0Hours: 0,
          totalHours: 0,
          status: 'draft'
        });

        created.push(workerName);
      } catch (error: any) {
        console.error(`Error creating timesheet for ${workerName}:`, error);
        skipped.push(`${workerName} (error)`);
      }
    }

    setGenerateResults({ created, skipped });
    setIsGenerating(false);

    // Refresh the timesheets list if we created any for the current week
    if (created.length > 0) {
      // Trigger refetch by updating the week
      const newWeekStart = new Date(generateWeekStart);
      setCurrentWeekStart(getMonday(newWeekStart));
    }
  };

  const handleGeneratePDF = (timesheet: WeeklyTimesheet) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('feathers-jwt');

    if (!token) {
      alert('Please log in to generate PDF');
      return;
    }

    // Open PDF in new tab with token in URL
    const pdfUrl = `/api/timesheets/${timesheet._id}/pdf?token=${encodeURIComponent(token)}`;
    window.open(pdfUrl, '_blank');
  };

  // Helper to calculate total hours for a timesheet (for table display)
  const calculateTimesheetHours = (timesheet: WeeklyTimesheet) => {
    let totalNormal = 0;
    let totalOT1_5 = 0;
    let totalOT2_0 = 0;
    let totalHrs = 0;

    if (!timesheet.dailyEntries) return { totalNormal, totalOT1_5, totalOT2_0, totalHrs };

    for (const entry of timesheet.dailyEntries) {
      if (entry.clockIn && entry.clockOut) {
        const calculated = calculateHoursFromTimestamps(entry);
        totalNormal += calculated.normalHours;
        totalOT1_5 += calculated.ot1_5Hours;
        totalOT2_0 += calculated.ot2_0Hours;
        totalHrs += calculated.totalHours;
      }
    }

    return { totalNormal, totalOT1_5, totalOT2_0, totalHrs };
  };

  const pendingCount = weeklyTimesheets.filter(t => t.status === 'draft' || t.status === 'submitted').length;
  const verifiedCount = weeklyTimesheets.filter(t => t.status === 'verified' || t.status === 'approved_admin' || t.status === 'approved').length;

  // Calculate total hours across all timesheets
  const totalHours = weeklyTimesheets.reduce((sum, t) => {
    const calc = calculateTimesheetHours(t as any);
    return sum + calc.totalHrs;
  }, 0);

  // Handler functions for admin actions
  const handleEditTimesheet = (timesheet: any) => {
    // Deep clone the timesheet
    const clonedTimesheet = JSON.parse(JSON.stringify(timesheet));

    // Auto-calculate hours for all entries that have clock times
    clonedTimesheet.dailyEntries = clonedTimesheet.dailyEntries.map((entry: any) => {
      if (entry.clockIn && entry.clockOut) {
        const calculated = calculateHoursFromTimestamps(entry);
        return {
          ...entry,
          normalHours: calculated.normalHours,
          ot1_5Hours: calculated.ot1_5Hours,
          ot2_0Hours: calculated.ot2_0Hours,
          totalHours: calculated.totalHours
        };
      }
      return entry;
    });

    // Recalculate totals
    clonedTimesheet.totalNormalHours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.normalHours || 0), 0);
    clonedTimesheet.totalOT1_5Hours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot1_5Hours || 0), 0);
    clonedTimesheet.totalOT2_0Hours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot2_0Hours || 0), 0);
    clonedTimesheet.totalHours = clonedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0);

    setEditingTimesheet(clonedTimesheet);
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!user) {
        alert('Please log in to save changes');
        return;
      }

      console.log('Saving timesheet with user:', user);
      console.log('Editing timesheet:', editingTimesheet);

      // Prepare the update data
      const updateData: any = {
        dailyEntries: editingTimesheet.dailyEntries,
        totalNormalHours: editingTimesheet.totalNormalHours,
        totalOT1_5Hours: editingTimesheet.totalOT1_5Hours,
        totalOT2_0Hours: editingTimesheet.totalOT2_0Hours,
        totalHours: editingTimesheet.totalHours
      };

      // Only include task if it's changed
      if (editingTimesheet.task?._id) {
        updateData.task = editingTimesheet.task._id;
      }

      console.log('Update data:', updateData);

      // Update the timesheet via FeathersJS client
      const updatedTimesheet = await feathersClient.service('timesheets').patch(editingTimesheet._id, updateData) as unknown as WeeklyTimesheet;

      console.log('Updated timesheet:', updatedTimesheet);

      // Update the selected timesheet with the saved data (stay in modal)
      setSelectedWeeklyTimesheet(updatedTimesheet);
      setEditingTimesheet(updatedTimesheet); // Keep editing with fresh data
      setIsEditMode(false);

      // Show success message (brief toast-style)
      alert('✅ Timesheet saved successfully!');

      // Invalidate the query to refresh the list in the background
      // The modal stays open with the updated data
    } catch (error: any) {
      console.error('Error updating timesheet:', error);
      alert(`Failed to update timesheet: ${error.message || 'Please try again.'}`);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingTimesheet(null);
  };

  const handleEditFieldChange = (dayIndex: number, field: string, value: any) => {
    if (!editingTimesheet) return;

    console.log(`Editing field: ${field}, dayIndex: ${dayIndex}, value:`, value);

    const updatedTimesheet = { ...editingTimesheet };
    updatedTimesheet.dailyEntries[dayIndex][field] = value;

    const entry = updatedTimesheet.dailyEntries[dayIndex];

    // Auto-calculate hours when timestamps change
    if (['clockIn', 'clockOut', 'lunchOut', 'lunchIn'].includes(field)) {
      console.log('Calculating hours for entry:', entry);
      const calculatedHours = calculateHoursFromTimestamps(entry);
      console.log('Calculated hours:', calculatedHours);
      entry.normalHours = calculatedHours.normalHours;
      entry.ot1_5Hours = calculatedHours.ot1_5Hours;
      entry.ot2_0Hours = calculatedHours.ot2_0Hours;
      entry.totalHours = calculatedHours.totalHours;
    } else if (['normalHours', 'ot1_5Hours', 'ot2_0Hours'].includes(field)) {
      // Manual hour entry - recalculate total
      entry.totalHours = (entry.normalHours || 0) + (entry.ot1_5Hours || 0) + (entry.ot2_0Hours || 0);
    }

    // Recalculate week totals
    updatedTimesheet.totalNormalHours = updatedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.normalHours || 0), 0);
    updatedTimesheet.totalOT1_5Hours = updatedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot1_5Hours || 0), 0);
    updatedTimesheet.totalOT2_0Hours = updatedTimesheet.dailyEntries.reduce((sum: number, e: any) => sum + (e.ot2_0Hours || 0), 0);
    updatedTimesheet.totalHours = updatedTimesheet.totalNormalHours + updatedTimesheet.totalOT1_5Hours + updatedTimesheet.totalOT2_0Hours;

    console.log('Updated timesheet:', updatedTimesheet);
    setEditingTimesheet(updatedTimesheet);
  };

  const handleVerifyTimesheet = async (timesheetId: string) => {
    try {
      const token = localStorage.getItem('feathers-jwt');
      const response = await fetch(`${API_URL}/timesheets/${timesheetId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments: 'Verified via dashboard' })
      });

      if (response.ok) {
        alert('✅ Timesheet verified successfully!');
        // Refresh the data
        refetchTimesheets();
        setShowModal(false);
      } else {
        const error = await response.text();
        alert(`❌ Failed to approve: ${error}`);
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
      alert('❌ Error approving timesheet');
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/timesheets/${timesheetId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason })
      });

      if (response.ok) {
        alert('❌ Timesheet rejected successfully!');
        // Refresh the data
        refetchTimesheets();
        setShowModal(false);
      } else {
        const error = await response.text();
        alert(`❌ Failed to reject: ${error}`);
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      alert('❌ Error rejecting timesheet');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-600 mt-2">Weekly timesheet view with billing details</p>
        </div>
        {/* Generate Timesheet Button - Only for Agent/Subcon */}
        {user && ['admin', 'agent', 'subcon-admin'].includes(user.role) && (
          <button
            onClick={openGenerateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <CalendarDaysIcon className="h-5 w-5" />
            Generate Timesheets
          </button>
        )}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
        <button
          onClick={handlePreviousWeek}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
        >
          ← Previous Week
        </button>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {currentWeekStart.toLocaleDateString('en-MY', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' - '}
            {new Date(currentWeekStart.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-MY', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {isCurrentWeek() ? (
            <span className="text-sm text-green-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Current Week
            </span>
          ) : (
            <button
              onClick={handleCurrentWeek}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-1"
            >
              ← Go to Current Week
            </button>
          )}
        </div>
        <button
          onClick={handleNextWeek}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
        >
          Next Week →
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Workers</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{weeklyTimesheets.length}</p>
            </div>
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-gray-300" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Pending</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{pendingCount}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-300" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Verified</p>
              <p className="text-xl font-bold text-green-900 mt-1">{verifiedCount}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-300" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm border border-purple-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">Total Hours</p>
              <p className="text-xl font-bold text-purple-900 mt-1">{totalHours.toFixed(1)}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-300" />
          </div>
        </div>
      </div>



      {/* Timesheets List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status Summary
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {weeklyTimesheets.map((weeklyTimesheet) => {
              const totalDays = weeklyTimesheet.dailyEntries.filter(d => !d.isAbsent).length;
              // Calculate hours on the fly for display
              const calcHours = calculateTimesheetHours(weeklyTimesheet as any);

              return (
                <tr key={weeklyTimesheet._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-bold text-lg">
                          {weeklyTimesheet.worker?.firstName?.[0]}{weeklyTimesheet.worker?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-base font-semibold text-gray-900">
                          {weeklyTimesheet.worker?.firstName} {weeklyTimesheet.worker?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{weeklyTimesheet.worker?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(weeklyTimesheet.weekStartDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(weeklyTimesheet.weekEndDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">{totalDays} days logged</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-base font-bold text-gray-900">{calcHours.totalHrs.toFixed(1)}h</div>
                    <div className="text-xs text-gray-500">Normal: {calcHours.totalNormal.toFixed(1)}h</div>
                    {calcHours.totalOT1_5 > 0 && (
                      <div className="text-xs text-yellow-600">OT 1.5x: {calcHours.totalOT1_5.toFixed(1)}h</div>
                    )}
                    {calcHours.totalOT2_0 > 0 && (
                      <div className="text-xs text-orange-600">OT 2.0x: {calcHours.totalOT2_0.toFixed(1)}h</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[weeklyTimesheet.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusConfig[weeklyTimesheet.status as keyof typeof statusConfig]?.label || weeklyTimesheet.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleViewWorkerWeek(weeklyTimesheet)}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View
                      </button>
                      {weeklyTimesheet.status === 'draft' && ['admin', 'agent', 'subcon-admin'].includes(user?.role) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerifyTimesheet(weeklyTimesheet._id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                        >
                          <CheckCircleIcon className="h-3 w-3" />
                          Verify
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {weeklyTimesheets.length === 0 && (
          <div className="text-center py-12">
            <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No timesheets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No timesheets for this week.
            </p>
          </div>
        )}
      </div>

      {/* View Worker Week Modal */}
      {showModal && selectedWeeklyTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white">Weekly Time Sheet</h2>
                <p className="text-sm text-indigo-100 mt-0.5">
                  {selectedWeeklyTimesheet.worker?.firstName} {selectedWeeklyTimesheet.worker?.lastName} - {selectedWeeklyTimesheet.worker?.employeeId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF(selectedWeeklyTimesheet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-sm transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-indigo-100 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Company Name */}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600">{selectedWeeklyTimesheet.company?.name || 'Company'}</p>
              </div>

              {/* Employee Info Grid - Compact */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Employee Name:</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedWeeklyTimesheet.worker?.firstName} {selectedWeeklyTimesheet.worker?.lastName}</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16">EmpID:</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedWeeklyTimesheet.worker?.employeeId}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Supervisor:</span>
                      {isEditMode ? (
                        <select
                          value={editingTimesheet?.worker?.lineManager?._id || ''}
                          onChange={(e) => {
                            const supervisor = supervisors.find(s => s._id === e.target.value);
                            setEditingTimesheet((prev: WeeklyTimesheet | null) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                worker: {
                                  ...prev.worker,
                                  lineManager: supervisor || undefined
                                }
                              };
                            });
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                        >
                          <option value="">Select Supervisor</option>
                          {supervisors.map(supervisor => (
                            <option key={supervisor._id} value={supervisor._id}>
                              {supervisor.firstName} {supervisor.lastName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">
                          {selectedWeeklyTimesheet.worker?.lineManager
                            ? `${selectedWeeklyTimesheet.worker.lineManager.firstName} ${selectedWeeklyTimesheet.worker.lineManager.lastName}`
                            : '-'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16">Location:</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editingTimesheet?.worker?.department || ''}
                          onChange={(e) => {
                            setEditingTimesheet((prev: WeeklyTimesheet | null) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                worker: {
                                  ...prev.worker,
                                  department: e.target.value
                                }
                              };
                            });
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                          placeholder="Enter location"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{selectedWeeklyTimesheet.worker?.department || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Client:</span>
                      {isEditMode ? (
                        <select
                          value={editingTimesheet?.worker?.project?.client?._id || ''}
                          onChange={(e) => {
                            const client = clients.find(c => c._id === e.target.value);
                            setEditingTimesheet((prev: WeeklyTimesheet | null) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                worker: {
                                  ...prev.worker,
                                  project: {
                                    ...prev.worker?.project,
                                    client: client || undefined
                                  }
                                }
                              };
                            });
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                        >
                          <option value="">Select Client</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">{selectedWeeklyTimesheet.worker?.project?.client?.name || '-'}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-16">Project:</span>
                      {isEditMode ? (
                        <select
                          value={editingTimesheet?.worker?.project?._id || ''}
                          onChange={(e) => {
                            const project = projects.find(p => p._id === e.target.value);
                            setEditingTimesheet((prev: WeeklyTimesheet | null) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                worker: {
                                  ...prev.worker,
                                  project: project || undefined
                                }
                              };
                            });
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                        >
                          <option value="">Select Project</option>
                          {projects.map(project => (
                            <option key={project._id} value={project._id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">{selectedWeeklyTimesheet.worker?.project?.name || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Weekly Time Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-16">Task</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-12">Day</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Date</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Start</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Lunch Out</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Lunch In</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">End</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-16">Regular</th>
                      <th className="border-b border-r border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-12">OT</th>
                      <th className="border-b border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-center w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet)?.dailyEntries?.map((dayEntry: DailyEntry, index: number) => {
                      const isLeaveDay = dayEntry.leaveType || (dayEntry.isAbsent && !dayEntry.clockIn);
                      const leaveLabel = dayEntry.leaveType || (isLeaveDay ? 'Absent' : '');
                      const isPH = dayEntry.leaveType === 'PH';
                      const isMC = dayEntry.leaveType === 'MC';

                      return (
                        <tr
                          key={index}
                          className={`${isPH ? 'bg-red-50' : isMC ? 'bg-blue-50' : isLeaveDay ? 'bg-amber-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}
                        >
                          <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                            {isEditMode && index === 0 ? (
                              <select
                                value={editingTimesheet?.task?._id || ''}
                                onChange={(e) => {
                                  const task = tasks.find(t => t._id === e.target.value);
                                  setEditingTimesheet((prev: WeeklyTimesheet | null) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      task: task || undefined
                                    };
                                  });
                                }}
                                className="w-full text-xs border border-gray-300 rounded px-1 py-0.5"
                              >
                                <option value="">Select Task</option>
                                {tasks.map(task => (
                                  <option key={task._id} value={task._id}>
                                    {task.taskId} - {task.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-gray-900">{(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).task?.taskId || '-'}</span>
                                <span className="text-[9px] text-gray-500 mt-0.5">{(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).task?.name || 'No Task'}</span>
                              </div>
                            )}
                          </td>
                          <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-900 text-center">
                            {dayEntry.dayOfWeek}
                          </td>
                          <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                            {formatDate(dayEntry.date)}
                          </td>

                          {isLeaveDay ? (
                            <>
                              <td colSpan={4} className="border-b border-r border-gray-200 px-2 py-1.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-md font-semibold text-xs ${
                                  isPH ? 'bg-red-200 text-red-900' :
                                  isMC ? 'bg-blue-200 text-blue-900' :
                                  'bg-amber-200 text-amber-900'
                                }`}>
                                  {leaveLabel}
                                </span>
                                {isPH && dayEntry.notes && (
                                  <span className="block text-[10px] text-red-600 mt-0.5">{dayEntry.notes}</span>
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                              <td className="border-b border-gray-200 px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                            </>
                          ) : (
                            <>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.clockIn ? formatTimeForInput(dayEntry.clockIn) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'clockIn', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.clockIn ? formatTime(dayEntry.clockIn) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.lunchOut ? formatTimeForInput(dayEntry.lunchOut) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'lunchOut', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.lunchOut ? formatTime(dayEntry.lunchOut) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.lunchIn ? formatTimeForInput(dayEntry.lunchIn) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'lunchIn', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.lunchIn ? formatTime(dayEntry.lunchIn) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="time"
                                    value={dayEntry.clockOut ? formatTimeForInput(dayEntry.clockOut) : ''}
                                    onChange={(e) => handleEditFieldChange(index, 'clockOut', e.target.value ? new Date(`${formatDateForInput(dayEntry.date)} ${e.target.value}`) : null)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.clockOut ? formatTime(dayEntry.clockOut) : '-'
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-900 text-center">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="24"
                                    value={dayEntry.normalHours || 0}
                                    onChange={(e) => handleEditFieldChange(index, 'normalHours', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.normalHours.toFixed(1)
                                )}
                              </td>
                              <td className="border-b border-r border-gray-200 px-2 py-1.5 text-xs font-semibold text-amber-700 text-center">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="24"
                                    value={dayEntry.ot1_5Hours || 0}
                                    onChange={(e) => handleEditFieldChange(index, 'ot1_5Hours', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 text-center"
                                  />
                                ) : (
                                  dayEntry.ot1_5Hours > 0 ? dayEntry.ot1_5Hours.toFixed(1) : '-'
                                )}
                              </td>
                              <td className="border-b border-gray-200 px-2 py-1.5 text-xs font-bold text-indigo-900 text-center">
                                {dayEntry.totalHours.toFixed(1)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-gradient-to-r from-indigo-50 to-indigo-100 font-bold border-t-2 border-indigo-200">
                      <td colSpan={7} className="border-r border-gray-200 px-3 py-2 text-xs text-gray-700 text-right uppercase tracking-wide">
                        Total Hours Worked
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-sm text-gray-900 text-center">
                        {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).totalNormalHours.toFixed(1)}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-sm text-amber-700 text-center">
                        {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).totalOT1_5Hours.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-base text-indigo-900 text-center">
                        {(isEditMode ? editingTimesheet : selectedWeeklyTimesheet).totalHours.toFixed(1)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status and Week Info */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[selectedWeeklyTimesheet.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {statusConfig[selectedWeeklyTimesheet.status as keyof typeof statusConfig]?.label || selectedWeeklyTimesheet.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Week: {new Date(selectedWeeklyTimesheet.weekStartDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })} - {new Date(selectedWeeklyTimesheet.weekEndDate).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                {/* Status and Action Buttons */}
                <div className="flex items-center gap-3">
                  {/* Show Edit/Verify buttons for admin/agent/subcon-admin */}
                  {(user?.role === 'admin' || user?.role === 'agent' || user?.role === 'subcon-admin') && (
                    <>
                      {isEditMode ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {selectedWeeklyTimesheet.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleEditTimesheet(selectedWeeklyTimesheet)}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleVerifyTimesheet(selectedWeeklyTimesheet._id)}
                                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium transition-colors"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleRejectTimesheet(selectedWeeklyTimesheet._id)}
                                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(selectedWeeklyTimesheet.status === 'approved' || selectedWeeklyTimesheet.status === 'verified') && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                              ✅ Verified
                            </span>
                          )}
                          {selectedWeeklyTimesheet.status === 'rejected' && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                              ❌ Rejected
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEditMode(false);
                      setEditingTimesheet(null);
                    }}
                    className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Timesheet Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Generate Timesheets</h2>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-indigo-100 text-sm mt-1">
                Create empty weekly timesheets for hourly employees
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Week Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Week (Starting Monday)
                </label>
                <input
                  type="date"
                  value={generateWeekStart}
                  onChange={(e) => {
                    // Ensure we always select a Monday
                    const date = new Date(e.target.value);
                    const monday = getMonday(date);
                    const year = monday.getFullYear();
                    const month = String(monday.getMonth() + 1).padStart(2, '0');
                    const day = String(monday.getDate()).padStart(2, '0');
                    setGenerateWeekStart(`${year}-${month}-${day}`);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {generateWeekStart && (
                  <p className="mt-2 text-sm text-gray-500">
                    Week: <span className="font-medium text-gray-700">
                      {new Date(generateWeekStart).toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' - '}
                      {getWeekEndFromStart(generateWeekStart)}
                    </span>
                  </p>
                )}
              </div>

              {/* Employee Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Employees (Hourly/Unit-Based)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllWorkers}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllWorkers}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {hourlyWorkers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>No hourly/unit-based employees found</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {hourlyWorkers.map((worker) => (
                      <label
                        key={worker._id}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          selectedWorkers.includes(worker._id) ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkers.includes(worker._id)}
                          onChange={() => toggleWorkerSelection(worker._id)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {worker.firstName} {worker.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {worker.employeeId || 'No ID'} • {worker.paymentType === 'hourly' ? 'Hourly' : 'Unit-Based'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-sm text-gray-500">
                  {selectedWorkers.length} of {hourlyWorkers.length} employees selected
                </p>
              </div>

              {/* Results */}
              {generateResults && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Results</h4>
                  {generateResults.created.length > 0 && (
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        ✅ Created ({generateResults.created.length}):
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {generateResults.created.join(', ')}
                      </p>
                    </div>
                  )}
                  {generateResults.skipped.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">
                        ⚠️ Skipped - Already exists ({generateResults.skipped.length}):
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {generateResults.skipped.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex items-center justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                {generateResults ? 'Close' : 'Cancel'}
              </button>
              {!generateResults && (
                <button
                  onClick={handleGenerateTimesheets}
                  disabled={isGenerating || selectedWorkers.length === 0 || !generateWeekStart}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-5 w-5" />
                      Generate Timesheets
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

