'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  QrCodeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface AttendanceRecord {
  _id: string
  worker: {
    _id: string
    firstName: string
    lastName: string
    employeeId: string
  }
  date: string
  clockIn: string
  clockOut?: string
  location?: string
  project?: {
    _id: string
    name: string
  }
}

export default function ClientAttendancePage() {
  const router = useRouter()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        await fetchAttendance()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, selectedDate])

  const fetchAttendance = async () => {
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const response = await feathersClient.service('attendance').find({
        query: {
          date: {
            $gte: startOfDay.toISOString(),
            $lte: endOfDay.toISOString()
          },
          $limit: 200,
          $sort: { clockIn: -1 }
        }
      })
      setAttendance(response.data || response)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-'
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateDuration = (clockIn: string, clockOut?: string) => {
    if (!clockOut) return 'In Progress'
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    const diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60
    return `${diff.toFixed(1)} hrs`
  }

  const prevDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const nextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const checkedIn = attendance.filter(a => a.clockIn && !a.clockOut).length
  const checkedOut = attendance.filter(a => a.clockIn && a.clockOut).length

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-xs md:text-base text-gray-600 mt-1">
          View daily attendance records
        </p>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={prevDay}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-medium text-sm md:text-base border-0 focus:ring-0"
            />
          </div>
          <button
            onClick={nextDay}
            disabled={selectedDate >= new Date().toISOString().split('T')[0]}
            className={`p-2 rounded-lg ${
              selectedDate >= new Date().toISOString().split('T')[0] 
                ? 'text-gray-300' 
                : 'hover:bg-gray-100'
            }`}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{attendance.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <p className="text-xs text-gray-500">Checked In</p>
          <p className="text-2xl font-bold text-green-600">{checkedIn}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <p className="text-xs text-gray-500">Checked Out</p>
          <p className="text-2xl font-bold text-blue-600">{checkedOut}</p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clock In</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {record.worker?.firstName} {record.worker?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{record.worker?.employeeId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-green-600">
                    {formatTime(record.clockIn)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-blue-600">
                    {formatTime(record.clockOut)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${
                      record.clockOut ? 'text-gray-700' : 'text-yellow-600'
                    }`}>
                      {calculateDuration(record.clockIn, record.clockOut)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {record.location || record.project?.name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendance.length === 0 && (
          <div className="text-center py-12">
            <QrCodeIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Records</h3>
            <p className="text-gray-500 mt-1">No attendance records for this date</p>
          </div>
        )}
      </div>
    </div>
  )
}

