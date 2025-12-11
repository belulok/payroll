'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetPassword, generatePassword, User, CreateUserData } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import feathersClient from '@/lib/feathers';

const roleLabels: Record<string, { label: string; color: string; description: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800', description: 'Full system access' },
  agent: { label: 'Agent', color: 'bg-blue-100 text-blue-800', description: 'Manage multiple companies' },
  'subcon-admin': { label: 'Subcon Admin', color: 'bg-green-100 text-green-800', description: 'Company administrator' },
  'subcon-clerk': { label: 'Subcon Clerk', color: 'bg-yellow-100 text-yellow-800', description: 'Company data entry' },
  worker: { label: 'Worker', color: 'bg-gray-100 text-gray-800', description: 'View own data only' },
};

// Multi-select dropdown component
function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select..."
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = options
    .filter(opt => selected.includes(opt.value))
    .map(opt => opt.label);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex items-center justify-between"
      >
        <span className={selected.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
          {selected.length === 0
            ? placeholder
            : selected.length === 1
              ? selectedLabels[0]
              : `${selected.length} companies selected`}
        </span>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            <>
              {/* Select All / Clear All */}
              <div className="px-3 py-2 border-b border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => onChange(options.map(o => o.value))}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedLabels.map((label, idx) => (
            <span
              key={selected[idx]}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
            >
              {label}
              <button
                type="button"
                onClick={() => toggleOption(selected[idx])}
                className="hover:text-indigo-900"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<CreateUserData & { companies: string[] }>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'worker',
    company: '',
    companies: [], // For agents
    isActive: true,
  });

  const { data: users = [], isLoading, refetch } = useUsers();
  const { data: companies = [] } = useCompanies();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetPassword();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate();
        setCurrentUser(auth.user);

        // Only admin can access this page
        if (auth.user.role !== 'admin') {
          router.push('/dashboard');
        }
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      // Get companies array for agents
      const userCompanies = user.companies?.map(c => typeof c === 'object' ? c._id : c) || [];
      setFormData({
        email: user.email,
        password: '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        company: typeof user.company === 'object' ? user.company._id : user.company || '',
        companies: userCompanies,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      const newPassword = generatePassword();
      setGeneratedPassword(newPassword);
      setFormData({
        email: '',
        password: newPassword,
        firstName: '',
        lastName: '',
        role: 'worker',
        company: '',
        companies: [],
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setGeneratedPassword('');
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'worker',
      company: '',
      companies: [],
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSend: any = { ...formData };

      // For admin - no company needed
      if (dataToSend.role === 'admin') {
        delete dataToSend.company;
        delete dataToSend.companies;
      }
      // For agent - use companies array, remove single company
      else if (dataToSend.role === 'agent') {
        delete dataToSend.company;
        // Keep companies array
      }
      // For other roles - use single company, remove companies array
      else {
        delete dataToSend.companies;
      }

      // Remove password if editing and no new password
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser._id, data: dataToSend });
        alert('User updated successfully!');
      } else {
        await createUser.mutateAsync(dataToSend);
        alert(`User created successfully!\n\nEmail: ${dataToSend.email}\nPassword: ${generatedPassword}\n\nPlease save this password - it won't be shown again.`);
      }

      handleCloseModal();
      refetch();
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to save user'));
    }
  };

  const handleDelete = async (user: User) => {
    if (user._id === currentUser?._id) {
      alert('You cannot delete your own account!');
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.email}?`)) {
      try {
        await deleteUser.mutateAsync(user._id);
        alert('User deleted successfully!');
        refetch();
      } catch (error: any) {
        alert('Error: ' + (error.message || 'Failed to delete user'));
      }
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    const newPassword = generatePassword();

    try {
      await resetPassword.mutateAsync({ id: selectedUser._id, newPassword });
      alert(`Password reset successfully!\n\nNew Password: ${newPassword}\n\nPlease save this password - it won't be shown again.`);
      setShowPasswordModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to reset password'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const needsSingleCompany = (role: string) => {
    return ['subcon-admin', 'subcon-clerk', 'worker'].includes(role);
  };

  const needsMultipleCompanies = (role: string) => {
    return role === 'agent';
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <UserGroupIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Manage system users and their roles</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              {Object.entries(roleLabels).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserGroupIcon className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user: User) => {
                  const roleConfig = roleLabels[user.role] || roleLabels.worker;

                  // Get company display text
                  let companyDisplay = '-';
                  if (user.role === 'agent' && user.companies && user.companies.length > 0) {
                    const companyNames = user.companies.map(c => typeof c === 'object' ? c.name : c);
                    companyDisplay = companyNames.length > 2
                      ? `${companyNames.slice(0, 2).join(', ')} +${companyNames.length - 2} more`
                      : companyNames.join(', ');
                  } else if (user.company) {
                    companyDisplay = typeof user.company === 'object' ? user.company.name : '-';
                  }

                  return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-medium text-sm">
                                {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email.split('@')[0]}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={companyDisplay}>
                        {companyDisplay}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isActive !== false ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircleIcon className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <XCircleIcon className="h-4 w-4" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyIcon className="h-4 w-4" />
                          </button>
                          {user._id !== currentUser?._id && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={handleCloseModal}></div>

            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as CreateUserData['role'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(roleLabels).map(([key, { label, description }]) => (
                      <option key={key} value={key}>{label} - {description}</option>
                    ))}
                  </select>
                </div>

                {/* Single company for subcon/worker roles */}
                {needsSingleCompany(formData.role) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                    <select
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select a company</option>
                      {companies.map((company: any) => (
                        <option key={company._id} value={company._id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Multiple companies for agent role */}
                {needsMultipleCompanies(formData.role) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Companies
                    </label>
                    <MultiSelectDropdown
                      options={companies.map((c: any) => ({ value: c._id, label: c.name }))}
                      selected={formData.companies || []}
                      onChange={(selected) => setFormData({ ...formData, companies: selected })}
                      placeholder="Select companies..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Select one or more companies this agent can manage</p>
                  </div>
                )}

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Generated Password
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={generatedPassword}
                          readOnly
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedPassword)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          copied
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPass = generatePassword();
                          setGeneratedPassword(newPass);
                          setFormData({ ...formData, password: newPass });
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Generate new password"
                      >
                        <KeyIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Save this password - it will be shown only once!
                    </p>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Account is active
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createUser.isPending || updateUser.isPending}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {createUser.isPending || updateUser.isPending ? 'Saving...' : editingUser ? 'Update' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)}></div>

            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h2>

              <p className="text-gray-600 mb-4">
                Are you sure you want to reset the password for <strong>{selectedUser.email}</strong>?
              </p>

              <p className="text-sm text-gray-500 mb-6">
                A new random password will be generated and displayed. Make sure to save it!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetPassword.isPending}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

