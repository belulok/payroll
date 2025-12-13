'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  UsersIcon,
  ClockIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

interface ClientData {
  _id: string
  name: string
  email: string
  contactPerson: string
  companies: string[]
}

interface Stats {
  totalWorkers: number
  activeProjects: number
  pendingTimesheets: number
  upcomingLeaves: number
  pendingTasks: number
}

export default function ClientDashboard() {
  const router = useRouter()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0,
    activeProjects: 0,
    pendingTimesheets: 0,
    upcomingLeaves: 0,
    pendingTasks: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        const currentUser = auth.user

        // Verify user is a client
        if (currentUser.role !== 'client') {
          router.push('/dashboard')
          return
        }

        // Fetch client data
        if (currentUser.client) {
          const client = await feathersClient.service('clients').get(currentUser.client)
          setClientData(client)
          await fetchStats(currentUser.client)
        }
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchStats = async (clientId: string) => {
    try {
      // Fetch workers assigned to this client
      const workersResponse = await feathersClient.service('workers').find({
        query: { client: clientId, $limit: 0 }
      })
      
      // Fetch projects for this client
      const projectsResponse = await feathersClient.service('projects').find({
        query: { client: clientId, status: 'active', $limit: 0 }
      })
      
      // Fetch pending timesheets
      const timesheetsResponse = await feathersClient.service('timesheets').find({
        query: { status: { $in: ['draft', 'submitted'] }, $limit: 0 }
      })
      
      // Fetch upcoming leave requests
      const today = new Date()
      const leaveResponse = await feathersClient.service('leave-requests').find({
        query: { 
          startDate: { $gte: today.toISOString() },
          status: 'approved',
          $limit: 0 
        }
      })
      
      // Fetch pending tasks
      const tasksResponse = await feathersClient.service('tasks').find({
        query: { status: { $in: ['pending', 'in-progress'] }, $limit: 0 }
      })

      setStats({
        totalWorkers: workersResponse.total || 0,
        activeProjects: projectsResponse.total || 0,
        pendingTimesheets: timesheetsResponse.total || 0,
        upcomingLeaves: leaveResponse.total || 0,
        pendingTasks: tasksResponse.total || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-xs md:text-base text-gray-600 mt-1">
            Welcome back, <strong>{clientData?.contactPerson || clientData?.name}</strong>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
        {/* Total Workers */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-600 font-medium">Workers</p>
              <p className="text-lg md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-2">{stats.totalWorkers}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-600 font-medium">Projects</p>
              <p className="text-lg md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-2">{stats.activeProjects}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BriefcaseIcon className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending Timesheets */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-600 font-medium">Timesheets</p>
              <p className="text-lg md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-2">{stats.pendingTimesheets}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-600 font-medium">Leaves</p>
              <p className="text-lg md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-2">{stats.upcomingLeaves}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-600 font-medium">Tasks</p>
              <p className="text-lg md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-2">{stats.pendingTasks}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-4 h-4 md:w-6 md:h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
        <h2 className="text-sm md:text-xl font-semibold text-gray-900 mb-2 md:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4">
          <button
            onClick={() => router.push('/dashboard/client/workers')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 md:py-3 md:px-6 rounded-lg transition-colors shadow-md text-xs md:text-base"
          >
            View Workers
          </button>
          <button
            onClick={() => router.push('/dashboard/client/projects')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 md:py-3 md:px-6 rounded-lg transition-colors shadow-md text-xs md:text-base"
          >
            View Projects
          </button>
          <button
            onClick={() => router.push('/dashboard/client/timesheets')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-3 md:py-3 md:px-6 rounded-lg transition-colors shadow-md text-xs md:text-base"
          >
            View Timesheets
          </button>
          <button
            onClick={() => router.push('/dashboard/client/tasks')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 md:py-3 md:px-6 rounded-lg transition-colors shadow-md text-xs md:text-base"
          >
            Manage Tasks
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Recent Workers */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
          <h2 className="text-sm md:text-xl font-semibold text-gray-900 mb-2 md:mb-4">Your Workers</h2>
          <div className="text-center py-6 text-gray-500 text-sm">
            <UsersIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p>View and manage workers assigned to your projects</p>
            <button
              onClick={() => router.push('/dashboard/client/workers')}
              className="mt-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View All Workers →
            </button>
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
          <h2 className="text-sm md:text-xl font-semibold text-gray-900 mb-2 md:mb-4">Leave Calendar</h2>
          <div className="text-center py-6 text-gray-500 text-sm">
            <CalendarDaysIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p>View upcoming leaves and public holidays</p>
            <button
              onClick={() => router.push('/dashboard/client/leave')}
              className="mt-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View Calendar →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

