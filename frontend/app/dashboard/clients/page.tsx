'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import feathersClient from '@/lib/feathers';
import { BuildingOffice2Icon, UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

interface User {
  _id: string;
  role: 'admin' | 'agent' | 'subcon-admin' | 'worker' | 'user';
  company?: string;
}

interface Company {
  _id: string;
  name: string;
}

interface Client {
  _id: string;
  name: string;
  company: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  timesheetSettings?: {
    minuteIncrement: 1 | 5 | 6 | 10 | 15 | 30 | 60;
    roundingMethod: 'nearest' | 'up' | 'down';
    minHoursPerDay: number;
    maxHoursPerDay: number;
    allowOvertime: boolean;
    maxOTHoursPerDay: number;
  };
  isActive: boolean;
}

interface ProjectLocation {
  _id?: string;
  name: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  isDefault?: boolean;
}

interface Project {
  _id: string;
  name: string;
  company: string;
  client: string | Client;
  projectCode?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  locations?: ProjectLocation[];
  location?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  isActive: boolean;
}

// Client Form Modal Component with Tabs
function ClientFormModal({ client, onClose, onSave, currentUser, companies, selectedCompanyId }: {
  client: Client | null;
  onClose: () => void;
  onSave: (data: Partial<Client>) => void;
  currentUser: User | null;
  companies: Company[];
  selectedCompanyId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'timesheet'>('basic');
  const [formData, setFormData] = useState({
    name: client?.name || '',
    contactPerson: client?.contactPerson || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: {
      street: client?.address?.street || '',
      city: client?.address?.city || '',
      state: client?.address?.state || '',
      postcode: client?.address?.postcode || '',
      country: client?.address?.country || 'Malaysia'
    },
    timesheetSettings: {
	      minuteIncrement: client?.timesheetSettings?.minuteIncrement || 30,
	      roundingMethod: client?.timesheetSettings?.roundingMethod || 'nearest',
	      minHoursPerDay: client?.timesheetSettings?.minHoursPerDay || 0,
	      maxHoursPerDay: client?.timesheetSettings?.maxHoursPerDay || 24,
	      allowOvertime: client?.timesheetSettings?.allowOvertime !== false,
	      maxOTHoursPerDay: client?.timesheetSettings?.maxOTHoursPerDay || 4
	    },
    isActive: client?.isActive !== undefined ? client.isActive : true,
    company: client?.company || selectedCompanyId || ''
  });

  const isAdminOrAgent = currentUser?.role === 'admin' || currentUser?.role === 'agent';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Partial<Client> = { ...formData };

    if (client) {
      delete (payload as any).company;
    } else {
      if (!isAdminOrAgent) {
        delete (payload as any).company;
      } else {
        if (!payload.company) {
          alert('Please select a company for this client.');
          return;
        }
      }
    }

    onSave(payload);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '🏢' },
    { id: 'address', label: 'Address', icon: '📍' },
    { id: 'timesheet', label: 'Timesheet', icon: '⏱️' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={() => {
              onClose();
              setActiveTab('basic');
            }}
            className="text-white hover:text-indigo-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Company Assignment - only for admin/agent when creating */}
                {isAdminOrAgent && !client && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-amber-800 mb-2">
                      Company Assignment *
                    </label>
                    <select
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., ABC Corporation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="contact@client.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="+60123456789"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer mt-6">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active Client</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Kuala Lumpur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Selangor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={formData.address.postcode}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postcode: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="50000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Malaysia"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Timesheet Settings Tab */}
            {activeTab === 'timesheet' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-4">
                    💡 Configure how timesheet hours are recorded and calculated for workers assigned to this client's projects.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Increment
                      </label>
                      <select
                        value={formData.timesheetSettings.minuteIncrement}
                        onChange={(e) => setFormData({
                          ...formData,
                          timesheetSettings: { ...formData.timesheetSettings, minuteIncrement: parseInt(e.target.value) as 1 | 5 | 6 | 10 | 15 | 30 | 60 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        <option value={1}>Every 1 minute</option>
                        <option value={5}>Every 5 minutes</option>
                        <option value={6}>Every 6 minutes (0.1 hr)</option>
                        <option value={10}>Every 10 minutes</option>
                        <option value={15}>Every 15 minutes (0.25 hr)</option>
                        <option value={30}>Every 30 minutes (0.5 hr)</option>
                        <option value={60}>Every 60 minutes (1 hr)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Minimum time unit for recording</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rounding Method
                      </label>
                      <select
                        value={formData.timesheetSettings.roundingMethod}
                        onChange={(e) => setFormData({
                          ...formData,
                          timesheetSettings: { ...formData.timesheetSettings, roundingMethod: e.target.value as 'nearest' | 'up' | 'down' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        <option value="nearest">Round to Nearest</option>
                        <option value="up">Always Round Up</option>
                        <option value="down">Always Round Down</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">How to round actual time</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Normal Hours/Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={formData.timesheetSettings.maxHoursPerDay}
                        onChange={(e) => setFormData({
                          ...formData,
                          timesheetSettings: { ...formData.timesheetSettings, maxHoursPerDay: parseInt(e.target.value) || 24 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max OT Hours/Day
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={formData.timesheetSettings.maxOTHoursPerDay}
                        onChange={(e) => setFormData({
                          ...formData,
                          timesheetSettings: { ...formData.timesheetSettings, maxOTHoursPerDay: parseInt(e.target.value) || 4 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.timesheetSettings.allowOvertime}
                        onChange={(e) => setFormData({
                          ...formData,
                          timesheetSettings: { ...formData.timesheetSettings, allowOvertime: e.target.checked }
                        })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Allow Overtime Recording</span>
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Preview</h4>
                  <p className="text-xs text-gray-600">
                    Example: If worker clocks 8 hours 10 minutes (490 min), it will be recorded as{' '}
                    <span className="font-bold text-indigo-600">
                      {(() => {
                        const totalMinutes = 490; // 8h 10m
                        const increment = formData.timesheetSettings.minuteIncrement;
                        let roundedMinutes;
                        if (formData.timesheetSettings.roundingMethod === 'nearest') {
                          roundedMinutes = Math.round(totalMinutes / increment) * increment;
                        } else if (formData.timesheetSettings.roundingMethod === 'up') {
                          roundedMinutes = Math.ceil(totalMinutes / increment) * increment;
                        } else {
                          roundedMinutes = Math.floor(totalMinutes / increment) * increment;
                        }
                        const hours = Math.floor(roundedMinutes / 60);
                        const mins = roundedMinutes % 60;
                        return `${hours}h ${mins}m (${(roundedMinutes / 60).toFixed(2)} hrs)`;
                      })()}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="flex gap-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabOrder = ['basic', 'address', 'timesheet'] as const;
                    const currentIdx = tabOrder.indexOf(activeTab);
                    if (currentIdx > 0) setActiveTab(tabOrder[currentIdx - 1]);
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  ← Previous
                </button>
              )}
              {activeTab !== 'timesheet' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabOrder = ['basic', 'address', 'timesheet'] as const;
                    const currentIdx = tabOrder.indexOf(activeTab);
                    if (currentIdx < tabOrder.length - 1) setActiveTab(tabOrder[currentIdx + 1]);
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Next →
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveTab('basic');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {client ? 'Update Client' : 'Create Client'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Project Form Modal Component with Tabs and Multiple Locations
function ProjectFormModal({ project, clients, onClose, onSave }: {
  project: Project | null;
  clients: Client[];
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'basic' | 'locations'>('basic');
  const [formData, setFormData] = useState({
    name: project?.name || '',
    client: typeof project?.client === 'string' ? project.client : project?.client?._id || '',
    projectCode: project?.projectCode || '',
    description: project?.description || '',
    startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
    endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
    status: project?.status || 'active' as const,
    locations: project?.locations || [] as ProjectLocation[]
  });

  // New location form
  const [newLocation, setNewLocation] = useState<ProjectLocation>({
    name: '',
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Malaysia',
    isDefault: false
  });
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (!dataToSave.client) {
      delete (dataToSave as any).client;
    }
    // Ensure at least one location is marked as default
    if (dataToSave.locations.length > 0 && !dataToSave.locations.some(l => l.isDefault)) {
      dataToSave.locations[0].isDefault = true;
    }
    onSave(dataToSave);
  };

  const addLocation = () => {
    if (!newLocation.name.trim()) {
      alert('Location name is required');
      return;
    }
    const locationToAdd = {
      ...newLocation,
      isDefault: formData.locations.length === 0 // First location is default
    };
    setFormData({
      ...formData,
      locations: [...formData.locations, locationToAdd]
    });
    setNewLocation({
      name: '',
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: 'Malaysia',
      isDefault: false
    });
  };

  const updateLocation = (index: number) => {
    const updated = [...formData.locations];
    updated[index] = newLocation;
    setFormData({ ...formData, locations: updated });
    setEditingLocationIndex(null);
    setNewLocation({
      name: '',
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: 'Malaysia',
      isDefault: false
    });
  };

  const removeLocation = (index: number) => {
    const updated = formData.locations.filter((_, i) => i !== index);
    // If we removed the default, make the first one default
    if (updated.length > 0 && !updated.some(l => l.isDefault)) {
      updated[0].isDefault = true;
    }
    setFormData({ ...formData, locations: updated });
  };

  const setDefaultLocation = (index: number) => {
    const updated = formData.locations.map((loc, i) => ({
      ...loc,
      isDefault: i === index
    }));
    setFormData({ ...formData, locations: updated });
  };

  const startEditLocation = (index: number) => {
    setEditingLocationIndex(index);
    setNewLocation({ ...formData.locations[index] });
  };

  const cancelEdit = () => {
    setEditingLocationIndex(null);
    setNewLocation({
      name: '',
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: 'Malaysia',
      isDefault: false
    });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'locations', label: 'Locations', icon: '📍', badge: formData.locations.length },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {project ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button
            onClick={() => {
              onClose();
              setActiveTab('basic');
            }}
            className="text-white hover:text-emerald-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g., Office Building Construction"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Unassigned</option>
                      {clients.filter(c => c.isActive).map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                    <input
                      type="text"
                      value={formData.projectCode}
                      onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g., PRJ-2024-001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={2}
                      placeholder="Project description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    📍 Add multiple work locations for this project. These locations will be available for selection in timesheets and worker assignments.
                  </p>
                </div>

                {/* Existing Locations */}
                {formData.locations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Project Locations ({formData.locations.length})</h4>
                    {formData.locations.map((loc, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-3 ${loc.isDefault ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{loc.name}</span>
                              {loc.isDefault && (
                                <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {[loc.street, loc.city, loc.state, loc.postcode, loc.country].filter(Boolean).join(', ') || 'No address specified'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!loc.isDefault && (
                              <button
                                type="button"
                                onClick={() => setDefaultLocation(index)}
                                className="p-1 text-gray-400 hover:text-emerald-600 text-xs"
                                title="Set as default"
                              >
                                ⭐
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditLocation(index)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLocation(index)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Location Form */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    {editingLocationIndex !== null ? '✏️ Edit Location' : '➕ Add New Location'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Location Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="e.g., Main Site, Block A, Ground Floor"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Street</label>
                      <input
                        type="text"
                        value={newLocation.street}
                        onChange={(e) => setNewLocation({ ...newLocation, street: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="Street address"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        value={newLocation.city}
                        onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                      <input
                        type="text"
                        value={newLocation.state}
                        onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                      <input
                        type="text"
                        value={newLocation.postcode}
                        onChange={(e) => setNewLocation({ ...newLocation, postcode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="Postcode"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                      <input
                        type="text"
                        value={newLocation.country}
                        onChange={(e) => setNewLocation({ ...newLocation, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {editingLocationIndex !== null ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateLocation(editingLocationIndex)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Update Location
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={addLocation}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                      >
                        + Add Location
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="flex gap-2">
              {activeTab === 'locations' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  ← Previous
                </button>
              )}
              {activeTab === 'basic' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('locations')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Next →
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveTab('basic');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                {project ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { selectedCompany } = useCompany();
	  const { data: companies = [] } = useCompanies();

	  const [currentUser, setCurrentUser] = useState<User | null>(null);

	  useEffect(() => {
	    const fetchCurrentUser = async () => {
	      try {
	        const auth = await feathersClient.get('authentication');
	        if (auth && auth.user) {
	          setCurrentUser(auth.user);
	        }
	      } catch (error) {
	        console.error('Error fetching current user:', error);
	      }
	    };
	    fetchCurrentUser();
	  }, []);

  // Use TanStack Query hooks for Clients
  const { data: clients = [], isLoading: loadingClients } = useClients(selectedCompany?._id);
  const createClient = useCreateClient(selectedCompany?._id);
  const updateClient = useUpdateClient(selectedCompany?._id);
  const deleteClient = useDeleteClient(selectedCompany?._id);

  // Use TanStack Query hooks for Projects
  const { data: projects = [], isLoading: loadingProjects } = useProjects(selectedCompany?._id);
  const createProject = useCreateProject(selectedCompany?._id);
  const updateProject = useUpdateProject(selectedCompany?._id);
  const deleteProject = useDeleteProject(selectedCompany?._id);

  // Tab state
  const [activeTab, setActiveTab] = useState<'clients' | 'projects'>('clients');

  // Client state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientFilter, setClientFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Project state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectFilter, setProjectFilter] = useState<'all' | 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'>('all');

  // Client handlers
  const handleAddClient = () => {
    setSelectedClient(null);
    setShowAddClientModal(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditClientModal(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await deleteClient.mutateAsync(clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (selectedClient) {
        await updateClient.mutateAsync({
          id: selectedClient._id,
          data: clientData
        });
      } else {
        await createClient.mutateAsync(clientData);
      }
      setShowAddClientModal(false);
      setShowEditClientModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client');
    }
  };

  // Project handlers
  const handleAddProject = () => {
    setSelectedProject(null);
    setShowAddProjectModal(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowEditProjectModal(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject.mutateAsync(projectId);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      console.log('💾 handleSaveProject received data:', projectData);
      console.log('💾 Client field in data:', projectData.client);

      if (selectedProject) {
        console.log('💾 Updating project:', selectedProject._id);
        const result = await updateProject.mutateAsync({
          id: selectedProject._id,
          data: projectData
        });
        console.log('✅ Update result:', result);
      } else {
        console.log('💾 Creating new project');
        const result = await createProject.mutateAsync(projectData);
        console.log('✅ Create result:', result);
      }
      setShowAddProjectModal(false);
      setShowEditProjectModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('❌ Error saving project:', error);
      alert('Failed to save project');
    }
  };

  const loading = loadingClients || loadingProjects;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const filteredClients = clients.filter(client => {
    if (clientFilter === 'active') return client.isActive;
    if (clientFilter === 'inactive') return !client.isActive;
    return true;
  });

  const filteredProjects = projects.filter(project => {
    // Filter based on status field
    if (projectFilter === 'all') return true;
    return project.status === projectFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clients & Projects</h1>
        <p className="text-gray-600 mt-2">Manage clients and projects for {selectedCompany?.name}</p>
      </div>

      {/* Main Tabs - Prominent at the top */}
      <div className="flex items-center justify-between gap-4">
        <div className="border-b border-gray-200 inline-flex gap-8">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'clients'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BuildingOffice2Icon className="h-5 w-5" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'projects'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BriefcaseIcon className="h-5 w-5" />
            Projects
          </button>
        </div>

        <button
          onClick={activeTab === 'clients' ? handleAddClient : handleAddProject}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {activeTab === 'clients' ? 'Add Client' : 'Add Project'}
        </button>
      </div>

      {/* Clients Tab Content */}
      {activeTab === 'clients' && (
        <>
          {/* Filter Tabs - Below main tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => setClientFilter('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                clientFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Clients ({clients.length})
            </button>
            <button
              onClick={() => setClientFilter('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                clientFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Active ({clients.filter(c => c.isActive).length})
            </button>
            <button
              onClick={() => setClientFilter('inactive')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                clientFilter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Inactive ({clients.filter(c => !c.isActive).length})
            </button>
          </div>

          {/* Clients Grid */}
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <BuildingOffice2Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first client</p>
              <button
                onClick={handleAddClient}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Client
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <div
                  key={client._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.contactPerson && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <UserIcon className="h-4 w-4" />
                        <span>{client.contactPerson}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <PhoneIcon className="h-4 w-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (client.address.city || client.address.state) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPinIcon className="h-4 w-4" />
                        <span>
                          {[client.address.city, client.address.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Projects Tab Content */}
      {activeTab === 'projects' && (
        <>
          {/* Filter Tabs - Below main tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex flex-wrap gap-1">
            <button
              onClick={() => setProjectFilter('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                projectFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setProjectFilter('planning')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                projectFilter === 'planning' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Planning ({projects.filter(p => p.status === 'planning').length})
            </button>
            <button
              onClick={() => setProjectFilter('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                projectFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Active ({projects.filter(p => p.status === 'active').length})
            </button>
            <button
              onClick={() => setProjectFilter('on-hold')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                projectFilter === 'on-hold' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              On Hold ({projects.filter(p => p.status === 'on-hold').length})
            </button>
            <button
              onClick={() => setProjectFilter('completed')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                projectFilter === 'completed' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Completed ({projects.filter(p => p.status === 'completed').length})
            </button>
            <button
              onClick={() => setProjectFilter('cancelled')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                projectFilter === 'cancelled' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Cancelled ({projects.filter(p => p.status === 'cancelled').length})
            </button>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <BriefcaseIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first project</p>
              <button
                onClick={handleAddProject}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                // Debug: Log the project client data with full details
                console.log('Project:', project.name);
                console.log('Client type:', typeof project.client);
                console.log('Client value:', project.client);
                console.log('Client is object?', typeof project.client === 'object');
                console.log('Client has name?', project.client && typeof project.client === 'object' ? 'name' in project.client : 'N/A');

                // Properly handle client name - support both populated object and plain ID
                let clientName = 'Unassigned';

                if (project.client) {
                  if (typeof project.client === 'object' && project.client !== null) {
                    // Case 1: backend already populated the client object
                    const clientObj = project.client as Client;
                    if (clientObj.name) {
                      clientName = clientObj.name;
                      console.log('✅ Client name from populated object:', clientName);
                    } else {
                      console.log('❌ Client object exists but has no name property');
                    }
                  } else if (typeof project.client === 'string') {
                    // Case 2: backend returned only the client ID string
                    const clientFromList = clients.find(c => c._id === project.client);
                    if (clientFromList) {
                      clientName = clientFromList.name;
                      console.log('✅ Client name resolved from clients list:', clientName);
                    } else {
                      console.log('❌ Client is string ID but not found in clients list');
                    }
                  }
                } else {
                  console.log('❌ Client is null/undefined');
                }

                const statusColors = {
                  planning: 'bg-blue-100 text-blue-800',
                  active: 'bg-green-100 text-green-800',
                  'on-hold': 'bg-yellow-100 text-yellow-800',
                  completed: 'bg-gray-100 text-gray-800',
                  cancelled: 'bg-red-100 text-red-800'
                };

                return (
                  <div
                    key={project._id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {/* Show only status badge (Planning/Active/On-hold/Completed/Cancelled) */}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <BuildingOffice2Icon className="h-4 w-4" />
                        <span className="font-medium">Client:</span>
                        <span>{clientName}</span>
                      </div>
                      {project.projectCode && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="font-medium">Code:</span>
                          <span>{project.projectCode}</span>
                        </div>
                      )}
                      {project.description && (
                        <div className="text-gray-600 mt-2">
                          <p className="line-clamp-2">{project.description}</p>
                        </div>
                      )}
                      {project.location && (project.location.city || project.location.state) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPinIcon className="h-4 w-4" />
                          <span>
                            {[project.location.city, project.location.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {(project.startDate || project.endDate) && (
                        <div className="flex items-center gap-2 text-gray-600 text-xs mt-2">
                          {project.startDate && (
                            <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                          )}
                          {project.startDate && project.endDate && <span>•</span>}
                          {project.endDate && (
                            <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAddClientModal && (
        <ClientFormModal
          client={null}
          onClose={() => setShowAddClientModal(false)}
	          onSave={handleSaveClient}
	          currentUser={currentUser}
	          companies={companies}
	          selectedCompanyId={selectedCompany?._id}
        />
      )}
      {showEditClientModal && selectedClient && (
        <ClientFormModal
          client={selectedClient}
          onClose={() => {
            setShowEditClientModal(false);
            setSelectedClient(null);
          }}
	          onSave={handleSaveClient}
	          currentUser={currentUser}
	          companies={companies}
	          selectedCompanyId={selectedCompany?._id}
        />
      )}
      {showAddProjectModal && (
        <ProjectFormModal
          project={null}
          clients={clients}
          onClose={() => setShowAddProjectModal(false)}
          onSave={handleSaveProject}
        />
      )}
      {showEditProjectModal && selectedProject && (
        <ProjectFormModal
          project={selectedProject}
          clients={clients}
          onClose={() => {
            setShowEditProjectModal(false);
            setSelectedProject(null);
          }}
          onSave={handleSaveProject}
        />
      )}
    </div>
  );
}

