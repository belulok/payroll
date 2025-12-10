'use client';

import { useState, useEffect } from 'react';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';
import { usePayrollRecords, useApprovePayroll, useGeneratePayroll } from '@/hooks/usePayroll';
import { useWorkers } from '@/hooks/useWorkers';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  CreditCardIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface Worker {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  paymentType: string;
}

interface LoanDeduction {
  loanId: string;
  loanCode: string;
  category: 'loan' | 'advance';
  description?: string;
  amount: number;
  remainingAfter: number;
}

interface CustomDeduction {
  name: string;
  description?: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

interface PayrollRecord {
  _id: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: string;
    position?: string;
  };
  company?: {
    _id: string;
    name: string;
  };
  periodStart: string;
  periodEnd: string;
  paymentType: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paymentStatus: string;
  totalHours?: number;
  totalNormalHours?: number;
  totalOT1_5Hours?: number;
  totalOT2_0Hours?: number;
  monthlySalary?: number;
  hourlyRate?: number;
  totalAmount?: number;
  epf?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  socso?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  eis?: {
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
  loanDeductions?: LoanDeduction[];
  totalLoanDeductions?: number;
  customDeductions?: CustomDeduction[];
  totalCustomDeductions?: number;
  deductionConfigType?: 'group' | 'band' | null;
  deductionConfigSource?: string;
  allowances?: Array<{ name: string; amount: number }>;
  otherDeductions?: Array<{ name: string; amount: number }>;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
};

const paymentStatusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: ClockIcon },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircleIcon }
};

export default function PayrollPage() {
  const { selectedCompany } = useCompany();

  // Use TanStack Query hooks
  const { data: payrolls = [], isLoading: loading } = usePayrollRecords(selectedCompany?._id);
  const { data: workers = [] } = useWorkers(selectedCompany?._id);
  const generatePayroll = useGeneratePayroll(selectedCompany?._id);
  const approvePayroll = useApprovePayroll(selectedCompany?._id);

  const [filter, setFilter] = useState<string>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // Generate payroll form state
  const [selectedWorker, setSelectedWorker] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const handleGeneratePayroll = async () => {
    if (!selectedWorker || !periodStart || !periodEnd) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await generatePayroll.mutateAsync({
        workerId: selectedWorker,
        periodStart,
        periodEnd
      });

      alert('Payroll generated successfully!');
      setShowGenerateModal(false);
      setSelectedWorker('');
      setPeriodStart('');
      setPeriodEnd('');
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      alert(error.message || 'Failed to generate payroll');
    }
  };

  const handleViewPayroll = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowViewModal(true);
  };

  const handleGeneratePDF = (payroll: PayrollRecord) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('feathers-jwt');

    if (!token) {
      alert('Please log in to generate PDF');
      return;
    }

    // Open PDF in new tab with token in URL
    const pdfUrl = `/api/payroll/${payroll._id}/pdf?token=${encodeURIComponent(token)}`;
    window.open(pdfUrl, '_blank');
  };

  const handleApprove = async (payrollId: string) => {
    try {
      await approvePayroll.mutateAsync(payrollId);
      alert('Payroll approved successfully!');
    } catch (error) {
      console.error('Error approving payroll:', error);
      alert('Failed to approve payroll');
    }
  };

  const filteredPayrolls = filter === 'all'
    ? payrolls
    : payrolls.filter(p => p.status === filter);

  const totalGrossPay = payrolls.reduce((sum, p) => sum + (p.grossPay || 0), 0);
  const totalNetPay = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const pendingCount = payrolls.filter(p => p.status === 'draft').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600 mt-2">Generate and manage employee payroll</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md"
        >
          Generate Payroll
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{payrolls.length}</p>
            </div>
            <BanknotesIcon className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total Gross Pay</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalGrossPay)}</p>
            </div>
            <BanknotesIcon className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Total Net Pay</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalNetPay)}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({payrolls.length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'draft'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Draft ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({payrolls.filter(p => p.status === 'approved').length})
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gross Pay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deductions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Pay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayrolls.map((payroll) => {
              const status = statusConfig[payroll.status as keyof typeof statusConfig] || statusConfig.draft;
              const paymentStatus = paymentStatusConfig[payroll.paymentStatus as keyof typeof paymentStatusConfig] || paymentStatusConfig.pending;
              const PaymentIcon = paymentStatus.icon;

              return (
                <tr key={payroll._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {payroll.worker?.firstName?.[0]}{payroll.worker?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {payroll.worker?.firstName} {payroll.worker?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{payroll.worker?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{formatDate(payroll.periodStart)}</div>
                    <div className="text-gray-500">to {formatDate(payroll.periodEnd)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {payroll.paymentType === 'monthly-salary' ? 'Monthly' :
                       payroll.paymentType === 'hourly' ? 'Hourly' :
                       payroll.paymentType === 'unit-based' ? 'Unit-Based' : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(payroll.grossPay || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {formatCurrency(payroll.totalDeductions || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(payroll.netPay || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <div className="flex items-center">
                        <PaymentIcon className={`h-3 w-3 mr-1 ${paymentStatus.color.split(' ')[1]}`} />
                        <span className={`text-xs ${paymentStatus.color.split(' ')[1]}`}>
                          {paymentStatus.label}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {payroll.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(payroll._id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleViewPayroll(payroll)}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(payroll)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-900 font-medium"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPayrolls.length === 0 && (
          <div className="text-center py-12">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'Generate payroll to get started.' : 'No payroll records with this status.'}
            </p>
          </div>
        )}
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Generate Payroll</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Worker
                </label>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose a worker...</option>
                  {workers.map((worker) => (
                    <option key={worker._id} value={worker._id}>
                      {worker.firstName} {worker.lastName} ({worker.employeeId}) - {worker.paymentType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayroll}
                disabled={generatePayroll.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatePayroll.isPending ? 'Generating...' : 'Generate Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payroll Modal */}
      {showViewModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            {/* Header - Gradient Style like Timesheet */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <div>
                <h2 className="text-xl font-bold text-white">Payroll Slip</h2>
                <p className="text-sm text-green-100 mt-0.5">
                  {selectedPayroll.worker?.firstName} {selectedPayroll.worker?.lastName} - {selectedPayroll.worker?.employeeId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF(selectedPayroll)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-600 rounded-lg hover:bg-green-50 font-medium text-sm transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-green-100 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Company Name */}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600">{selectedPayroll.company?.name || selectedCompany?.name || 'Company'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Pay Period: {formatDate(selectedPayroll.periodStart)} - {formatDate(selectedPayroll.periodEnd)}
                </p>
              </div>

              {/* Employee Info Grid - Compact like Timesheet */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Employee Name:</span>
                      <span className="text-sm text-gray-900 font-medium">
                        {selectedPayroll.worker?.firstName} {selectedPayroll.worker?.lastName}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-20">Employee ID:</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedPayroll.worker?.employeeId}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Department:</span>
                      <span className="text-sm text-gray-900">{selectedPayroll.worker?.department || '-'}</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-20">Position:</span>
                      <span className="text-sm text-gray-900">{selectedPayroll.worker?.position || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Payment Type:</span>
                      <span className="text-sm text-gray-900 font-medium">
                        {selectedPayroll.paymentType === 'monthly-salary' ? 'Monthly Salary' :
                         selectedPayroll.paymentType === 'hourly' ? 'Hourly' :
                         selectedPayroll.paymentType === 'unit-based' ? 'Unit-Based' : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-20">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedPayroll.status === 'approved' ? 'bg-green-100 text-green-800' :
                        selectedPayroll.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPayroll.status?.charAt(0).toUpperCase() + selectedPayroll.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Earnings & Hours Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <BanknotesIcon className="h-4 w-4" />
                    Earnings
                  </h3>
                </div>
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Qty/Hours</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedPayroll.paymentType === 'monthly-salary' && (
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">Basic Salary</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">1 month</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">-</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(selectedPayroll.monthlySalary || selectedPayroll.grossPay)}
                        </td>
                      </tr>
                    )}
                    {selectedPayroll.paymentType === 'hourly' && (
                      <>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">Regular Hours</td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-center">
                            {selectedPayroll.totalNormalHours?.toFixed(1) || 0}h
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-center">
                            {formatCurrency(selectedPayroll.hourlyRate || 0)}/hr
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency((selectedPayroll.totalNormalHours || 0) * (selectedPayroll.hourlyRate || 0))}
                          </td>
                        </tr>
                        {(selectedPayroll.totalOT1_5Hours || 0) > 0 && (
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-yellow-700">OT 1.5x</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-center">
                              {selectedPayroll.totalOT1_5Hours?.toFixed(1) || 0}h
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-center">
                              {formatCurrency((selectedPayroll.hourlyRate || 0) * 1.5)}/hr
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-yellow-700 text-right">
                              {formatCurrency((selectedPayroll.totalOT1_5Hours || 0) * (selectedPayroll.hourlyRate || 0) * 1.5)}
                            </td>
                          </tr>
                        )}
                        {(selectedPayroll.totalOT2_0Hours || 0) > 0 && (
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-orange-700">OT 2.0x</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-center">
                              {selectedPayroll.totalOT2_0Hours?.toFixed(1) || 0}h
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-center">
                              {formatCurrency((selectedPayroll.hourlyRate || 0) * 2.0)}/hr
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-orange-700 text-right">
                              {formatCurrency((selectedPayroll.totalOT2_0Hours || 0) * (selectedPayroll.hourlyRate || 0) * 2.0)}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                    {/* Allowances */}
                    {selectedPayroll.allowances?.map((allowance, idx) => (
                      <tr key={`allowance-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{allowance.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">-</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">-</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(allowance.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td colSpan={3} className="px-4 py-2 text-sm font-bold text-blue-900">Total Gross Pay</td>
                      <td className="px-4 py-2 text-sm font-bold text-blue-900 text-right">
                        {formatCurrency(selectedPayroll.grossPay)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Deductions Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                      <ArrowTrendingDownIcon className="h-4 w-4" />
                      Deductions
                    </h3>
                    {selectedPayroll.deductionConfigSource && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedPayroll.deductionConfigType === 'group'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {selectedPayroll.deductionConfigType === 'group' ? '👥 Group' : '📊 Band'}: {selectedPayroll.deductionConfigSource}
                      </span>
                    )}
                  </div>
                </div>
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Employee</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Employer</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Deduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* EPF */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">EPF (KWSP)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-center">
                        {formatCurrency(selectedPayroll.epf?.employeeContribution || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-center">
                        {formatCurrency(selectedPayroll.epf?.employerContribution || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                        -{formatCurrency(selectedPayroll.epf?.employeeContribution || 0)}
                      </td>
                    </tr>
                    {/* SOCSO */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">SOCSO (PERKESO)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-center">
                        {formatCurrency(selectedPayroll.socso?.employeeContribution || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-center">
                        {formatCurrency(selectedPayroll.socso?.employerContribution || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                        -{formatCurrency(selectedPayroll.socso?.employeeContribution || 0)}
                      </td>
                    </tr>
                    {/* EIS */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">EIS (SIP)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-center">
                        {formatCurrency(selectedPayroll.eis?.employeeContribution || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-center">
                        {formatCurrency(selectedPayroll.eis?.employerContribution || 0)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                        -{formatCurrency(selectedPayroll.eis?.employeeContribution || 0)}
                      </td>
                    </tr>
                    {/* Custom Deductions from Compensation Config */}
                    {selectedPayroll.customDeductions?.map((deduction, idx) => (
                      <tr key={`custom-${idx}`} className="hover:bg-gray-50 bg-purple-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <ArrowTrendingDownIcon className="h-4 w-4 text-purple-600" />
                            <span>{deduction.name}</span>
                          </div>
                          {deduction.description && (
                            <p className="text-xs text-gray-500 ml-6">{deduction.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">-</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-center">-</td>
                        <td className="px-4 py-2 text-sm font-medium text-purple-700 text-right">
                          -{formatCurrency(deduction.amount)}
                        </td>
                      </tr>
                    ))}
                    {/* Loans & Advances */}
                    {selectedPayroll.loanDeductions?.map((loan, idx) => (
                      <tr key={`loan-${idx}`} className="hover:bg-gray-50 bg-amber-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <CreditCardIcon className="h-4 w-4 text-amber-600" />
                            <span>
                              {loan.category === 'loan' ? 'Loan' : 'Advance'} ({loan.loanCode})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-6">
                            {loan.description && <span>{loan.description} • </span>}
                            Remaining: {formatCurrency(loan.remainingAfter)}
                          </p>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">-</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-center">-</td>
                        <td className="px-4 py-2 text-sm font-medium text-amber-700 text-right">
                          -{formatCurrency(loan.amount)}
                        </td>
                      </tr>
                    ))}
                    {/* Other Deductions (from worker's payrollInfo) */}
                    {selectedPayroll.otherDeductions?.map((deduction, idx) => (
                      <tr key={`deduction-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{deduction.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 text-center">-</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-center">-</td>
                        <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                          -{formatCurrency(deduction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50 border-t-2 border-red-200">
                      <td colSpan={3} className="px-4 py-2 text-sm font-bold text-red-900">Total Deductions</td>
                      <td className="px-4 py-2 text-sm font-bold text-red-900 text-right">
                        -{formatCurrency(selectedPayroll.totalDeductions)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Net Pay Summary */}
              <div className="border-2 border-green-500 rounded-lg overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Net Pay</p>
                      <p className="text-xs text-green-600">Amount payable to employee</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-700">{formatCurrency(selectedPayroll.netPay)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employer Contribution Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Employer Contributions (Not Deducted from Employee)</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">EPF</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(selectedPayroll.epf?.employerContribution || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">SOCSO</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(selectedPayroll.socso?.employerContribution || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">EIS</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(selectedPayroll.eis?.employerContribution || 0)}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500">Total Employer Cost</p>
                  <p className="text-sm font-bold text-gray-700">
                    {formatCurrency(
                      (selectedPayroll.epf?.employerContribution || 0) +
                      (selectedPayroll.socso?.employerContribution || 0) +
                      (selectedPayroll.eis?.employerContribution || 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-gray-100 border-t border-gray-200 flex justify-between items-center rounded-b-xl">
              <p className="text-xs text-gray-500">
                Generated on {new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 font-medium text-sm transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleGeneratePDF(selectedPayroll)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

