'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface LeaveRequest {
  _id: string
  worker: {
    _id: string
    firstName: string
    lastName: string
  }
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  status: string
  reason: string
}

interface Holiday {
  _id: string
  name: string
  date: string
  type: string
  isPaid: boolean
}

export default function ClientLeaveCalendarPage() {
  const router = useRouter()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        await Promise.all([fetchLeaveRequests(), fetchHolidays()])
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, currentMonth])

  const fetchLeaveRequests = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      const response = await feathersClient.service('leave-requests').find({
        query: {
          status: 'approved',
          startDate: { $lte: endOfMonth.toISOString() },
          endDate: { $gte: startOfMonth.toISOString() },
          $limit: 100
        }
      })
      setLeaveRequests(response.data || response)
    } catch (error) {
      console.error('Error fetching leave requests:', error)
    }
  }

  const fetchHolidays = async () => {
    try {
      const year = currentMonth.getFullYear()
      const response = await feathersClient.service('gazetted-holidays').find({
        query: { year, $limit: 100 }
      })
      setHolidays(response.data || response)
    } catch (error) {
      console.error('Error fetching holidays:', error)
    }
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getEventsForDate = (date: Date | null) => {
    if (!date) return { leaves: [], holidays: [] }

    const dateStr = date.toISOString().split('T')[0]
    
    const leaves = leaveRequests.filter(lr => {
      const start = new Date(lr.startDate).toISOString().split('T')[0]
      const end = new Date(lr.endDate).toISOString().split('T')[0]
      return dateStr >= start && dateStr <= end
    })

    const holidaysOnDate = holidays.filter(h => {
      const hDate = new Date(h.date).toISOString().split('T')[0]
      return hDate === dateStr
    })

    return { leaves, holidays: holidaysOnDate }
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const days = getDaysInMonth()

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Leave Calendar</h1>
        <p className="text-xs md:text-base text-gray-600 mt-1">
          View approved leaves and public holidays
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>Public Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Annual Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span>Medical Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 rounded"></div>
          <span>Other Leave</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 bg-indigo-600 text-white">
          <button onClick={prevMonth} className="p-2 hover:bg-indigo-700 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-indigo-700 rounded">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((date, idx) => {
            const events = getEventsForDate(date)
            const isToday = date && date.toDateString() === new Date().toDateString()

            return (
              <div
                key={idx}
                className={`min-h-[80px] md:min-h-[100px] p-1 border-b border-r ${
                  !date ? 'bg-gray-50' : 'hover:bg-gray-50'
                } ${isToday ? 'bg-indigo-50' : ''}`}
              >
                {date && (
                  <>
                    <span className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {events.holidays.map((h, i) => (
                        <div
                          key={`h-${i}`}
                          className="text-[9px] px-1 py-0.5 bg-red-100 text-red-800 rounded truncate"
                          title={h.name}
                        >
                          🎉 {h.name}
                        </div>
                      ))}
                      {events.leaves.slice(0, 2).map((l, i) => (
                        <div
                          key={`l-${i}`}
                          className={`text-[9px] px-1 py-0.5 rounded truncate ${
                            l.leaveType === 'Annual' ? 'bg-blue-100 text-blue-800' :
                            l.leaveType === 'Medical' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-purple-100 text-purple-800'
                          }`}
                          title={`${l.worker?.firstName} ${l.worker?.lastName} - ${l.leaveType}`}
                        >
                          {l.worker?.firstName?.charAt(0)}{l.worker?.lastName?.charAt(0)} - {l.leaveType}
                        </div>
                      ))}
                      {events.leaves.length > 2 && (
                        <span className="text-[9px] text-gray-500">
                          +{events.leaves.length - 2} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Leaves List */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Approved Leaves This Month</h3>
        {leaveRequests.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">No approved leaves this month</p>
        ) : (
          <div className="space-y-2">
            {leaveRequests.map((lr) => (
              <div key={lr._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">
                    {lr.worker?.firstName} {lr.worker?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lr.leaveType} • {new Date(lr.startDate).toLocaleDateString()} - {new Date(lr.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-medium text-green-600">
                  {lr.totalDays} day{lr.totalDays > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

