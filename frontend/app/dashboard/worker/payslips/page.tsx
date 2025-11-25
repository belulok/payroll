'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  CalendarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

export default function WorkerPayslipsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      // Fetch payroll records for the worker
      const response = await feathersClient.service('payroll-records').find({
        query: {
          worker: currentUser.worker,
          $limit: 100,
          $sort: {
            payPeriodEnd: -1
          }
        }
      });

      setPayslips(response.data || response);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (payslipId: string) => {
    try {
      // Open PDF in new tab
      window.open(`/api/payroll/${payslipId}/pdf`, '_blank');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Failed to download payslip');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/worker')}
          className="flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <DocumentTextIcon className="h-8 w-8 text-green-600" />
          My Payslips
        </h1>
        <p className="text-gray-600 mt-1">View and download your payslips</p>
      </div>

      {/* Payslips List */}
      {payslips.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Payslips Yet</h3>
          <p className="text-gray-600">Your payslips will appear here once they are generated</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payslips.map((payslip) => (
            <div key={payslip._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">
                      {new Date(payslip.payPeriodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-sm text-gray-600">Payslip</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Period:</span>
                  <span className="ml-auto font-medium text-gray-900">
                    {new Date(payslip.payPeriodStart).toLocaleDateString()} - {new Date(payslip.payPeriodEnd).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <BanknotesIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Net Pay:</span>
                  <span className="ml-auto font-bold text-green-600 text-lg">
                    RM {payslip.netPay?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => downloadPayslip(payslip._id)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

