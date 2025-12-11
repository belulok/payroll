'use client';

import { useState, useMemo } from 'react';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useInvoices, useDeleteInvoice, useGenerateInvoice, Invoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useCompany } from '@/contexts/CompanyContext';

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { selectedCompany } = useCompany();
  const { data: invoicesData, isLoading } = useInvoices(selectedCompany?._id);
  const { data: clientsData } = useClients(selectedCompany?._id);
  const { data: projectsData } = useProjects(selectedCompany?._id);
  const deleteInvoiceMutation = useDeleteInvoice();
  const generateInvoiceMutation = useGenerateInvoice();

  const invoices = invoicesData?.data || [];
  // useClients/useProjects already return plain arrays, not a { data: [] } wrapper
  const clients = clientsData || [];
  const projects = projectsData || [];

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesClient = clientFilter === 'all' || invoice.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  // Stats calculations
  const stats = {
    total: invoices.length,
    draft: invoices.filter((inv: Invoice) => inv.status === 'draft').length,
    sent: invoices.filter((inv: Invoice) => inv.status === 'sent').length,
    paid: invoices.filter((inv: Invoice) => inv.status === 'paid').length,
    overdue: invoices.filter((inv: Invoice) => inv.status === 'overdue').length,
    totalAmount: invoices.reduce((sum: number, inv: Invoice) => sum + inv.grandTotal, 0),
    paidAmount: invoices.filter((inv: Invoice) => inv.status === 'paid')
                       .reduce((sum: number, inv: Invoice) => sum + inv.grandTotal, 0)
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoiceMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete invoice:', error);
        alert('Failed to delete invoice');
      }
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY');
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage client invoices and billing</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Generate Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Paid Amount</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalAmount - stats.paidAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Clients</option>
            {clients.map((client: any) => (
              <option key={client._id} value={client._id}>{client.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice: Invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(invoice.invoiceDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.clientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.projectName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(invoice.startDate)} - {formatDate(invoice.endDate)}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {invoice.periodType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.grandTotal)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.totalHours} hours
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(invoice.dueDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View Invoice"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit Invoice"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Invoice"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <GenerateInvoiceModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          clients={clients}
          projects={projects}
          companyId={selectedCompany?._id}
          onGenerate={generateInvoiceMutation}
        />
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <ViewInvoiceModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}

// Helper to format a Date into the yyyy-MM-dd string expected by <input type="date">
function formatDateInput(date: Date) {
	return date.toISOString().split('T')[0];
}

function getMonthlyOptions(count = 12) {
	const options: { label: string; value: string; start: string; end: string }[] = [];
	const now = new Date();
	const base = new Date(now.getFullYear(), now.getMonth(), 1);

	for (let i = 0; i < count; i++) {
		const start = new Date(base.getFullYear(), base.getMonth() - i, 1);
		const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
		options.push({
			label: start.toLocaleString('en-MY', { month: 'short', year: 'numeric' }),
			value: `${start.getFullYear()}-${start.getMonth() + 1}`,
			start: formatDateInput(start),
			end: formatDateInput(end)
		});
	}

	return options;
}

function getWeeklyOptions(count = 12) {
	const options: { label: string; value: string; start: string; end: string }[] = [];
	const now = new Date();
	const current = new Date(now);
	const day = current.getDay(); // 0 (Sun) - 6 (Sat)
	const diffToMonday = (day + 6) % 7; // Monday as start of week
	current.setDate(current.getDate() - diffToMonday);
	current.setHours(0, 0, 0, 0);

	for (let i = 0; i < count; i++) {
		const start = new Date(current);
		start.setDate(current.getDate() - 7 * i);
		const end = new Date(start);
		end.setDate(start.getDate() + 6);

		options.push({
			label: `Week of ${start.toLocaleDateString('en-MY')} - ${end.toLocaleDateString('en-MY')}`,
			value: formatDateInput(start),
			start: formatDateInput(start),
			end: formatDateInput(end)
		});
	}

	return options;
}

// Generate Invoice Modal Component
function GenerateInvoiceModal({ isOpen, onClose, clients, projects, companyId, onGenerate }: any) {
	const [formData, setFormData] = useState({
		clientId: '',
		projectId: '',
		startDate: '',
		endDate: '',
		periodType: 'monthly' as 'monthly' | 'weekly' | 'custom',
		taxRate: 0
	});
	const [isLoading, setIsLoading] = useState(false);
	const [selectedMonth, setSelectedMonth] = useState('');
	const [selectedWeek, setSelectedWeek] = useState('');

	const monthlyOptions = getMonthlyOptions();
	const weeklyOptions = getWeeklyOptions();

  // Filter projects by selected client. The `client` field can be either
  // a string ObjectId or a populated client object, so we normalise it.
  const filteredProjects = projects.filter((project: any) => {
    if (!formData.clientId) return true;

    const clientField = project.client;
    const projectClientId =
      typeof clientField === 'string'
        ? clientField
        : clientField?._id;

    return projectClientId === formData.clientId;
  });

	const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.projectId || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (!companyId) {
      alert('Please select a company first');
      return;
    }

    setIsLoading(true);
    try {
      await onGenerate.mutateAsync({ ...formData, companyId });
      alert('Invoice generated successfully!');
      onClose();
      setFormData({
        clientId: '',
        projectId: '',
        startDate: '',
        endDate: '',
				periodType: 'monthly',
        taxRate: 0
      });
			setSelectedMonth('');
			setSelectedWeek('');
    } catch (error: any) {
      console.error('Failed to generate invoice:', error);
      alert(error.message || 'Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Generate Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

	        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value, projectId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select Client</option>
              {clients.map((client: any) => (
                <option key={client._id} value={client._id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={!formData.clientId}
            >
              <option value="">Select Project</option>
              {filteredProjects.map((project: any) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>

	          <div>
	            <label className="block text-sm font-medium text-gray-700 mb-1">
	              Period Type *
	            </label>
	            <div className="flex gap-4">
	              <label className="inline-flex items-center">
	                <input
	                  type="radio"
	                  className="h-4 w-4 text-indigo-600 border-gray-300"
	                  value="monthly"
	                  checked={formData.periodType === 'monthly'}
	                  onChange={() => {
	                    setFormData({ ...formData, periodType: 'monthly', startDate: '', endDate: '' });
	                    setSelectedMonth('');
	                    setSelectedWeek('');
	                  }}
	                />
	                <span className="ml-2 text-sm text-gray-700">Months</span>
	              </label>
	              <label className="inline-flex items-center">
	                <input
	                  type="radio"
	                  className="h-4 w-4 text-indigo-600 border-gray-300"
	                  value="weekly"
	                  checked={formData.periodType === 'weekly'}
	                  onChange={() => {
	                    setFormData({ ...formData, periodType: 'weekly', startDate: '', endDate: '' });
	                    setSelectedMonth('');
	                    setSelectedWeek('');
	                  }}
	                />
	                <span className="ml-2 text-sm text-gray-700">Weeks</span>
	              </label>
	              <label className="inline-flex items-center">
	                <input
	                  type="radio"
	                  className="h-4 w-4 text-indigo-600 border-gray-300"
	                  value="custom"
	                  checked={formData.periodType === 'custom'}
	                  onChange={() => {
	                    setFormData({ ...formData, periodType: 'custom', startDate: '', endDate: '' });
	                    setSelectedMonth('');
	                    setSelectedWeek('');
	                  }}
	                />
	                <span className="ml-2 text-sm text-gray-700">Custom</span>
	              </label>
	            </div>
	          </div>

	          {formData.periodType === 'monthly' && (
	            <div>
	              <label className="block text-sm font-medium text-gray-700 mb-1">
	                Month *
	              </label>
	              <select
	                value={selectedMonth}
	                onChange={(e) => {
	                  const value = e.target.value;
	                  setSelectedMonth(value);
	                  const option = monthlyOptions.find((m) => m.value === value);
	                  if (option) {
	                    setFormData({
	                      ...formData,
	                      startDate: option.start,
	                      endDate: option.end
	                    });
	                  }
	                }}
	                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
	                required
	              >
	                <option value="">Select Month</option>
	                {monthlyOptions.map((option) => (
	                  <option key={option.value} value={option.value}>
	                    {option.label}
	                  </option>
	                ))}
	              </select>
	            </div>
	          )}

	          {formData.periodType === 'weekly' && (
	            <div>
	              <label className="block text-sm font-medium text-gray-700 mb-1">
	                Week *
	              </label>
	              <select
	                value={selectedWeek}
	                onChange={(e) => {
	                  const value = e.target.value;
	                  setSelectedWeek(value);
	                  const option = weeklyOptions.find((w) => w.value === value);
	                  if (option) {
	                    setFormData({
	                      ...formData,
	                      startDate: option.start,
	                      endDate: option.end
	                    });
	                  }
	                }}
	                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
	                required
	              >
	                <option value="">Select Week</option>
	                {weeklyOptions.map((option) => (
	                  <option key={option.value} value={option.value}>
	                    {option.label}
	                  </option>
	                ))}
	              </select>
	            </div>
	          )}

	          {formData.periodType === 'custom' && (
	            <div className="grid grid-cols-2 gap-4">
	              <div>
	                <label className="block text-sm font-medium text-gray-700 mb-1">
	                  Start Date *
	                </label>
	                <input
	                  type="date"
	                  value={formData.startDate}
	                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
	                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
	                  required
	                />
	              </div>
	              <div>
	                <label className="block text-sm font-medium text-gray-700 mb-1">
	                  End Date *
	                </label>
	                <input
	                  type="date"
	                  value={formData.endDate}
	                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
	                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
	                  required
	                />
	              </div>
	            </div>
	          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Invoice Modal Component - styled similar to Weekly Timesheet viewer
function ViewInvoiceModal({ isOpen, onClose, invoice }: any) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!isOpen) return null;

  // Local currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount || 0);
  };

  const items = invoice.items || [];
  const companyName = invoice.companyId?.name || 'Company Name';
  const clientName = invoice.clientName || invoice.clientId?.name || 'Client';
  const projectName = invoice.projectName || invoice.projectId?.name || 'Project';

  // Get number of days in the period
  const startDate = new Date(invoice.startDate);
  const endDate = new Date(invoice.endDate);
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysArray = Array.from({ length: Math.min(daysInPeriod, 31) }, (_, i) => i + 1);

  // Group items by team/group
  const groupedItems = items.reduce((acc: any, item: any) => {
    const team = item.team || item.workerGroup || 'Unassigned';
    if (!acc[team]) acc[team] = [];
    acc[team].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[85vh] overflow-hidden flex flex-col">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white">Invoice</h2>
            <p className="text-sm text-indigo-100 mt-0.5">
              {clientName} • {projectName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Page navigation */}
            <div className="flex items-center gap-1 bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setCurrentPage(1)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-white text-indigo-600'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentPage === 2
                    ? 'bg-white text-indigo-600'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                Timesheet Details
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-sm transition-colors"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {currentPage === 1 ? (
            // PAGE 1: Invoice Summary
            <div className="space-y-4 h-full flex flex-col">
              {/* Company & Invoice header block */}
              <div className="flex flex-col md:flex-row md:justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="flex gap-3">
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold text-xl">
                      {companyName?.[0] || 'C'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">{companyName}</p>
                    <p className="text-xs text-gray-500">Company address line 1 • Address line 2</p>
                  </div>
                </div>
                <div className="text-xs min-w-[200px] bg-gray-50 rounded-lg p-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span className="text-gray-500">Invoice No.</span>
                    <span className="font-semibold text-gray-900 text-right">{invoice.invoiceNumber}</span>
                    <span className="text-gray-500">Date</span>
                    <span className="text-gray-900 text-right">{new Date(invoice.invoiceDate).toLocaleDateString('en-MY')}</span>
                    <span className="text-gray-500">Payment Term</span>
                    <span className="text-gray-900 text-right">{invoice.paymentTerms || '30 days'}</span>
                    <span className="text-gray-500">Due Date</span>
                    <span className="text-gray-900 text-right">{new Date(invoice.dueDate).toLocaleDateString('en-MY')}</span>
                  </div>
                </div>
              </div>

              {/* Bill To & Project - inline with header */}
              <div className="flex gap-6 text-sm">
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Bill To</h3>
                  <p className="font-semibold text-gray-900">{clientName}</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Project</h3>
                  <p className="font-semibold text-gray-900">{projectName}</p>
                  <p className="text-xs text-gray-500">
                    Period: {startDate.toLocaleDateString('en-MY')} - {endDate.toLocaleDateString('en-MY')}
                  </p>
                </div>
              </div>

              {/* Items table - expands to fill space */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-xs font-semibold text-gray-700 mb-1">Worker Breakdown</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden flex-1">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">No.</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Worker</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Hours</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Rate</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Claim</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                            No worker items on this invoice.
                          </td>
                        </tr>
                      ) : (
                        items.map((item: any, index: number) => (
                          <tr key={item.workerId || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-700">{index + 1}</td>
                            <td className="px-3 py-2 text-gray-900">
                              <div className="font-medium">{item.workerName}</div>
                              {item.team && (
                                <div className="text-[11px] text-gray-500">{item.team}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {item.totalHours?.toFixed ? item.totalHours.toFixed(2) : item.totalHours || 0}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatCurrency(item.normalRate || 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatCurrency(item.totalAmount || 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatCurrency(item.claimAmount || 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              {formatCurrency((item.totalAmount || 0) + (item.claimAmount || 0))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals - right aligned */}
              <div className="flex justify-end">
                <div className="w-72 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(invoice.subtotalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Tax ({(invoice.taxRate || 0).toFixed(2)}%)</span>
                    <span className="text-gray-900">{formatCurrency(invoice.taxAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Claims</span>
                    <span className="text-gray-900">{formatCurrency(invoice.totalClaimAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-300 text-sm font-bold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-900">{formatCurrency(invoice.grandTotal || 0)}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 pt-1">
                    Malaysian Ringgit: <span className="italic">amount in words (coming soon)</span>
                  </p>
                </div>
              </div>

              {/* Signature section - full width */}
              <div className="flex gap-12 pt-4 border-t border-gray-200 mt-auto">
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prepared By</p>
                  <div className="h-10 border-b border-gray-300" />
                  <p className="text-[10px] text-gray-500">Account &amp; Billing</p>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Customer Acknowledgment</p>
                  <div className="h-10 border-b border-gray-300" />
                  <p className="text-[10px] text-gray-500">Accepted By</p>
                </div>
              </div>
            </div>
          ) : (
            // PAGE 2: Detailed Timesheet Breakdown
            <div className="space-y-3 max-w-full h-full flex flex-col">
              {/* Header info - compact */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Timesheet Details</h3>
                  <p className="text-xs text-gray-500">
                    Period: {startDate.toLocaleDateString('en-MY')} - {endDate.toLocaleDateString('en-MY')}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-gray-500">{projectName}</p>
                </div>
              </div>

              {/* Timesheet Table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto flex-1">
                <table className="min-w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[80px]">TEAM</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-700 sticky left-[80px] bg-gray-100 z-10 min-w-[100px]">NAME</th>
                      <th className="border border-gray-200 px-1 py-1.5 text-center font-semibold text-gray-700 min-w-[50px]">TYPE</th>
                      {/* Day columns */}
                      {daysArray.map(day => (
                        <th key={day} className="border border-gray-200 px-1 py-1.5 text-center font-semibold text-gray-700 min-w-[28px]">
                          {day}
                        </th>
                      ))}
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[50px]">RATE</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[60px]">TOTAL HRS</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[40px]">DAYS</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[60px]">HOURS</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[80px]">TOTAL (RM)</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[70px]">CLAIM PH</th>
                      <th className="border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700 min-w-[90px] bg-yellow-50">G/TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedItems).map(([team, teamItems]: [string, any]) => (
                      teamItems.map((item: any, itemIdx: number) => {
                        // Generate rows for NORMAL, OT, SUN, PH
                        const rowTypes = [
                          { type: 'NORMAL', hours: item.normalHours || item.totalNormalHours || 0, rate: item.normalRate || 0, daily: item.dailyNormalHours || [], color: '' },
                          { type: 'OT', hours: item.otHours || item.totalOTHours || 0, rate: item.otRate || (item.normalRate * 1.5) || 0, daily: item.dailyOTHours || [], color: 'bg-yellow-50' },
                          { type: 'SUN', hours: item.sundayHours || 0, rate: item.sundayRate || (item.normalRate * 2) || 0, daily: item.dailySundayHours || [], color: 'bg-orange-50' },
                          { type: 'PH', hours: item.phHours || 0, rate: item.phRate || (item.normalRate * 2) || 0, daily: item.dailyPHHours || [], color: 'bg-red-50' },
                        ];

                        return rowTypes.map((row, rowIdx) => (
                          <tr key={`${item.workerId}-${row.type}`} className={`${row.color} hover:bg-gray-50`}>
                            {/* Team - only show on first row of first item */}
                            {rowIdx === 0 && itemIdx === 0 ? (
                              <td rowSpan={teamItems.length * 4} className="border border-gray-200 px-2 py-1 text-gray-900 font-medium sticky left-0 bg-white align-top">
                                {team}
                              </td>
                            ) : rowIdx === 0 ? null : null}
                            {/* Skip team cell for non-first rows */}
                            {rowIdx !== 0 || itemIdx !== 0 ? null : null}

                            {/* Name - only show on first row type */}
                            {rowIdx === 0 ? (
                              <td rowSpan={4} className="border border-gray-200 px-2 py-1 text-gray-900 font-medium sticky left-[80px] bg-white align-top">
                                {item.workerName}
                              </td>
                            ) : null}

                            {/* Type */}
                            <td className={`border border-gray-200 px-1 py-1 text-center text-gray-700 ${row.color}`}>
                              {row.type}
                            </td>

                            {/* Daily hours */}
                            {daysArray.map((day, dayIdx) => {
                              const dailyHour = row.daily[dayIdx] || (row.type === 'NORMAL' ? (dayIdx < 5 ? 8 : 0) : (row.type === 'OT' ? (dayIdx < 5 ? 3 : 0) : 0));
                              return (
                                <td key={day} className={`border border-gray-200 px-1 py-1 text-center text-gray-600 ${row.color}`}>
                                  {dailyHour > 0 ? dailyHour.toFixed(1) : ''}
                                </td>
                              );
                            })}

                            {/* Rate */}
                            <td className={`border border-gray-200 px-2 py-1 text-right text-gray-700 ${row.color}`}>
                              {row.rate > 0 ? row.rate.toFixed(2) : ''}
                            </td>

                            {/* Total Hours for this type */}
                            <td className={`border border-gray-200 px-2 py-1 text-right text-gray-700 ${row.color}`}>
                              {row.hours > 0 ? row.hours.toFixed(2) : ''}
                            </td>

                            {/* Days - only show on first row */}
                            {rowIdx === 0 ? (
                              <td rowSpan={4} className="border border-gray-200 px-2 py-1 text-right text-gray-900 font-semibold bg-white align-middle">
                                {item.daysWorked || Math.ceil((item.totalHours || 0) / 8)}
                              </td>
                            ) : null}

                            {/* Hours breakdown */}
                            <td className={`border border-gray-200 px-2 py-1 text-right text-gray-600 ${row.color}`}>
                              {row.hours > 0 ? (row.hours * (row.rate || 0)).toFixed(2) : ''}
                            </td>

                            {/* Total (RM) for this row type */}
                            <td className={`border border-gray-200 px-2 py-1 text-right text-gray-700 ${row.color}`}>
                              {row.hours > 0 ? (row.hours * row.rate).toFixed(2) : ''}
                            </td>

                            {/* Claim PH - only show on PH row */}
                            {row.type === 'PH' ? (
                              <td className="border border-gray-200 px-2 py-1 text-right text-blue-600 font-medium bg-blue-50">
                                {(item.claimAmount || 0).toFixed(2)}
                              </td>
                            ) : (
                              <td className={`border border-gray-200 px-2 py-1 ${row.color}`}></td>
                            )}

                            {/* Grand Total - only show on first row */}
                            {rowIdx === 0 ? (
                              <td rowSpan={4} className="border border-gray-200 px-2 py-1 text-right font-bold text-gray-900 bg-yellow-50 align-middle">
                                {((item.totalAmount || 0) + (item.claimAmount || 0)).toFixed(2)}
                              </td>
                            ) : null}
                          </tr>
                        ));
                      })
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 font-bold">
                      <td colSpan={3 + daysArray.length} className="border border-gray-300 px-2 py-2 text-right text-gray-900">
                        GRAND TOTAL
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900">
                        -
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900">
                        {items.reduce((sum: number, item: any) => sum + (item.totalHours || 0), 0).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900">
                        {items.reduce((sum: number, item: any) => sum + (item.daysWorked || Math.ceil((item.totalHours || 0) / 8)), 0)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900">
                        -
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900">
                        {formatCurrency(invoice.subtotalAmount || 0)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-blue-700">
                        {formatCurrency(invoice.totalClaimAmount || 0)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 bg-yellow-100">
                        {formatCurrency(invoice.grandTotal || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary Breakdown Section */}
              <div className="flex justify-between items-start gap-6 pt-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[10px] text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-white border border-gray-300 rounded-sm"></div>
                    <span>NORMAL</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-50 border border-gray-300 rounded-sm"></div>
                    <span>OT (Overtime)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-50 border border-gray-300 rounded-sm"></div>
                    <span>SUN (Sunday)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-50 border border-gray-300 rounded-sm"></div>
                    <span>PH (Public Holiday)</span>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="border border-gray-300 rounded-lg overflow-hidden min-w-[380px]">
                  {/* Rates Section */}
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="text-right pr-3 text-red-600 font-medium">NORMAL</td>
                          <td className="text-left text-gray-900">{items[0]?.normalRate?.toFixed(2) || '15.00'}</td>
                        </tr>
                        <tr>
                          <td className="text-right pr-3 text-red-600 font-medium">OT</td>
                          <td className="text-left text-gray-900">{items[0]?.otRate?.toFixed(2) || ((items[0]?.normalRate || 15) * 1.5).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="text-right pr-3 text-red-600 font-medium">PH</td>
                          <td className="text-left text-gray-900">{items[0]?.phRate?.toFixed(2) || ((items[0]?.normalRate || 15) * 2).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Hours Breakdown */}
                  <div className="px-3 py-2 border-b border-gray-300">
                    <table className="w-full text-xs">
                      <tbody>
                        {(() => {
                          const totalNormalHours = items.reduce((sum: number, item: any) => sum + (item.normalHours || item.totalNormalHours || 0), 0);
                          const totalOTHours = items.reduce((sum: number, item: any) => sum + (item.otHours || item.totalOTHours || 0), 0);
                          const totalSundayHours = items.reduce((sum: number, item: any) => sum + (item.sundayHours || 0), 0);
                          const totalPHHours = items.reduce((sum: number, item: any) => sum + (item.phHours || 0), 0);

                          const normalRate = items[0]?.normalRate || 15;
                          const otRate = items[0]?.otRate || normalRate * 1.5;
                          const sundayRate = items[0]?.sundayRate || normalRate * 2;
                          const phRate = items[0]?.phRate || normalRate * 2;

                          const normalAmount = totalNormalHours * normalRate;
                          const otAmount = totalOTHours * otRate;
                          const sundayAmount = totalSundayHours * sundayRate;
                          const phAmount = totalPHHours * phRate;

                          return (
                            <>
                              <tr>
                                <td className="text-right pr-2 font-semibold text-gray-700">NORMAL</td>
                                <td className="text-right pr-2 text-gray-600 w-16">{totalNormalHours.toFixed(2)}</td>
                                <td className="text-right pr-2 text-gray-600 w-20">{normalRate.toFixed(2)}</td>
                                <td className="text-right font-medium text-gray-900 w-24">{normalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr>
                                <td className="text-right pr-2 font-semibold text-gray-700">OT</td>
                                <td className="text-right pr-2 text-gray-600">{totalOTHours.toFixed(2)}</td>
                                <td className="text-right pr-2 text-gray-600">{otRate.toFixed(2)}</td>
                                <td className="text-right font-medium text-gray-900">{otAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr>
                                <td className="text-right pr-2 font-semibold text-gray-700">SUNDAY</td>
                                <td className="text-right pr-2 text-gray-600">{totalSundayHours.toFixed(2)}</td>
                                <td className="text-right pr-2 text-gray-600">{sundayRate.toFixed(2)}</td>
                                <td className="text-right font-medium text-gray-900">{sundayAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                              </tr>
                              <tr>
                                <td className="text-right pr-2 font-semibold text-gray-700">PH</td>
                                <td className="text-right pr-2 text-gray-600">{totalPHHours.toFixed(2)}</td>
                                <td className="text-right pr-2 text-gray-600">{phRate.toFixed(2)}</td>
                                <td className="text-right font-medium text-gray-900">{phAmount > 0 ? phAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 }) : '-'}</td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Claim PH */}
                  <div className="px-3 py-2 border-b border-gray-300 bg-blue-50">
                    <div className="flex justify-between text-xs">
                      <span className="text-red-600 font-semibold">CLAIM PH</span>
                      <span className="text-red-600 font-medium">RM</span>
                      <span className="font-bold text-red-600 min-w-[80px] text-right">
                        {(invoice.totalClaimAmount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="px-3 py-2 bg-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-900">GRAND TOTAL</span>
                      <span className="text-red-600 font-medium">RM</span>
                      <span className="font-bold text-red-600 min-w-[80px] text-right">
                        {(invoice.grandTotal || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - compact */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              Page {currentPage} of 2
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(2, p + 1))}
              disabled={currentPage === 2}
              className="px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 text-xs font-medium text-gray-700"
            >
              Close
            </button>
            <button className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium">
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

