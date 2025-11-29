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
  isActive: boolean;
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
  location?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  isActive: boolean;
}

// Client Form Modal Component
	function ClientFormModal({ client, onClose, onSave, currentUser, companies, selectedCompanyId }: {
	  client: Client | null;
	  onClose: () => void;
	  onSave: (data: Partial<Client>) => void;
	  currentUser: User | null;
	  companies: Company[];
	  selectedCompanyId?: string;
	}) {
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
	    isActive: client?.isActive !== undefined ? client.isActive : true,
	    company: client?.company || selectedCompanyId || ''
	  });

	  const isAdminOrAgent = currentUser?.role === 'admin' || currentUser?.role === 'agent';

	  const handleSubmit = (e: React.FormEvent) => {
	    e.preventDefault();

	    const payload: Partial<Client> = { ...formData };

	    if (client) {
	      // Editing existing client: do not allow changing company here
	      delete (payload as any).company;
	    } else {
	      // Creating new client
	      if (!isAdminOrAgent) {
	        // For subcon-admin and other roles, rely on selectedCompany / backend rules
	        delete (payload as any).company;
	      } else {
	        // Admin/Agent must choose a company
	        if (!payload.company) {
	          alert('Please select a company for this client.');
	          return;
	        }
	      }
	    }

	    onSave(payload);
	  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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
            </div>
          </div>

	          {/* Company Assignment - only for admin/agent when creating */}
	          {isAdminOrAgent && !client && (
	            <div>
	              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Assignment</h3>
	              <div className="grid grid-cols-1 gap-4">
	                <div>
	                  <label className="block text-sm font-medium text-gray-700 mb-1">
	                    Company <span className="text-red-500">*</span>
	                  </label>
	                  <select
	                    required
	                    value={formData.company}
	                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
	                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
	                  >
	                    <option value="">-- Select Company --</option>
	                    {companies.map((company) => (
	                      <option key={company._id} value={company._id}>
	                        {company.name}
	                      </option>
	                    ))}
	                  </select>
	                </div>
	              </div>
	            </div>
	          )}

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                <input
                  type="text"
                  value={formData.address.postcode}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postcode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">Active Client</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              {client ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Project Form Modal Component
function ProjectFormModal({ project, clients, onClose, onSave }: {
  project: Project | null;
  clients: Client[];
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
}) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    client: typeof project?.client === 'string' ? project.client : project?.client?._id || '',
    projectCode: project?.projectCode || '',
    description: project?.description || '',
    startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
    endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
    status: project?.status || 'active' as const,
    location: {
      street: project?.location?.street || '',
      city: project?.location?.city || '',
      state: project?.location?.state || '',
      postcode: project?.location?.postcode || '',
      country: project?.location?.country || 'Malaysia'
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove client field if it's empty (unassigned)
    const dataToSave = { ...formData };
    if (!dataToSave.client) {
      delete (dataToSave as any).client;
    }
    console.log('📤 ProjectFormModal submitting data:', dataToSave);
    console.log('📤 Client field value:', dataToSave.client);
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {project ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Office Building Construction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={formData.client}
                  onChange={(e) => {
                    console.log('🎯 Client dropdown changed to:', e.target.value);
                    setFormData({ ...formData, client: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., PRJ-2024-001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Project description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

          {/* Location */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                <input
                  type="text"
                  value={formData.location.street}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, street: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.location.city}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.location.state}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, state: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                <input
                  type="text"
                  value={formData.location.postcode}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, postcode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.location.country}
                  onChange={(e) => setFormData({ ...formData, location: { ...formData.location, country: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              {project ? 'Update Project' : 'Create Project'}
            </button>
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

