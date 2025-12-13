'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  BriefcaseIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

interface Worker {
  _id: string
  firstName: string
  lastName: string
  employeeId: string
  position: string
  department: string
  employmentType: string
  employmentStatus: string
  paymentType: string
  workLocation: string
  joinDate: string
  isActive: boolean
  profilePicture?: string
  project?: {
    _id: string
    name: string
  }
}

export default function ClientWorkersPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        await fetchWorkers()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchWorkers = async () => {
    try {
      const response = await feathersClient.service('workers').find({
        query: {
          $limit: 200,
          $sort: { firstName: 1 }
        }
      })
      setWorkers(response.data || response)
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = 
      worker.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.position?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && worker.isActive) ||
      (filterStatus === 'inactive' && !worker.isActive)

    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Workers</h1>
          <p className="text-xs md:text-base text-gray-600 mt-1">
            View workers assigned to your projects
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredWorkers.map((worker) => (
          <div
            key={worker._id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {worker.profilePicture ? (
                  <img
                    src={worker.profilePicture}
                    alt={`${worker.firstName} ${worker.lastName}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserCircleIcon className="w-8 h-8 text-indigo-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {worker.firstName} {worker.lastName}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    worker.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {worker.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{worker.employeeId}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center text-gray-600">
                <BriefcaseIcon className="w-4 h-4 mr-2 text-gray-400" />
                <span>{worker.position || 'No position'}</span>
              </div>
              {worker.workLocation && (
                <div className="flex items-center text-gray-600">
                  <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{worker.workLocation}</span>
                </div>
              )}
              {worker.project && (
                <div className="flex items-center text-gray-600">
                  <span className="w-4 h-4 mr-2 text-gray-400">📋</span>
                  <span>{worker.project.name}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className={`px-2 py-1 text-[10px] rounded-full font-medium ${
                worker.paymentType === 'hourly' ? 'bg-blue-100 text-blue-800' :
                worker.paymentType === 'monthly-salary' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {worker.paymentType === 'monthly-salary' ? 'Monthly' :
                 worker.paymentType === 'hourly' ? 'Hourly' : 'Unit'}
              </span>
              <span className="text-[10px] text-gray-500">
                Joined {worker.joinDate ? new Date(worker.joinDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <UserCircleIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Workers Found</h3>
          <p className="text-gray-500 mt-1">
            {searchTerm ? 'Try a different search term' : 'No workers assigned to your projects yet'}
          </p>
        </div>
      )}
    </div>
  )
}

