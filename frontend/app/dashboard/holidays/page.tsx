'use client';

import { useEffect, useState } from 'react';
import feathersClient from '@/lib/feathers';
import Calendar from '@/components/Calendar';
import { CalendarIcon, MapPinIcon, TableCellsIcon } from '@heroicons/react/24/outline';

interface Holiday {
  _id: string;
  name: string;
  date: string;
  isWorkingDay: boolean;
  state?: string;
  company: any;
  createdAt: string;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    try {
      const response = await feathersClient.service('gazetted-holidays').find({
        query: {
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

  const groupedByMonth = holidays.reduce((acc, holiday) => {
    const month = new Date(holiday.date).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  const stats = {
    total: holidays.length,
    national: holidays.filter(h => !h.state).length,
    state: holidays.filter(h => h.state).length,
    workingDays: holidays.filter(h => h.isWorkingDay).length,
  };

  // Convert holidays to calendar events
  const calendarEvents = holidays.map(holiday => ({
    id: holiday._id,
    date: new Date(holiday.date),
    title: holiday.name,
    type: 'holiday' as const,
    color: holiday.state
      ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
      : 'bg-indigo-100 text-indigo-800 border-l-4 border-indigo-500',
    worker: holiday.state || 'National',
    status: holiday.isWorkingDay ? 'Working Day' : 'Public Holiday'
  }));

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
          <p className="text-gray-600 mt-2">Gazetted holidays calendar for Malaysia</p>
        </div>

        <div className="flex items-center gap-3">
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
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
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
          <p className="text-sm text-gray-600 font-medium">National</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.national}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 font-medium">State Specific</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.state}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 font-medium">Working Days</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.workingDays}</p>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-100 border-l-4 border-indigo-500"></div>
              <span className="text-sm text-gray-600">National Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500"></div>
              <span className="text-sm text-gray-600">State Holiday</span>
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
                            {holiday.state && (
                              <div className="flex items-center mt-1 text-sm text-gray-500">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                <span>{holiday.state} only</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {holiday.isWorkingDay && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Working Day
                            </span>
                          )}
                          {!holiday.state && (
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                              National
                            </span>
                          )}
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
    </div>
  );
}

