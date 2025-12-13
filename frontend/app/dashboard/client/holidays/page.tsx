'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import { CalendarIcon } from '@heroicons/react/24/outline'

interface Holiday {
  _id: string
  name: string
  date: string
  type: string
  state?: string
  isPaid: boolean
  description?: string
}

export default function ClientHolidaysPage() {
  const router = useRouter()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        await fetchHolidays()
        if (auth.user.client) {
          const client = await feathersClient.service('clients').get(auth.user.client)
          setCustomHolidays(client.customHolidays || [])
        }
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, selectedYear])

  const fetchHolidays = async () => {
    try {
      const response = await feathersClient.service('gazetted-holidays').find({
        query: { year: selectedYear, $limit: 100, $sort: { date: 1 } }
      })
      setHolidays(response.data || response)
    } catch (error) {
      console.error('Error fetching holidays:', error)
    }
  }

  const allHolidays = [
    ...holidays.map(h => ({ ...h, source: 'public' })),
    ...customHolidays.filter(h => new Date(h.date).getFullYear() === selectedYear).map(h => ({ ...h, source: 'custom' }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

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
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Holidays</h1>
          <p className="text-xs md:text-base text-gray-600 mt-1">
            Public holidays and custom holidays
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border rounded-lg text-sm w-fit"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500">Total Holidays</p>
          <p className="text-2xl font-bold text-gray-900">{allHolidays.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500">Public Holidays</p>
          <p className="text-2xl font-bold text-red-600">{holidays.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500">Custom Holidays</p>
          <p className="text-2xl font-bold text-purple-600">{customHolidays.filter(h => new Date(h.date).getFullYear() === selectedYear).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-xs text-gray-500">Upcoming</p>
          <p className="text-2xl font-bold text-green-600">
            {allHolidays.filter(h => new Date(h.date) >= new Date()).length}
          </p>
        </div>
      </div>

      {/* Holidays List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Paid</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allHolidays.map((holiday, idx) => {
                const isPast = new Date(holiday.date) < new Date()
                return (
                  <tr key={idx} className={isPast ? 'bg-gray-50 text-gray-400' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {new Date(holiday.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                      {holiday.description && (
                        <div className="text-xs text-gray-500">{holiday.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        (holiday as any).source === 'custom' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(holiday as any).source === 'custom' ? 'Custom' : 'Public'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${holiday.isPaid ? 'text-green-600' : 'text-gray-500'}`}>
                        {holiday.isPaid ? '✓ Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {allHolidays.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Holidays</h3>
            <p className="text-gray-500 mt-1">No holidays found for {selectedYear}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        💡 You can add custom holidays in Settings → Custom Holidays
      </p>
    </div>
  )
}

