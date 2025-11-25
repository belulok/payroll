'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface Stats {
  totalWorkers: number
  pendingTimesheets: number
  monthlyPayroll: number
  activeCompanies: number
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0,
    pendingTimesheets: 0,
    monthlyPayroll: 0,
    activeCompanies: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        const currentUser = auth.user
        setUser(currentUser)

        // Redirect workers to their specific dashboard
        if (currentUser.role === 'worker') {
          router.push('/dashboard/worker')
          return
        }

        await fetchStats()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchStats = async () => {
    try {
      // Fetch workers
      const workersResponse = await feathersClient.service('workers').find({
        query: { $limit: 1000 }
      })
      const workers = Array.isArray(workersResponse) ? workersResponse : workersResponse.data || []

      // Fetch timesheets
      const timesheetsResponse = await feathersClient.service('timesheets').find({
        query: { $limit: 1000 }
      })
      const timesheets = Array.isArray(timesheetsResponse) ? timesheetsResponse : timesheetsResponse.data || []
      const pending = timesheets.filter((t: any) => t.status === 'submitted' || t.status === 'draft')

      // Fetch payroll records
      const payrollResponse = await feathersClient.service('payroll-records').find({
        query: { $limit: 1000 }
      })
      const payrolls = Array.isArray(payrollResponse) ? payrollResponse : payrollResponse.data || []
      const totalPayroll = payrolls.reduce((sum: number, p: any) => sum + (p.netPay || 0), 0)

      // Fetch companies
      const companiesResponse = await feathersClient.service('companies').find({
        query: { $limit: 1000 }
      })
      const companies = Array.isArray(companiesResponse) ? companiesResponse : companiesResponse.data || []
      const active = companies.filter((c: any) => c.subscription?.status === 'active')

      setStats({
        totalWorkers: workers.length,
        pendingTimesheets: pending.length,
        monthlyPayroll: totalPayroll,
        activeCompanies: active.length
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
    await feathersClient.logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, <strong>{user?.firstName} {user?.lastName}</strong> ({user?.role})
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Workers */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Workers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalWorkers}</p>
              <p className="text-xs text-gray-500 mt-1">Active employees</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Timesheets */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Timesheets</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingTimesheets}</p>
              <p className="text-xs text-red-600 mt-1">
                {stats.pendingTimesheets > 0 ? 'Requires attention' : 'All caught up!'}
              </p>
            </div>
            <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Monthly Payroll */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Payroll</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                RM {stats.monthlyPayroll.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">All records</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Active Companies */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeCompanies}</p>
              <p className="text-xs text-blue-600 mt-1">Subscriptions active</p>
            </div>
            <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {(user?.role === 'admin' || user?.role === 'subcon-admin' || user?.role === 'agent') && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/dashboard/workers')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
            >
              View Workers
            </button>
            <button
              onClick={() => router.push('/dashboard/timesheets')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
            >
              View Timesheets
            </button>
            <button
              onClick={() => router.push('/dashboard/payroll')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
            >
              View Payroll
            </button>
            {(user?.role === 'admin' || user?.role === 'agent') && (
              <button
                onClick={() => router.push('/dashboard/companies')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
              >
                View Companies
              </button>
            )}
          </div>
        </div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Types Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Types</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Monthly Salary</span>
              </div>
              <span className="text-sm font-bold text-gray-900">Fixed pay + benefits</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Hourly Pay</span>
              </div>
              <span className="text-sm font-bold text-gray-900">QR code check-in</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Unit-Based Pay</span>
              </div>
              <span className="text-sm font-bold text-gray-900">Per piece/unit</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total Workers</span>
              <span className="text-sm font-bold text-gray-900">{stats.totalWorkers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Active Companies</span>
              <span className="text-sm font-bold text-gray-900">{stats.activeCompanies}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Pending Approvals</span>
              <span className="text-sm font-bold text-red-600">{stats.pendingTimesheets}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

