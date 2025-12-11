'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  BanknotesIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function WorkerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      // Fetch worker data
      if (currentUser.worker) {
        const workerData = await feathersClient.service('workers').get(currentUser.worker);
        setWorker(workerData);

        // Try to get company from various sources
        let companyData = null;

        // 1. Check if company is already populated in workerData
        if (workerData.company && typeof workerData.company === 'object' && workerData.company.name) {
          companyData = workerData.company;
        }

        // 2. Try to get company ID and fetch it
        if (!companyData) {
          const companyId = typeof workerData.company === 'string'
            ? workerData.company
            : workerData.company?._id || currentUser.company;

          if (companyId) {
            try {
              companyData = await feathersClient.service('companies').get(companyId);
            } catch (e) {
              console.log('Could not fetch company from worker.company:', e);

              // 3. Last resort: try user's company
              if (currentUser.company && currentUser.company !== companyId) {
                try {
                  companyData = await feathersClient.service('companies').get(currentUser.company);
                } catch (e2) {
                  console.log('Could not fetch company from user.company:', e2);
                }
              }
            }
          }
        }

        if (companyData) {
          setCompany(companyData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/worker')}
          className="flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your personal and employment information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-8">
          <div className="flex items-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-indigo-600 text-3xl font-bold">
              {worker?.firstName?.[0]}{worker?.lastName?.[0]}
            </div>
            <div className="ml-6 text-white">
              <h2 className="text-3xl font-bold">{worker?.firstName} {worker?.lastName}</h2>
              <p className="text-indigo-200 text-lg mt-1">Employee ID: {worker?.employeeId}</p>
              <p className="text-indigo-200 mt-1">{worker?.position || 'Worker'}</p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <UserCircleIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900 font-medium">{user?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <PhoneIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="text-gray-900 font-medium">{worker?.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <IdentificationIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">IC Number</p>
                <p className="text-gray-900 font-medium">{worker?.icNumber || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="text-gray-900 font-medium">
                  {worker?.dateOfBirth ? new Date(worker.dateOfBirth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start md:col-span-2">
              <MapPinIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-gray-900 font-medium">
                  {worker?.address ? (
                    <>
                      {worker.address.street && <>{worker.address.street}<br /></>}
                      {worker.address.city && <>{worker.address.city}, </>}
                      {worker.address.state && <>{worker.address.state} </>}
                      {worker.address.postcode && <>{worker.address.postcode}<br /></>}
                      {worker.address.country && <>{worker.address.country}</>}
                    </>
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BuildingOfficeIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Employment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="text-gray-900 font-medium">{company?.name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <IdentificationIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="text-gray-900 font-medium">{worker?.position || 'Worker'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <CalendarIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Join Date</p>
                <p className="text-gray-900 font-medium">
                  {worker?.joinDate ? new Date(worker.joinDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Payment Type</p>
                <p className="text-gray-900 font-medium capitalize">{worker?.paymentType || 'N/A'}</p>
              </div>
            </div>

            {worker?.paymentType === 'monthly' && (
              <div className="flex items-start">
                <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Monthly Salary</p>
                  <p className="text-gray-900 font-medium">
                    RM {worker?.monthlySalary?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              </div>
            )}

            {worker?.paymentType === 'hourly' && (
              <div className="flex items-start">
                <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Hourly Rate</p>
                  <p className="text-gray-900 font-medium">
                    RM {worker?.hourlyRate?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}/hour
                  </p>
                </div>
              </div>
            )}

            {worker?.paymentType === 'unit' && (
              <div className="flex items-start">
                <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Unit Rate</p>
                  <p className="text-gray-900 font-medium">
                    RM {worker?.unitRate?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}/unit
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bank Information */}
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BanknotesIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Bank Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <BanknotesIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Bank Name</p>
                <p className="text-gray-900 font-medium">{worker?.payrollInfo?.bankName || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start">
              <IdentificationIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Account Number</p>
                <p className="text-gray-900 font-medium">{worker?.payrollInfo?.bankAccountNumber || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start md:col-span-2">
              <IdentificationIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Account Holder Name</p>
                <p className="text-gray-900 font-medium">{worker?.payrollInfo?.bankAccountName || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        {(worker?.emergencyContact?.name || worker?.emergencyContact?.phone) && (
          <div className="p-6 border-t">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <PhoneIcon className="h-6 w-6 mr-2 text-indigo-600" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <UserCircleIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Contact Name</p>
                  <p className="text-gray-900 font-medium">{worker?.emergencyContact?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start">
                <IdentificationIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Relationship</p>
                  <p className="text-gray-900 font-medium">{worker?.emergencyContact?.relationship || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start">
                <PhoneIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900 font-medium">{worker?.emergencyContact?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

