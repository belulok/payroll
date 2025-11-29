import Sidebar from '@/components/Sidebar';
import { CompanyProvider } from '@/contexts/CompanyContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar (optional - for mobile spacing) */}
          <div className="lg:hidden h-16" /> {/* Spacer for mobile hamburger button */}

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </CompanyProvider>
  );
}

