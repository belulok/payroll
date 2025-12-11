'use client';

import { useEffect, useState, useRef } from 'react';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';
import Calendar from '@/components/Calendar';
import {
  CalendarIcon,
  MapPinIcon,
  TableCellsIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface Holiday {
  _id: string;
  name: string;
  date: string;
  year: number;
  type: 'public' | 'company' | 'state-specific';
  state?: string;
  isPaid: boolean;
  isRecurring: boolean;
  description?: string;
  isActive: boolean;
  company: any;
  createdAt: string;
}

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
];

export default function HolidaysPage() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?._id;

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public' as 'public' | 'company' | 'state-specific',
    state: '',
    isPaid: true,
    isRecurring: false,
    description: ''
  });

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; skipped?: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companyId) {
      fetchHolidays();
    }
  }, [year, companyId]);

  const fetchHolidays = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const response = await feathersClient.service('gazetted-holidays').find({
        query: {
          company: companyId,
          year: year,
          $limit: 1000,
          $sort: { date: 1 }
        }
      });
      const data = Array.isArray(response) ? response : response.data || [];
      setHolidays(data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!companyId || !formData.name || !formData.date) return;

    try {
      const holidayData = {
        ...formData,
        company: companyId,
        state: formData.type === 'state-specific' ? formData.state : null
      };

      if (editingHoliday) {
        await feathersClient.service('gazetted-holidays').patch(editingHoliday._id, holidayData);
      } else {
        await feathersClient.service('gazetted-holidays').create(holidayData);
      }

      setShowAddModal(false);
      setEditingHoliday(null);
      resetForm();
      fetchHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      alert('Failed to save holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await feathersClient.service('gazetted-holidays').remove(id);
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      type: holiday.type,
      state: holiday.state || '',
      isPaid: holiday.isPaid,
      isRecurring: holiday.isRecurring,
      description: holiday.description || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      type: 'public',
      state: '',
      isPaid: true,
      isRecurring: false,
      description: ''
    });
  };

  // CSV Template Download
  const downloadTemplate = () => {
    const headers = ['name', 'date', 'type', 'state', 'isPaid', 'isRecurring', 'description'];
    const sampleData = [
      ['New Year', '1/1/2025', 'public', '', 'TRUE', 'TRUE', 'New Year celebration'],
      ['Federal Territory Day', '2/1/2025', 'state-specific', 'Kuala Lumpur', 'TRUE', 'TRUE', 'Federal Territory holiday'],
      ['Company Foundation Day', '3/15/2025', 'company', '', 'TRUE', 'FALSE', 'Company anniversary'],
      ['Hari Raya', '3/30/2025', 'public', '', 'TRUE', 'FALSE', 'Hari Raya Aidilfitri']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'holidays_template.csv';
    link.click();
  };

  // CSV Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadResult(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    // Handle different line endings (Windows \r\n, Mac \r, Unix \n)
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header row - handle both comma and semicolon delimiters
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    console.log('CSV Headers:', headers);
    console.log('CSV Delimiter:', delimiter);

    const holidays: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line handling quoted values
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      if (values.length > 0 && values.some(v => v)) {
        const holiday: any = {};
        headers.forEach((header, idx) => {
          holiday[header] = values[idx] || '';
        });
        console.log(`Row ${i}:`, holiday);
        holidays.push(holiday);
      }
    }

    return holidays;
  };

  const handleUpload = async () => {
    if (!uploadFile || !companyId) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await uploadFile.text();
      const holidays = parseCSV(text);

      if (holidays.length === 0) {
        setUploadResult({ success: 0, failed: 0, errors: [{ row: 0, error: 'No valid data found in CSV' }] });
        return;
      }

      const result = await feathersClient.service('gazetted-holidays').create({
        bulkImport: true,
        company: companyId,
        holidays: holidays
      });

      setUploadResult(result);
      if (result.success > 0) {
        fetchHolidays();
      }
    } catch (error: any) {
      console.error('Error uploading holidays:', error);
      setUploadResult({ success: 0, failed: 1, errors: [{ row: 0, error: error.message }] });
    } finally {
      setUploading(false);
    }
  };

  const groupedByMonth = holidays.reduce((acc, holiday) => {
    const month = new Date(holiday.date).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const stats = {
    total: holidays.length,
    national: holidays.filter(h => h.type === 'public').length,
    state: holidays.filter(h => h.type === 'state-specific').length,
    company: holidays.filter(h => h.type === 'company').length,
  };

  // Convert holidays to calendar events
  const calendarEvents = holidays.map(holiday => ({
    id: holiday._id,
    date: new Date(holiday.date),
    title: holiday.name,
    type: 'holiday' as const,
    color: holiday.type === 'state-specific'
      ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
      : holiday.type === 'company'
      ? 'bg-green-100 text-green-800 border-l-4 border-green-500'
      : 'bg-indigo-100 text-indigo-800 border-l-4 border-indigo-500',
    worker: holiday.state || (holiday.type === 'company' ? 'Company' : 'National'),
    status: holiday.isPaid ? 'Paid Holiday' : 'Unpaid Holiday'
  }));

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Please select a company first</div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Public Holidays</h1>
          <p className="text-gray-600 mt-2">
            Manage holidays for {selectedCompany?.name || 'your company'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Holiday Button */}
          <button
            onClick={() => {
              setEditingHoliday(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Holiday
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadResult(null);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Bulk Upload
          </button>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <TableCellsIcon className="h-5 w-5" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CalendarIcon className="h-5 w-5" />
              Calendar
            </button>
          </div>

          {/* Year Selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 font-medium">Total Holidays</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 font-medium">Public/National</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.national}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 font-medium">State Specific</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.state}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 font-medium">Company Holidays</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.company}</p>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-100 border-l-4 border-indigo-500"></div>
              <span className="text-sm text-gray-600">Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500"></div>
              <span className="text-sm text-gray-600">State Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500"></div>
              <span className="text-sm text-gray-600">Company Holiday</span>
            </div>
          </div>
          <Calendar events={calendarEvents} />
        </div>
      )}

      {/* List View - Holidays by Month */}
      {viewMode === 'list' && Object.keys(groupedByMonth).length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No holidays found</h3>
          <p className="mt-1 text-sm text-gray-500">No holidays configured for {year}.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Holiday
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              Bulk Upload
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-6">
          {Object.entries(groupedByMonth).map(([month, monthHolidays]) => (
            <div key={month} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-indigo-600 px-6 py-3">
                <h2 className="text-lg font-semibold text-white">{month}</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {monthHolidays.map((holiday) => {
                  const date = new Date(holiday.date);
                  const dayName = date.toLocaleDateString('en-MY', { weekday: 'long' });
                  const dayNum = date.getDate();

                  return (
                    <div key={holiday._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="shrink-0 w-16 text-center">
                            <div className="text-3xl font-bold text-indigo-600">{dayNum}</div>
                            <div className="text-xs text-gray-500 uppercase">{dayName}</div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{holiday.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {holiday.state && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <MapPinIcon className="h-4 w-4 mr-1" />
                                  <span>{holiday.state}</span>
                                </div>
                              )}
                              {holiday.description && (
                                <span className="text-sm text-gray-400">{holiday.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {holiday.type === 'company' && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Company
                            </span>
                          )}
                          {holiday.type === 'state-specific' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              State
                            </span>
                          )}
                          {holiday.type === 'public' && (
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                              Public
                            </span>
                          )}
                          {!holiday.isPaid && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                              Unpaid
                            </span>
                          )}
                          <button
                            onClick={() => handleEditHoliday(holiday)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(holiday._id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add/Edit Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingHoliday(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Chinese New Year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="public">Public/National Holiday</option>
                  <option value="state-specific">State Specific Holiday</option>
                  <option value="company">Company Holiday</option>
                </select>
              </div>

              {formData.type === 'state-specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    {MALAYSIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Paid Holiday</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Recurring Annually</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingHoliday(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                disabled={!formData.name || !formData.date}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Bulk Upload Holidays</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadResult(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Download the CSV template to see the required format for bulk upload.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Download Template
                </button>
              </div>

              {/* File Upload */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Step 2: Upload Your CSV</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Fill in the template and upload it here. Required columns: name, date
                </p>

                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    Select CSV File
                  </button>
                  {uploadFile && (
                    <span className="text-sm text-gray-600">
                      Selected: <strong>{uploadFile.name}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Upload Results */}
              {uploadResult && (
                <div className={`border rounded-lg p-4 ${
                  uploadResult.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                }`}>
                  <h3 className="font-medium mb-2">Upload Results</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-green-700">✓ {uploadResult.success} imported</span>
                    {(uploadResult.skipped || 0) > 0 && (
                      <span className="text-blue-700">⊘ {uploadResult.skipped} skipped (duplicates)</span>
                    )}
                    {uploadResult.failed > 0 && (
                      <span className="text-red-700">✗ {uploadResult.failed} failed</span>
                    )}
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {uploadResult.errors.map((err, idx) => (
                        <p key={idx} className="text-sm text-red-600">
                          Row {err.row}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CSV Format Info */}
              <div className="text-sm text-gray-500">
                <p className="font-medium mb-1">CSV Format:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>name</strong> - Holiday name (required)</li>
                  <li><strong>date</strong> - Date in M/D/YYYY or YYYY-MM-DD format (required)</li>
                  <li><strong>type</strong> - public, company, or state-specific</li>
                  <li><strong>state</strong> - State name (if type is state-specific)</li>
                  <li><strong>isPaid</strong> - TRUE or FALSE</li>
                  <li><strong>isRecurring</strong> - TRUE or FALSE</li>
                  <li><strong>description</strong> - Optional description</li>
                </ul>
                <p className="mt-2 text-xs text-gray-400">
                  💡 Tip: Duplicate holidays (same name & date) will be skipped automatically.
                  Upload adds to existing holidays - it won&apos;t delete anything.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadResult(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
