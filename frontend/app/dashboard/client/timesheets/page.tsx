'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  ClockIcon,
  EyeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface DailyEntry {
  date: string
  dayOfWeek: string
  clockIn: string | null
  clockOut: string | null
  normalHours: number
  ot1_5Hours: number
  ot2_0Hours: number
  totalHours: number
  notes: string | null
  leaveType: string | null
}

interface Timesheet {
  _id: string
  worker: {
    _id: string
    firstName: string
    lastName: string
    employeeId: string
    position: string
  }
  weekStartDate: string
  weekEndDate: string
  dailyEntries: DailyEntry[]
  totalNormalHours: number
  totalOT1_5Hours: number
  totalOT2_0Hours: number
  totalHours: number
  status: string
}

export default function ClientTimesheetsPage() {
  const router = useRouter()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        await fetchTimesheets()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, weekOffset])

  const fetchTimesheets = async () => {
    try {
      // Calculate week dates based on offset
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7))
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const response = await feathersClient.service('timesheets').find({
        query: {
          weekStartDate: { $gte: startOfWeek.toISOString() },
          weekEndDate: { $lte: new Date(endOfWeek.getTime() + 86400000).toISOString() },
          $limit: 100,
          $sort: { 'worker.firstName': 1 }
        }
      })
      setTimesheets(response.data || response)
    } catch (error) {
      console.error('Error fetching timesheets:', error)
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'submitted': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCurrentWeekLabel = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7))
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-xs md:text-base text-gray-600 mt-1">
            View worker timesheets for your projects
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-sm md:text-base">{getCurrentWeekLabel()}</span>
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
            className={`p-2 rounded-lg ${weekOffset >= 0 ? 'text-gray-300' : 'hover:bg-gray-100'}`}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Normal</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">OT 1.5x</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">OT 2.0x</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timesheets.map((ts) => (
                <tr key={ts._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {ts.worker?.firstName} {ts.worker?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{ts.worker?.employeeId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{ts.totalNormalHours?.toFixed(1) || 0}</td>
                  <td className="px-4 py-3 text-center text-sm">{ts.totalOT1_5Hours?.toFixed(1) || 0}</td>
                  <td className="px-4 py-3 text-center text-sm">{ts.totalOT2_0Hours?.toFixed(1) || 0}</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold">{ts.totalHours?.toFixed(1) || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ts.status)}`}>
                      {ts.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedTimesheet(ts)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {timesheets.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Timesheets</h3>
            <p className="text-gray-500 mt-1">No timesheets found for this week</p>
          </div>
        )}
      </div>

      {/* Timesheet Detail Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedTimesheet.worker?.firstName} {selectedTimesheet.worker?.lastName}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(selectedTimesheet.weekStartDate).toLocaleDateString()} - {new Date(selectedTimesheet.weekEndDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTimesheet(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Day</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Date</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Clock In</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Clock Out</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Normal</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">OT 1.5x</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">OT 2.0x</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedTimesheet.dailyEntries?.map((entry, idx) => (
                      <tr key={idx} className={entry.leaveType ? 'bg-yellow-50' : ''}>
                        <td className="px-3 py-2 text-sm font-medium">{entry.dayOfWeek}</td>
                        <td className="px-3 py-2 text-sm text-center">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-3 py-2 text-sm text-center">{formatTime(entry.clockIn)}</td>
                        <td className="px-3 py-2 text-sm text-center">{formatTime(entry.clockOut)}</td>
                        <td className="px-3 py-2 text-sm text-center">{entry.normalHours?.toFixed(1) || 0}</td>
                        <td className="px-3 py-2 text-sm text-center">{entry.ot1_5Hours?.toFixed(1) || 0}</td>
                        <td className="px-3 py-2 text-sm text-center">{entry.ot2_0Hours?.toFixed(1) || 0}</td>
                        <td className="px-3 py-2 text-sm text-center font-semibold">{entry.totalHours?.toFixed(1) || 0}</td>
                        <td className="px-3 py-2 text-xs text-center">
                          {entry.leaveType ? (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">{entry.leaveType}</span>
                          ) : entry.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-right">Totals:</td>
                      <td className="px-3 py-2 text-sm text-center font-semibold">{selectedTimesheet.totalNormalHours?.toFixed(1)}</td>
                      <td className="px-3 py-2 text-sm text-center font-semibold">{selectedTimesheet.totalOT1_5Hours?.toFixed(1)}</td>
                      <td className="px-3 py-2 text-sm text-center font-semibold">{selectedTimesheet.totalOT2_0Hours?.toFixed(1)}</td>
                      <td className="px-3 py-2 text-sm text-center font-bold text-indigo-600">{selectedTimesheet.totalHours?.toFixed(1)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

