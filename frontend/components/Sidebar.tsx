'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import { useCompany } from '@/contexts/CompanyContext';
import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  Bars3Icon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  CalendarIcon,
  QrCodeIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  BriefcaseIcon,
  BanknotesIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: 'red' | 'blue' | 'green' | 'yellow';
}

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  worker?: string;
}

// Admin, Agent, Subcon-Admin menu items
const adminMenuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Companies', href: '/dashboard/companies', icon: BuildingOfficeIcon },
  { name: 'Clients', href: '/dashboard/clients', icon: UsersIcon },
  { name: 'Organization', href: '/dashboard/organization', icon: BriefcaseIcon },
  { name: 'Workers', href: '/dashboard/workers', icon: UsersIcon },
  { name: 'QR & Attendance', href: '/dashboard/qr-attendance', icon: QrCodeIcon },
  { name: 'Timesheets', href: '/dashboard/timesheets', icon: ClockIcon },
  { name: 'Payroll', href: '/dashboard/payroll', icon: CurrencyDollarIcon },
  { name: 'Financing', href: '/dashboard/loans', icon: BanknotesIcon },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentTextIcon },
  { name: 'Compensation', href: '/dashboard/compensation', icon: AdjustmentsHorizontalIcon },
  { name: 'Leave Requests', href: '/dashboard/leave-requests', icon: CalendarDaysIcon },
  { name: 'Holidays', href: '/dashboard/holidays', icon: CalendarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [workerData, setWorkerData] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { selectedCompany, setSelectedCompany, companies, loading: companiesLoading } = useCompany();

  // Get menu items based on user role and worker payment type
  const getMenuItems = (): MenuItem[] => {
    if (user?.role === 'worker') {
      const baseItems: MenuItem[] = [
        { name: 'Dashboard', href: '/dashboard/worker', icon: HomeIcon },
        { name: 'My Profile', href: '/dashboard/worker/profile', icon: UserCircleIcon },
      ];

      // Add timesheet/production based on payment type
      if (workerData?.paymentType === 'hourly') {
        baseItems.push({ name: 'My Timesheets', href: '/dashboard/worker/timesheets', icon: ClockIcon });
      } else if (workerData?.paymentType === 'unit') {
        baseItems.push({ name: 'Production Log', href: '/dashboard/worker/production', icon: ClipboardDocumentListIcon });
      }
      // Monthly workers don't get timesheet or production log

      baseItems.push(
        { name: 'My Payslips', href: '/dashboard/worker/payslips', icon: DocumentTextIcon },
        { name: 'Leave Requests', href: '/dashboard/worker/leave', icon: CalendarDaysIcon },
        { name: 'QR Check-In', href: '/dashboard/worker/checkin', icon: QrCodeIcon }
      );

      return baseItems;
    }
    return adminMenuItems;
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const auth = await feathersClient.reAuthenticate();
        setUser(auth.user);

        // If user is a worker, fetch worker data to get payment type
        if (auth.user.role === 'worker' && auth.user.worker) {
          const worker = await feathersClient.service('workers').get(auth.user.worker);
          setWorkerData(worker);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await feathersClient.logout();
      // Clear selected company from localStorage on logout
      localStorage.removeItem('selectedCompanyId');
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500 text-white';
      case 'blue':
        return 'bg-blue-500 text-white';
      case 'green':
        return 'bg-green-500 text-white';
      case 'yellow':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Bars3Icon className="h-6 w-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Full Screen with Slide Animation */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="h-full bg-gradient-to-b from-indigo-600 to-indigo-800 text-white overflow-y-auto sidebar-scroll">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-6 border-b border-indigo-500">
            <h2 className="text-2xl font-bold">Payroll System</h2>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-indigo-700 transition-colors"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile Company Selector */}
          {user?.role !== 'worker' && companies.length > 0 && (
            <div className="p-4 border-b border-indigo-500">
              <label className="block text-xs font-semibold text-indigo-200 mb-2">
                COMPANY
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5" />
                    <span className="font-medium truncate">
                      {selectedCompany?.name || 'Select Company'}
                    </span>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showCompanyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                    {companies.map((company) => (
                      <button
                        key={company._id}
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowCompanyDropdown(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                          selectedCompany?._id === company._id
                            ? 'bg-indigo-50 text-indigo-600 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <BuildingOfficeIcon className="h-5 w-5 mr-3" />
                        <span className="truncate">{company.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Menu Items */}
          <nav className="p-4 space-y-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-lg'
                      : 'hover:bg-indigo-700 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(
                        item.badgeColor
                      )}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Footer - User Menu */}
          <div className="p-4 border-t border-indigo-500">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-400 flex items-center justify-center font-bold uppercase shrink-0">
                {user?.firstName?.[0] || user?.email?.[0] || 'U'}
              </div>
              {user && (
                <div className="overflow-hidden flex-1">
                  <p className="font-medium truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-indigo-200 truncate">{user.email}</p>
                </div>
              )}
            </div>

            {/* Mobile Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsMobileOpen(false);
                  router.push('/dashboard/settings');
                }}
                className="w-full flex items-center px-4 py-2 text-sm bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                <UserCircleIcon className="h-5 w-5 mr-3" />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex flex-col h-screen bg-gradient-to-b from-indigo-600 to-indigo-800 text-white transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-500">
          {!isCollapsed && <h2 className="text-xl font-bold">Payroll System</h2>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-indigo-700 transition-colors ml-auto"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Desktop Company Selector */}
        {user?.role !== 'worker' && companies.length > 0 && (
          <div className={`p-4 border-b border-indigo-500 ${isCollapsed ? 'px-2' : ''}`}>
            {!isCollapsed && (
              <label className="block text-xs font-semibold text-indigo-200 mb-2">
                COMPANY
              </label>
            )}
            <div className="relative">
              <button
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } px-3 py-2.5 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-colors group`}
                title={isCollapsed ? selectedCompany?.name : ''}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'} truncate`}>
                  <BuildingOfficeIcon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium truncate">
                      {selectedCompany?.name || 'Select'}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {selectedCompany?.name || 'Select Company'}
                  </div>
                )}
              </button>

              {/* Dropdown */}
              {showCompanyDropdown && (
                <div className={`absolute ${isCollapsed ? 'left-full ml-2' : 'top-full left-0 right-0 mt-2'} bg-white rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto ${isCollapsed ? 'w-64' : 'w-full'}`}>
                  {companies.map((company) => (
                    <button
                      key={company._id}
                      onClick={() => {
                        setSelectedCompany(company);
                        setShowCompanyDropdown(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                        selectedCompany?._id === company._id
                          ? 'bg-indigo-50 text-indigo-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <BuildingOfficeIcon className="h-5 w-5 mr-3 shrink-0" />
                      <span className="truncate">{company.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto sidebar-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } px-4 py-3 rounded-lg transition-all group relative ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'hover:bg-indigo-700 text-white'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Icon className="h-6 w-6" />
                    {/* Badge on Icon (when collapsed) */}
                    {isCollapsed && item.badge && (
                      <span
                        className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-bold rounded-full ${getBadgeColor(
                          item.badgeColor
                        )} min-w-[20px] text-center`}
                      >
                        {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </div>
                {/* Badge on Right (when expanded) */}
                {!isCollapsed && item.badge && (
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(
                      item.badgeColor
                    )}`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 text-xs text-gray-300">({item.badge})</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Footer */}
        <div
          className="p-4 border-t border-indigo-500 relative"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          {/* Dropdown Menu - positioned above, inside the hover container */}
          {showUserMenu && (
            <div className={`absolute ${isCollapsed ? 'left-full bottom-0 ml-2' : 'bottom-full left-4 right-4 pb-2'} z-50`}>
              <div className={`bg-white text-gray-900 rounded-lg shadow-xl overflow-hidden ${isCollapsed ? 'w-48' : 'w-full'}`}>
                {/* User Info Header (only when collapsed) */}
                {isCollapsed && user && (
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <p className="font-medium text-sm">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                )}

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    <UserCircleIcon className="h-4 w-4 mr-3 text-gray-500" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Profile Trigger */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'space-x-3'
            } text-sm relative group cursor-pointer hover:bg-indigo-700 rounded-lg p-2 transition-colors`}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center font-bold uppercase shrink-0">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </div>
            {!isCollapsed && user && (
              <div className="overflow-hidden flex-1">
                <p className="font-medium truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email.split('@')[0]}
                </p>
                <p className="text-xs text-indigo-200 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


