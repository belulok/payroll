'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  PlusIcon,
  MapPinIcon,
  UsersIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'

interface Location {
  _id?: string
  name: string
  street: string
  city: string
  state: string
  postcode: string
  country: string
  isDefault: boolean
}

interface Project {
  _id: string
  name: string
  projectCode: string
  description: string
  status: string
  locations: Location[]
  startDate: string
  endDate: string
  company: {
    _id: string
    name: string
  }
}

interface Worker {
  _id: string
  firstName: string
  lastName: string
  employeeId: string
  position: string
  workLocation?: string
  project?: string | { _id: string; name: string }
}

export default function ClientProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [locationForm, setLocationForm] = useState<Location>({
    name: '',
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Malaysia',
    isDefault: false
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        await fetchProjects()
        await fetchWorkers()
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchProjects = async () => {
    try {
      const response = await feathersClient.service('projects').find({
        query: { $limit: 100, $sort: { name: 1 } }
      })
      setProjects(response.data || response)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchWorkers = async () => {
    try {
      const response = await feathersClient.service('workers').find({
        query: { $limit: 200, $sort: { firstName: 1 } }
      })
      setWorkers(response.data || response)
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }

  const handleAddLocation = async () => {
    if (!selectedProject || !locationForm.name) return

    try {
      const updatedLocations = [...(selectedProject.locations || []), locationForm]
      await feathersClient.service('projects').patch(selectedProject._id, {
        locations: updatedLocations
      })
      await fetchProjects()
      setShowLocationModal(false)
      setLocationForm({
        name: '',
        street: '',
        city: '',
        state: '',
        postcode: '',
        country: 'Malaysia',
        isDefault: false
      })
      alert('Location added successfully!')
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Failed to add location')
    }
  }

  const handleAssignWorker = async (workerId: string, locationName: string) => {
    if (!selectedProject) return

    try {
      await feathersClient.service('workers').patch(workerId, {
        project: selectedProject._id,
        workLocation: locationName
      })
      await fetchWorkers()
      alert('Worker assigned successfully!')
    } catch (error) {
      console.error('Error assigning worker:', error)
      alert('Failed to assign worker')
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Projects</h1>
        <p className="text-xs md:text-base text-gray-600 mt-1">
          Manage your project locations and worker assignments
        </p>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project._id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <p className="text-xs text-gray-500">{project.projectCode}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] rounded-full font-medium ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">{project.description}</p>
              )}

              {/* Locations */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Locations</span>
                  <button
                    onClick={() => {
                      setSelectedProject(project)
                      setShowLocationModal(true)
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center"
                  >
                    <PlusIcon className="w-3 h-3 mr-1" />
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {project.locations?.slice(0, 3).map((loc, idx) => (
                    <div key={idx} className="flex items-center text-xs text-gray-600">
                      <MapPinIcon className="w-3 h-3 mr-1 text-gray-400" />
                      {loc.name}
                      {loc.isDefault && (
                        <span className="ml-1 text-[10px] text-indigo-600">(Default)</span>
                      )}
                    </div>
                  ))}
                  {(project.locations?.length || 0) > 3 && (
                    <span className="text-[10px] text-gray-500">
                      +{project.locations.length - 3} more
                    </span>
                  )}
                  {(!project.locations || project.locations.length === 0) && (
                    <span className="text-xs text-gray-400">No locations yet</span>
                  )}
                </div>
              </div>

              {/* Workers assigned */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-600">
                    <UsersIcon className="w-4 h-4 mr-1 text-gray-400" />
                    {workers.filter(w => 
                      typeof w.project === 'object' 
                        ? (w.project as any)?._id === project._id 
                        : w.project === project._id
                    ).length} workers
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProject(project)
                      setShowAssignModal(true)
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                  >
                    Assign Workers
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <MapPinIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Projects Found</h3>
          <p className="text-gray-500 mt-1">No projects are assigned to you yet</p>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocationModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Location to {selectedProject.name}</h3>
              <button onClick={() => setShowLocationModal(false)}>
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g., Main Office, Site A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                <input
                  type="text"
                  value={locationForm.street}
                  onChange={(e) => setLocationForm({ ...locationForm, street: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={locationForm.state}
                    onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={locationForm.isDefault}
                  onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default location</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Workers Modal */}
      {showAssignModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Assign Workers to {selectedProject.name}</h3>
              <button onClick={() => setShowAssignModal(false)}>
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {workers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No workers available</p>
              ) : (
                <div className="space-y-2">
                  {workers.map((worker) => {
                    const isAssigned = typeof worker.project === 'object' 
                      ? (worker.project as any)?._id === selectedProject._id 
                      : worker.project === selectedProject._id
                    return (
                      <div key={worker._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{worker.firstName} {worker.lastName}</p>
                          <p className="text-xs text-gray-500">{worker.employeeId} • {worker.position}</p>
                          {isAssigned && worker.workLocation && (
                            <p className="text-xs text-indigo-600">📍 {worker.workLocation}</p>
                          )}
                        </div>
                        {isAssigned ? (
                          <span className="text-xs text-green-600 font-medium">Assigned</span>
                        ) : (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignWorker(worker._id, e.target.value)
                              }
                            }}
                            className="text-xs border rounded px-2 py-1"
                            defaultValue=""
                          >
                            <option value="">Select Location</option>
                            {selectedProject.locations?.map((loc, idx) => (
                              <option key={idx} value={loc.name}>{loc.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

