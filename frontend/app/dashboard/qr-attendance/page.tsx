'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';
import { useDepartments } from '@/hooks/useDepartments';
import LocationPicker from '@/components/LocationPicker';
import { QrCodeIcon, PlusIcon, TrashIcon, ShareIcon, DocumentArrowDownIcon, CalendarIcon, UserGroupIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';
import QRCode from 'react-qr-code';

// Helper function to get local date in YYYY-MM-DD format (avoids timezone issues with toISOString)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'subcon-admin' | 'worker' | 'user';
  company?: string;
}

interface QRCodeData {
  _id: string;
  name: string;
  qrCode: string;
  location?: string;
  department?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  allowedRadius?: number;
  isActive: boolean;
  createdAt: Date;
  usageCount?: number;
  rotation?: {
    enabled: boolean;
    interval: string;
    lastRotated?: Date;
  };
}

interface AttendanceRecord {
  _id: string;
  worker: any;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  lunchOut?: Date;
  lunchIn?: Date;
  status: 'present' | 'late' | 'absent' | 'not-checked-in';
  checkInMethod?: string;
  qrCodeUsed?: string;
}

export default function QRAttendancePage() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?._id;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'qr-codes' | 'attendance' | 'reports'>('qr-codes');
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([]);
  const [attendanceData, setAttendanceData] = useState({
    present: 0,
    late: 0,
    absent: 0,
    notCheckedIn: 0,
    total: 0,
    records: [] as AttendanceRecord[]
  });
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(true);
  const [showAddQRModal, setShowAddQRModal] = useState(false);

  // Fetch departments for the selected company
  const { data: departments = [] } = useDepartments(companyId, { isActive: true });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && companyId) {
      fetchQRCodes();
      fetchAttendanceData();
    }
  }, [currentUser, selectedDate, companyId]);

  const fetchCurrentUser = async () => {
    try {
      const auth = await feathersClient.get('authentication');
      if (auth && auth.user) {
        setCurrentUser(auth.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchQRCodes = async () => {
    try {
      if (!companyId) return;

      // Fetch QR codes from the qr-codes service
      const response = await feathersClient.service('qr-codes').find({
        query: {
          company: companyId,
          $limit: 100,
          $sort: { createdAt: -1 }
        }
      });

      const qrCodesArray = response.data || response || [];
      setQRCodes(qrCodesArray);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      // Fallback to company's main QR code if service doesn't exist
      try {
        const company = await feathersClient.service('companies').get(companyId);
        const qrCodesArray: QRCodeData[] = [];

        if (company.qrCodeSettings?.qrCode) {
          qrCodesArray.push({
            _id: 'main',
            name: 'Main QR Code',
            qrCode: company.qrCodeSettings.qrCode,
            location: 'Main Office',
            isActive: company.qrCodeSettings.enabled || false,
            createdAt: company.qrCodeSettings.qrCodeGeneratedAt || new Date(),
            usageCount: 0
          });
        }
        setQRCodes(qrCodesArray);
      } catch (e) {
        console.error('Error fetching company QR:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      if (!companyId) return;

      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      // Calculate attendance stats
      let present = 0;
      let late = 0;
      let absent = 0;
      const attendanceRecords: AttendanceRecord[] = [];
      const workerIdsWithRecords = new Set<string>();

      // Fetch attendance records (for monthly workers)
      try {
        const attendanceResult = await feathersClient.service('attendance').find({
          query: {
            company: companyId,
            date: {
              $gte: selectedDateObj.toISOString(),
              $lt: nextDay.toISOString()
            },
            $limit: 100
          }
        });

        const attendanceList = attendanceResult.data || attendanceResult || [];
        console.log('Attendance records found:', attendanceList.length);

        // Process attendance records
        for (const record of attendanceList) {
          // Fetch worker info if not populated
          let worker = record.worker;
          if (typeof worker === 'string') {
            try {
              worker = await feathersClient.service('workers').get(worker);
            } catch (e) {
              console.log('Could not fetch worker:', worker);
            }
          }

          let status: 'present' | 'late' | 'absent' | 'not-checked-in' = 'not-checked-in';

          if (record.status === 'absent') {
            status = 'absent';
            absent++;
          } else if (record.clockIn) {
            status = 'present';
            present++;

            // Check if late (after 9:15 AM)
            const clockIn = new Date(record.clockIn);
            const lateThreshold = new Date(selectedDateObj);
            lateThreshold.setHours(9, 15, 0, 0);
            if (clockIn > lateThreshold) {
              status = 'late';
              late++;
              present--; // Correct the count
            }
          }

          attendanceRecords.push({
            _id: record._id,
            worker: worker,
            date: record.date,
            clockIn: record.clockIn,
            clockOut: record.clockOut,
            lunchOut: record.lunchOut,
            lunchIn: record.lunchIn,
            status,
            checkInMethod: record.checkInMethod,
            qrCodeUsed: record.qrCodeData
          });

          // Track worker IDs to avoid duplicates from timesheets
          const workerId = typeof record.worker === 'string' ? record.worker : record.worker?._id;
          if (workerId) workerIdsWithRecords.add(workerId.toString());
        }
      } catch (e) {
        console.log('Error fetching attendance records:', e);
      }

      // Fetch timesheets for selected date (for hourly workers)
      try {
        const timesheets = await feathersClient.service('timesheets').find({
          query: {
            company: companyId,
            'dailyEntries.date': {
              $gte: selectedDateObj.toISOString(),
              $lt: nextDay.toISOString()
            },
            $populate: 'worker',
            $limit: 100
          }
        });

        const records = timesheets.data || timesheets || [];

        records.forEach((timesheet: any) => {
          // Skip if we already have an attendance record for this worker
          const workerId = typeof timesheet.worker === 'string' ? timesheet.worker : timesheet.worker?._id;
          if (workerId && workerIdsWithRecords.has(workerId.toString())) {
            return;
          }

          const todayEntry = timesheet.dailyEntries?.find((entry: any) => {
            const entryDate = new Date(entry.date);
            return entryDate >= selectedDateObj && entryDate < nextDay;
          });

          if (todayEntry) {
            let status: 'present' | 'late' | 'absent' | 'not-checked-in' = 'not-checked-in';

            if (todayEntry.isAbsent) {
              status = 'absent';
              absent++;
            } else if (todayEntry.clockIn) {
              status = 'present';
              present++;

              // Check if late (after 9:15 AM)
              const clockIn = new Date(todayEntry.clockIn);
              const lateThreshold = new Date(selectedDateObj);
              lateThreshold.setHours(9, 15, 0, 0);
              if (clockIn > lateThreshold) {
                status = 'late';
                late++;
                present--;
              }
            }

            attendanceRecords.push({
              _id: timesheet._id,
              worker: timesheet.worker,
              date: todayEntry.date,
              clockIn: todayEntry.clockIn,
              clockOut: todayEntry.clockOut,
              lunchOut: todayEntry.lunchOut,
              lunchIn: todayEntry.lunchIn,
              status,
              checkInMethod: todayEntry.checkInMethod,
              qrCodeUsed: todayEntry.qrCodeCheckIn?.qrCodeData
            });

            if (workerId) workerIdsWithRecords.add(workerId.toString());
          }
        });
      } catch (e) {
        console.log('Error fetching timesheets:', e);
      }

      // Get total workers
      const workers = await feathersClient.service('workers').find({
        query: {
          company: companyId,
          isActive: true,
          $limit: 0
        }
      });

      const total = workers.total || 0;
      const notCheckedIn = total - present - late - absent;

      setAttendanceData({
        present,
        late,
        absent,
        notCheckedIn,
        total,
        records: attendanceRecords
      });
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const handleAddQRCode = async (data: {
    name: string;
    location?: string;
    department?: string;
    coordinates?: { lat: number; lng: number };
    allowedRadius?: number;
    rotation?: {
      enabled: boolean;
      interval: string;
    };
  }) => {
    try {
      if (!companyId) {
        alert('Please select a company first');
        return;
      }

      const qrCode = `QR-${companyId.substring(0, 8).toUpperCase()}-${Date.now()}`;

      // Create QR code in the service
      await feathersClient.service('qr-codes').create({
        company: companyId,
        name: data.name,
        qrCode,
        location: data.location,
        department: data.department,
        coordinates: data.coordinates,
        allowedRadius: data.allowedRadius || 100,
        isActive: true,
        rotation: data.rotation ? {
          enabled: data.rotation.enabled,
          interval: data.rotation.interval,
          lastRotated: new Date(),
          baseCode: qrCode
        } : undefined
      });

      setShowAddQRModal(false);
      fetchQRCodes();
      alert('QR Code created successfully!');
    } catch (error: any) {
      console.error('Error creating QR code:', error);

      // Fallback: update company's main QR code
      if (error.message?.includes('service') || error.code === 404) {
        try {
          await feathersClient.service('companies').patch(companyId, {
            qrCodeSettings: {
              enabled: true,
              qrCode: `QR-${companyId.substring(0, 8).toUpperCase()}-${Date.now()}`,
              qrCodeGeneratedAt: new Date(),
              allowManualEdit: false,
              coordinates: data.coordinates,
              allowedRadius: data.allowedRadius || 100
            }
          });
          setShowAddQRModal(false);
          fetchQRCodes();
          alert('QR Code created successfully!');
        } catch (e) {
          console.error('Fallback error:', e);
          alert('Failed to create QR code');
        }
      } else {
        alert(error.message || 'Failed to create QR code');
      }
    }
  };

  const handleDeleteQRCode = async (qrCodeId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    try {
      await feathersClient.service('qr-codes').remove(qrCodeId);
      fetchQRCodes();
      alert('QR Code deleted successfully!');
    } catch (error) {
      console.error('Error deleting QR code:', error);
      alert('Failed to delete QR code');
    }
  };

  const downloadQRCode = (qrCode: string, name: string) => {
    const svg = document.getElementById(`qr-${qrCode}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `${name}-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const shareQRCode = (qrCode: string, name: string) => {
    const text = `QR Code: ${qrCode}\nName: ${name}`;
    navigator.clipboard.writeText(text);
    alert('QR Code copied to clipboard!');
  };

  const downloadReport = async (type: 'daily' | 'weekly' | 'monthly' | 'custom', format: 'csv' | 'pdf') => {
    try {
      // Calculate date range based on type
      let startDate = new Date();
      let endDate = new Date();

      if (type === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (type === 'weekly') {
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (type === 'monthly') {
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Fetch attendance data for the date range
      const timesheets = await feathersClient.service('timesheets').find({
        query: {
          'dailyEntries.date': {
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString()
          },
          $populate: 'worker',
          $limit: 1000
        }
      });

      const records = timesheets.data || timesheets;

      if (format === 'csv') {
        // Generate CSV
        const csvRows = [];
        csvRows.push(['Worker Name', 'Employee ID', 'Date', 'Clock In', 'Clock Out', 'Status', 'Check-In Method', 'QR Code Used']);

        records.forEach((timesheet: any) => {
          timesheet.dailyEntries?.forEach((entry: any) => {
            const entryDate = new Date(entry.date);
            if (entryDate >= startDate && entryDate <= endDate) {
              csvRows.push([
                `${timesheet.worker?.firstName || ''} ${timesheet.worker?.lastName || ''}`,
                timesheet.worker?.employeeId || '',
                entryDate.toLocaleDateString(),
                entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString() : '',
                entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : '',
                entry.isAbsent ? 'Absent' : entry.clockIn ? 'Present' : 'Not Checked In',
                entry.checkInMethod || '',
                entry.qrCodeCheckIn?.qrCodeData || ''
              ]);
            }
          });
        });

        const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${type}-${getLocalDateString()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Generate PDF (simplified - you can enhance this with a library like jsPDF)
        alert('PDF generation coming soon! For now, please use CSV format.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <QrCodeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Please select a company first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <QrCodeIcon className="h-8 w-8 text-indigo-600" />
          QR Code & Attendance Management
        </h1>
        <p className="text-gray-600 mt-2">Manage QR codes and track worker attendance for {selectedCompany?.name}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('qr-codes')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'qr-codes'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                QR Codes ({qrCodes.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'attendance'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Attendance Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <DocumentArrowDownIcon className="h-5 w-5" />
                Reports
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* QR Codes Tab */}
      {activeTab === 'qr-codes' && (
        <div className="space-y-6">
          {/* Add QR Code Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">QR Codes</h2>
            <button
              onClick={() => setShowAddQRModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add QR Code
            </button>
          </div>

          {/* QR Codes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map((qr) => (
              <div key={qr._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{qr.name}</h3>
                    {qr.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        {qr.location}
                      </p>
                    )}
                    {qr.department && (
                      <p className="text-xs text-indigo-600 mt-1">Dept: {qr.department}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    qr.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {qr.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* QR Code Display */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4 flex justify-center">
                  <QRCode
                    id={`qr-${qr.qrCode}`}
                    value={qr.qrCode}
                    size={200}
                    level="H"
                  />
                </div>

                {/* Location Info */}
                {qr.coordinates && (
                  <div className="bg-indigo-50 rounded-lg p-2 mb-2">
                    <p className="text-xs text-indigo-700">
                      📍 Geo-fenced: {qr.allowedRadius || 100}m radius
                    </p>
                  </div>
                )}

                {/* Rotation Info */}
                {qr.rotation?.enabled && (
                  <div className="bg-amber-50 rounded-lg p-2 mb-4">
                    <p className="text-xs text-amber-700">
                      🔄 Auto-rotating: {
                        qr.rotation.interval === '5min' ? 'Every 5 mins' :
                        qr.rotation.interval === '15min' ? 'Every 15 mins' :
                        qr.rotation.interval === '1hour' ? 'Every hour' :
                        qr.rotation.interval === '3hours' ? 'Every 3 hours' :
                        qr.rotation.interval === '12hours' ? 'Every 12 hours' :
                        qr.rotation.interval === '24hours' ? 'Every 24 hours' : qr.rotation.interval
                      }
                    </p>
                    {qr.rotation.lastRotated && (
                      <p className="text-xs text-amber-600 mt-1">
                        Last rotated: {new Date(qr.rotation.lastRotated).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500">QR Code:</p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all">{qr.qrCode}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadQRCode(qr.qrCode, qr.name)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={() => shareQRCode(qr.qrCode, qr.name)}
                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <ShareIcon className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    onClick={() => handleDeleteQRCode(qr._id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {qrCodes.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <QrCodeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No QR codes created yet</p>
              <button
                onClick={() => setShowAddQRModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First QR Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Attendance Overview Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-6 w-6 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={() => setSelectedDate(getLocalDateString())}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedDate === getLocalDateString()
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              {selectedDate === getLocalDateString() && (
                <span className="text-sm text-green-600 font-medium">● Viewing Today</span>
              )}
            </div>
            <button
              onClick={fetchAttendanceData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Refresh
            </button>
          </div>

          {/* Attendance Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Workers</p>
                  <p className="text-3xl font-bold text-blue-900">{attendanceData.total}</p>
                </div>
                <UserGroupIcon className="h-10 w-10 text-blue-400" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-3xl font-bold text-green-900">{attendanceData.present}</p>
                </div>
                <CheckCircleIcon className="h-10 w-10 text-green-400" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Late</p>
                  <p className="text-3xl font-bold text-yellow-900">{attendanceData.late}</p>
                </div>
                <ClockIcon className="h-10 w-10 text-yellow-400" />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-3xl font-bold text-red-900">{attendanceData.absent}</p>
                </div>
                <XCircleIcon className="h-10 w-10 text-red-400" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Not Checked In</p>
                  <p className="text-3xl font-bold text-gray-900">{attendanceData.notCheckedIn}</p>
                </div>
                <ClockIcon className="h-10 w-10 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-4xl font-bold text-gray-900">
                  {attendanceData.total > 0
                    ? ((attendanceData.present / attendanceData.total) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">On-Time Rate</p>
                <p className="text-2xl font-bold text-gray-700">
                  {attendanceData.present > 0
                    ? (((attendanceData.present - attendanceData.late) / attendanceData.present) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lunch Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lunch In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QR Code
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.records.map((record) => (
                    <tr key={record._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {record.worker?.firstName?.[0]}{record.worker?.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {record.worker?.firstName} {record.worker?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{record.worker?.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.lunchOut ? new Date(record.lunchOut).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.lunchIn ? new Date(record.lunchIn).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.checkInMethod || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {record.qrCodeUsed ? record.qrCodeUsed.substring(0, 20) + '...' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Reports</h2>

            {/* Report Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Daily Report</h3>
                <p className="text-sm text-gray-600 mb-4">Download today&apos;s attendance report</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport('daily', 'csv')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadReport('daily', 'pdf')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Weekly Report</h3>
                <p className="text-sm text-gray-600 mb-4">Download this week&apos;s attendance report</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport('weekly', 'csv')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadReport('weekly', 'pdf')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Monthly Report</h3>
                <p className="text-sm text-gray-600 mb-4">Download this month&apos;s attendance report</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport('monthly', 'csv')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadReport('monthly', 'pdf')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Custom Report</h3>
                <p className="text-sm text-gray-600 mb-4">Generate custom date range report</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport('custom', 'csv')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadReport('custom', 'pdf')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add QR Code Modal */}
      {showAddQRModal && (
        <AddQRCodeModal
          onClose={() => setShowAddQRModal(false)}
          onSave={handleAddQRCode}
          departments={departments}
        />
      )}
    </div>
  );
}

// Add QR Code Modal Component
function AddQRCodeModal({ onClose, onSave, departments }: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    location?: string;
    department?: string;
    coordinates?: { lat: number; lng: number };
    allowedRadius?: number;
    rotation?: {
      enabled: boolean;
      interval: string;
    };
  }) => void;
  departments: any[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    department: '',
    coordinates: undefined as { lat: number; lng: number; address?: string } | undefined,
    allowedRadius: 100,
    rotationEnabled: false,
    rotationInterval: '1hour'
  });

  const rotationIntervals = [
    { value: '5min', label: 'Every 5 minutes' },
    { value: '15min', label: 'Every 15 minutes' },
    { value: '1hour', label: 'Every 1 hour' },
    { value: '3hours', label: 'Every 3 hours' },
    { value: '12hours', label: 'Every 12 hours' },
    { value: '24hours', label: 'Every 24 hours' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('QR Code name is required');
      return;
    }

    onSave({
      name: formData.name,
      location: formData.coordinates?.address || formData.location,
      department: formData.department,
      coordinates: formData.coordinates ? {
        lat: formData.coordinates.lat,
        lng: formData.coordinates.lng
      } : undefined,
      allowedRadius: formData.allowedRadius,
      rotation: formData.rotationEnabled ? {
        enabled: true,
        interval: formData.rotationInterval
      } : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-lg sticky top-0">
          <h2 className="text-xl font-bold text-white">Add New QR Code</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-indigo-700 rounded-lg p-2 transition-colors"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QR Code Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Main Entrance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Department</option>
              {departments.map((dept: any) => (
                <option key={dept._id} value={dept.name}>
                  {dept.name} {dept.code ? `(${dept.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* QR Code Rotation Settings */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-amber-900">
                  🔄 Auto-Rotate QR Code
                </label>
                <p className="text-xs text-amber-700 mt-1">
                  Automatically change the QR code at set intervals for enhanced security
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, rotationEnabled: !formData.rotationEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.rotationEnabled ? 'bg-amber-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.rotationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {formData.rotationEnabled && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-amber-900 mb-2">
                  Rotation Interval
                </label>
                <select
                  value={formData.rotationInterval}
                  onChange={(e) => setFormData({ ...formData, rotationInterval: e.target.value })}
                  className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  {rotationIntervals.map((interval) => (
                    <option key={interval.value} value={interval.value}>
                      {interval.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Workers must scan the latest QR code. Old codes will be rejected.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pin Location on Map
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Set the check-in location. Workers must be within the specified radius to check in.
            </p>
            <LocationPicker
              value={formData.coordinates}
              onChange={(location) => setFormData({
                ...formData,
                coordinates: location,
                location: location.address
              })}
              radius={formData.allowedRadius}
              onRadiusChange={(radius) => setFormData({ ...formData, allowedRadius: radius })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Create QR Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
